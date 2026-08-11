using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

public record ToolUsageSummary(
    string ToolId,
    int UsedCount,
    int? Limit  // null = unlimited
);

public record MonthlyUsageSummary(
    string MonthYear,   // "2026-08"
    int TotalUsed,
    int TotalLimit      // 0 = unlimited (admin / enterprise)
);

public class ToolUsageService(AppDbContext db)
{
    private static readonly string[] AllToolIds =
    [
        "gorunurluk-skoru",
        "musteri-persona",
        "icerik-takvimi",
        "whatsapp-satis",
        "reklam-butce",
        "musteri-geri-donus",
        "rakip-analiz",
        "chatbot-senaryo",
        "ai-gorunurluk",
        "viral-video",
        "trend-video"
    ];

    public async Task<List<ToolUsageSummary>> GetUsageSummaryAsync(Guid userId)
    {
        var plan = await GetUserPlanAsync(userId);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Count subscription-based uses this month
        var usageCounts = await db.ToolUsageLogs
            .Where(l => l.UserId == userId && l.UsedAt >= monthStart)
            .GroupBy(l => l.ToolId)
            .Select(g => new { ToolId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ToolId, x => x.Count);

        return AllToolIds.Select(toolId =>
        {
            usageCounts.TryGetValue(toolId, out var used);
            return new ToolUsageSummary(toolId, used, plan?.UsagePerToolPerMonth);
        }).ToList();
    }

    // ── Son N aylık kullanım geçmişi ──────────────────────────────────────────
    public async Task<List<MonthlyUsageSummary>> GetUsageHistoryAsync(Guid userId, int months = 6)
    {
        months = Math.Clamp(months, 1, 12);

        var now       = DateTime.UtcNow;
        var startDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                            .AddMonths(-(months - 1));

        // Tüm ayları tek sorguda al
        var usageByMonth = await db.ToolUsageLogs
            .Where(l => l.UserId == userId && l.UsedAt >= startDate)
            .GroupBy(l => new { l.UsedAt.Year, l.UsedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToDictionaryAsync(x => (x.Year, x.Month), x => x.Count);

        var plan         = await GetUserPlanAsync(userId);
        var limitPerTool = plan?.UsagePerToolPerMonth;         // null = sınırsız
        var totalLimit   = limitPerTool.HasValue
                            ? limitPerTool.Value * AllToolIds.Length
                            : 0;  // 0 = sınırsız (frontend'de özel gösterilir)

        var result = new List<MonthlyUsageSummary>(months);
        for (var i = months - 1; i >= 0; i--)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
                                 .AddMonths(-i);
            usageByMonth.TryGetValue((monthStart.Year, monthStart.Month), out var used);
            result.Add(new MonthlyUsageSummary(
                monthStart.ToString("yyyy-MM"),
                used,
                totalLimit));
        }

        return result;
    }

    public async Task<bool> CanUseToolAsync(Guid userId, string toolId)
    {
        // E-posta doğrulanmamışsa araç kullanılamaz
        var user = await db.Users.FindAsync(userId);
        if (user is not null && !user.EmailVerified)
            throw new InvalidOperationException("EMAIL_NOT_VERIFIED");

        var plan = await GetUserPlanAsync(userId);
        if (plan?.UsagePerToolPerMonth is null) return true; // unlimited

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var used = await db.ToolUsageLogs
            .CountAsync(l => l.UserId == userId && l.ToolId == toolId && l.UsedAt >= monthStart);

        // Also check per-tool purchases
        var purchasedUses = await db.ToolPurchases
            .Where(p => p.UserId == userId && p.ToolId == toolId
                     && p.UsesRemaining > 0
                     && (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
            .SumAsync(p => (int?)p.UsesRemaining) ?? 0;

        return used < plan.UsagePerToolPerMonth || purchasedUses > 0;
    }

    public async Task RecordUsageAsync(Guid userId, string toolId, bool success = true)
    {
        db.ToolUsageLogs.Add(new ToolUsageLog
        {
            UserId = userId,
            ToolId = toolId,
            Success = success
        });
        await db.SaveChangesAsync();
    }

    private async Task<Plan?> GetUserPlanAsync(Guid userId)
    {
        var subscription = await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);

        return subscription?.Plan;
    }
}
