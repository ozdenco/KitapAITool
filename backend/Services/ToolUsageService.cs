using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

public record ToolUsageSummary(
    string ToolId,
    int UsedCount,
    int? Limit  // null = unlimited
);

public class ToolUsageService(AppDbContext db)
{
    private static readonly string[] AllToolIds =
    [
        "gorunurluk-skoru",
        "musteri-persona",
        "icerik-takvimi",
        "whatsapp-script",
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

    public async Task<bool> CanUseToolAsync(Guid userId, string toolId)
    {
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
