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

public record ToolPeriodUsage(
    string ToolId,
    int    UsedCount,
    int?   Limit       // null = sınırsız
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

    /// <summary>
    /// Araç bazlı özel aylık limit kısıtları.
    /// Plan limitinden küçükse bu değer uygulanır (null plan = admin = bu kısıt da uygulanmaz).
    /// </summary>
    private static readonly Dictionary<string, int> ToolSpecificLimits = new()
    {
        { "trend-video", 1 },   // Apify maliyeti (~$0.40/çalıştırma) → admin dışı: ayda maks 1
    };

    /// <summary>
    /// Aktif aboneliği olmayan (veya süresi dolmuş) kullanıcıların düştüğü limit.
    /// Plans tablosundaki "Ücretsiz" planla aynı olmalıdır.
    /// </summary>
    private const int    FreePlanLimit = 3;
    private const string FreePlanName  = "Ücretsiz";

    public async Task<List<ToolUsageSummary>> GetUsageSummaryAsync(Guid userId)
    {
        var planLimit  = await GetPlanLimitAsync(userId);
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
            {
                var effectivePurchaseLimit = ApplyToolSpecificLimit(toolId, purchaseLimit);
                return new ToolUsageSummary(toolId, used, effectivePurchaseLimit);
            }

            // Yoksa plan limiti — araç bazlı kısıtı uygula
            var limit = ApplyToolSpecificLimit(toolId, planLimit);
            return new ToolUsageSummary(toolId, used, limit);
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

    /// <summary>
    /// Belirli bir dönem içinde araç bazlı kullanım dökümanını döndürür.
    /// Dönem: [periodStart, periodEnd) — ISO date string "yyyy-MM-dd"
    /// </summary>
    public async Task<List<ToolPeriodUsage>> GetPeriodUsageAsync(
        Guid userId, string periodStart, string periodEnd)
    {
        var start = DateTime.Parse(periodStart, null, System.Globalization.DateTimeStyles.AssumeUniversal)
                            .ToUniversalTime();
        var end   = DateTime.Parse(periodEnd, null, System.Globalization.DateTimeStyles.AssumeUniversal)
                            .ToUniversalTime();

        // Dönem içindeki her araç kullanım sayısı
        var logCounts = await db.ToolUsageLogs
            .Where(l => l.UserId == userId && l.UsedAt >= start && l.UsedAt < end)
            .GroupBy(l => l.ToolId)
            .Select(g => new { ToolId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ToolId, x => x.Count);

        // Dönem içinde aktif araç satın alımı limitleri
        var toolPurchaseMap = await db.ToolPurchases
            .Where(p => p.UserId == userId
                     && p.PurchasedAt < end
                     && (p.ExpiresAt == null || p.ExpiresAt > start))
            .GroupBy(p => p.ToolId)
            .Select(g => new { ToolId = g.Key, MonthlyLimit = g.Max(p => p.MonthlyLimit) })
            .ToDictionaryAsync(x => x.ToolId, x => x.MonthlyLimit);

        // Plan limitini kullanıcı aboneliğinden al (dönem anındaki snapshot yerine mevcut plan kullanılır)
        var planLimit = await GetPlanLimitAsync(userId);

        // Tüm araçlar — kullananları üstte sırala
        return AllToolIds
            .Select(toolId =>
            {
                logCounts.TryGetValue(toolId, out var used);
                int? rawLimit = toolPurchaseMap.TryGetValue(toolId, out var purchaseLimit)
                    ? purchaseLimit
                    : planLimit;
                var limit = ApplyToolSpecificLimit(toolId, rawLimit);
                return new ToolPeriodUsage(toolId, used, limit);
            })
            .OrderByDescending(x => x.UsedCount)
            .ThenBy(x => x.ToolId)
            .ToList();
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
            if (activePurchase.MonthlyLimit is null) return true;           // sınırsız satın alım
            var purchaseEffective = ApplyToolSpecificLimit(toolId, activePurchase.MonthlyLimit);
            return used < purchaseEffective;                                // aylık araç limiti (kısıtlı)
        }

        // Araç satın alımı yoksa — plan limitine bak.
        // planLimit null SADECE gerçek sınırsızlıkta olur (yönetici veya Kurumsal plan);
        // aboneliği olmayan/süresi dolmuş kullanıcı ücretsiz plan limitine düşer.
        var planLimit = await GetPlanLimitAsync(userId);
        if (planLimit is null) return true;                                 // yönetici / Kurumsal

        var effectiveLimit = ApplyToolSpecificLimit(toolId, planLimit);
        return used < effectiveLimit;
    }

    public async Task RecordUsageAsync(Guid userId, string toolId, bool success = true)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Kayıt ANINDA mevcut dönemdeki araç kullanım sayısını al (bu çalıştırma dahil değil)
        var usageCountBefore = await db.ToolUsageLogs
            .CountAsync(l => l.UserId == userId && l.ToolId == toolId && l.UsedAt >= monthStart);

        var (planName, planLimit) = await GetPlanSnapshotAsync(userId);

        db.ToolUsageLogs.Add(new ToolUsageLog
        {
            UserId           = userId,
            ToolId           = toolId,
            Success          = success,
            UsageCountBefore = usageCountBefore,
            // Araç bazlı kısıt dahil gerçek limit (ör. trend-video → 1)
            LimitAtTime      = ApplyToolSpecificLimit(toolId, planLimit),
            PlanNameAtTime   = planName,
        });
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Kullanıcının araç başına aylık plan limiti.
    /// Dönüş <c>null</c> ise SINIRSIZ demektir — bu yalnızca iki durumda olur:
    /// yönetici hesabı (IsAdmin) veya UsagePerToolPerMonth'u null olan Kurumsal plan.
    ///
    /// ÖNEMLİ: Eskiden bu iş <c>GetUserPlanAsync</c> ile yapılıyor ve aktif abonelik
    /// bulunamadığında <c>null</c> dönülüyordu. Çağıran taraflar null'ı "sınırsız"
    /// saydığı için süresi dolan abonelikler ücretsiz plana düşmek yerine SINIRSIZ
    /// hakka kavuşuyordu (24 Ağu 2026'da canlıda tespit edildi: Premium aboneliği
    /// 1 Ağustos'ta biten kullanıcı sınırsız araç çalıştırabiliyordu). Artık
    /// "plan bulunamadı" ile "sınırsız" aynı değerle temsil edilmiyor.
    /// </summary>
    private async Task<int?> GetPlanLimitAsync(Guid userId)
        => (await GetPlanSnapshotAsync(userId)).Limit;

    /// <summary>
    /// Kullanıcının görüntülenecek plan adı ("Admin", "Ücretsiz", "Premium"...).
    /// Frontend bunu rozet olarak gösterir; limitin null olmasına bakarak
    /// tahmin yürütmemelidir.
    /// </summary>
    public async Task<string> GetPlanNameAsync(Guid userId)
        => (await GetPlanSnapshotAsync(userId)).Name;

    /// <summary>
    /// Kullanıcının geçerli plan adı ve limiti. Kullanım kaydında (ToolUsageLog)
    /// o anki planı saklamak için de kullanılır.
    /// </summary>
    private async Task<(string Name, int? Limit)> GetPlanSnapshotAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user?.IsAdmin == true) return ("Admin", null);   // yönetici → sınırsız

        var subscription = await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId
                                   && s.Status == SubscriptionStatus.Active
                                   && (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow));

        // Kurumsal planda UsagePerToolPerMonth null'dır → sınırsız
        if (subscription?.Plan is not null)
            return (subscription.Plan.Name, subscription.Plan.UsagePerToolPerMonth);

        // Abonelik yok / iptal / süresi dolmuş → ücretsiz plan limiti
        return (FreePlanName, FreePlanLimit);
    }

    /// <summary>
    /// Araç bazlı özel kısıtı uygular: null limit (admin/sınırsız) değişmez;
    /// sonlu limitlerde ToolSpecificLimits değerini alt sınır olarak uygular.
    /// </summary>
    private static int? ApplyToolSpecificLimit(string toolId, int? planLimit)
    {
        if (planLimit is null) return null;  // admin/enterprise — kısıt yok
        if (!ToolSpecificLimits.TryGetValue(toolId, out var toolLimit)) return planLimit;
        return Math.Min(planLimit.Value, toolLimit);
    }
}
