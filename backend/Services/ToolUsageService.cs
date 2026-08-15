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
    string PeriodStart, // "2026-07-14" — fatura dönemi başlangıcı
    string PeriodEnd,   // "2026-08-14" — fatura dönemi bitişi (dahil değil)
    int TotalUsed
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

    // ── Son N aylık kullanım geçmişi (fatura dönemi bazlı) ───────────────────
    /// <param name="userId">Kullanıcı ID'si</param>
    /// <param name="months">Gösterilecek dönem sayısı (1–12)</param>
    /// <param name="startDay">Fatura günü — satın alım tarihinin günü, örn. 14 (1–28)</param>
    public async Task<List<MonthlyUsageSummary>> GetUsageHistoryAsync(
        Guid userId, int months = 6, int startDay = 1)
    {
        months   = Math.Clamp(months, 1, 12);
        startDay = Math.Clamp(startDay, 1, 28);

        var now = DateTime.UtcNow;

        // En son geçmiş fatura dönemi başlangıcını bul
        // Örn: startDay=14, bugün 15 Ağu → en son dönem 14 Ağu
        //      startDay=14, bugün 10 Ağu → en son dönem 14 Tem
        var latestPeriodStart = new DateTime(now.Year, now.Month, startDay, 0, 0, 0, DateTimeKind.Utc);
        if (latestPeriodStart > now)
            latestPeriodStart = latestPeriodStart.AddMonths(-1);

        // N dönemi geriye giderek listele
        var periods = Enumerable.Range(0, months)
            .Select(i => (
                Start: latestPeriodStart.AddMonths(-(months - 1 - i)),
                End:   latestPeriodStart.AddMonths(-(months - 2 - i))
            ))
            .ToList();

        var rangeStart = periods[0].Start;
        var rangeEnd   = periods[^1].End;

        // Tüm logları bir sorguyla çek, bellekte dönemlere böl
        var logDates = await db.ToolUsageLogs
            .Where(l => l.UserId == userId && l.UsedAt >= rangeStart && l.UsedAt < rangeEnd)
            .Select(l => l.UsedAt)
            .ToListAsync();

        // Dönem → sayaç
        var counts = new int[months];
        foreach (var logDate in logDates)
        {
            for (var i = 0; i < periods.Count; i++)
            {
                if (logDate >= periods[i].Start && logDate < periods[i].End)
                {
                    counts[i]++;
                    break;
                }
            }
        }

        return periods.Select((p, i) => new MonthlyUsageSummary(
            p.Start.ToString("yyyy-MM-dd"),
            p.End.ToString("yyyy-MM-dd"),
            counts[i]
        )).ToList();
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
