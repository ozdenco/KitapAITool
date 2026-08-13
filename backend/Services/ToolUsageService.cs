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

        // Bu ayki kullanım sayaçları
        var usageCounts = await db.ToolUsageLogs
            .Where(l => l.UserId == userId && l.UsedAt >= monthStart)
            .GroupBy(l => l.ToolId)
            .Select(g => new { ToolId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ToolId, x => x.Count);

        // Aktif araç satın alımları — tool bazında aylık limit
        var toolPurchaseMap = await db.ToolPurchases
            .Where(p => p.UserId == userId
                     && (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
            .GroupBy(p => p.ToolId)
            .Select(g => new { ToolId = g.Key, MonthlyLimit = (int?)g.Max(p => p.MonthlyLimit) })
            .ToDictionaryAsync(x => x.ToolId, x => x.MonthlyLimit);

        return AllToolIds.Select(toolId =>
        {
            usageCounts.TryGetValue(toolId, out var used);

            // Araç satın alımı varsa onun limiti geçerli (null = sınırsız)
            if (toolPurchaseMap.TryGetValue(toolId, out var purchaseLimit))
                return new ToolUsageSummary(toolId, used, purchaseLimit);

            // Yoksa plan limiti
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

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var used = await db.ToolUsageLogs
            .CountAsync(l => l.UserId == userId && l.ToolId == toolId && l.UsedAt >= monthStart);

        // Aktif araç satın alımı var mı? → kendi monthly limitini uygula
        var activePurchase = await db.ToolPurchases
            .Where(p => p.UserId == userId && p.ToolId == toolId
                     && (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow))
            .OrderByDescending(p => p.MonthlyLimit)   // en yüksek limiti seç (null = sınırsız)
            .FirstOrDefaultAsync();

        if (activePurchase is not null)
        {
            if (activePurchase.MonthlyLimit is null) return true;           // sınırsız
            return used < activePurchase.MonthlyLimit;                      // aylık araç limiti
        }

        // Araç satın alımı yoksa — plan limitine bak
        var plan = await GetUserPlanAsync(userId);
        if (plan?.UsagePerToolPerMonth is null) return true;                // admin/enterprise

        return used < plan.UsagePerToolPerMonth;
    }

    public async Task RecordUsageAsync(Guid userId, string toolId, bool success = true)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Kayıt ANINDA mevcut dönemdeki araç kullanım sayısını al (bu çalıştırma dahil değil)
        var usageCountBefore = await db.ToolUsageLogs
            .CountAsync(l => l.UserId == userId && l.ToolId == toolId && l.UsedAt >= monthStart);

        var plan = await GetUserPlanAsync(userId);

        db.ToolUsageLogs.Add(new ToolUsageLog
        {
            UserId           = userId,
            ToolId           = toolId,
            Success          = success,
            UsageCountBefore = usageCountBefore,
            LimitAtTime      = plan?.UsagePerToolPerMonth,
            PlanNameAtTime   = plan?.Name ?? "Ücretsiz",
        });
        await db.SaveChangesAsync();
    }

    private async Task<Plan?> GetUserPlanAsync(Guid userId)
    {
        // Süresi dolmuş abonelik ücretsiz plan gibi davranır — ExpiresAt kontrolü zorunlu
        var subscription = await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId
                                   && s.Status == SubscriptionStatus.Active
                                   && (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow));

        return subscription?.Plan;
    }
}
