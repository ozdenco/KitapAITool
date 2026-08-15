using System.Text.Json;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

/// <summary>
/// Her gün sabah 03:00 UTC'de çalışarak otomatik yenileme seçili
/// abonelik ve araç satın alımlarını yeniler.
///
/// Akış:
///   1. Gün içinde sona erecek AutoRenew=true kayıtlarını bul
///   2. Kullanıcının kayıtlı kartı varsa → PayTR recurring API ile çekim yap
///   3. Çekim başarılıysa → süresi uzat + başarı maili gönder
///   4. Çekim başarısızsa (veya kart yoksa) → başarısızlık maili gönder
///
/// Araç yenilemede kullanıcı bazında gruplama yapılır:
///   Birden fazla aracı aynı gün sona eren kullanıcı → tek PaymentOrder.
/// </summary>
public class RecurringRenewalService(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringRenewalService> logger) : BackgroundService
{
    /// <summary>Admin panelinden veya test amacıyla hemen çalıştırır.</summary>
    public Task RunNowAsync(CancellationToken ct) => ProcessRenewalsAsync(ct);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("[AutoRenew] Servis başladı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNext3AmUtc();
            logger.LogInformation("[AutoRenew] Bir sonraki çalışma: {Minutes} dakika sonra.", (int)delay.TotalMinutes);

            try { await Task.Delay(delay, stoppingToken); }
            catch (OperationCanceledException) { break; }

            if (!stoppingToken.IsCancellationRequested)
            {
                await ProcessRenewalsAsync(stoppingToken);
            }
        }

        logger.LogInformation("[AutoRenew] Servis durdu.");
    }

    private static TimeSpan TimeUntilNext3AmUtc()
    {
        var now    = DateTime.UtcNow;
        var next   = new DateTime(now.Year, now.Month, now.Day, 3, 0, 0, DateTimeKind.Utc);
        if (now >= next) next = next.AddDays(1);
        return next - now;
    }

    // ─────────────────────────────────────────────────────────────────────────

    private async Task ProcessRenewalsAsync(CancellationToken ct)
    {
        logger.LogInformation("[AutoRenew] Yenileme kontrolü başladı: {Time:u}", DateTime.UtcNow);

        using var scope  = scopeFactory.CreateScope();
        var db           = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var paytr        = scope.ServiceProvider.GetRequiredService<PayTrService>();
        var email        = scope.ServiceProvider.GetRequiredService<EmailService>();

        var now     = DateTime.UtcNow;
        var dayEnd  = now.Date.AddDays(1); // Bu gece 00:00 UTC

        // ── 1. Abonelik yenilemeleri ──────────────────────────────────────────
        var subs = await db.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.User)
            .Where(s => s.AutoRenew
                     && s.Status == SubscriptionStatus.Active
                     && s.ExpiresAt != null
                     && s.ExpiresAt >= now
                     && s.ExpiresAt < dayEnd)
            .ToListAsync(ct);

        foreach (var sub in subs)
        {
            await RenewSubscriptionAsync(sub, db, paytr, email, ct);
        }

        // ── 2. Araç satın alım yenilemeleri — kullanıcı bazında grupla ────────
        var tools = await db.ToolPurchases
            .Include(t => t.User)
            .Where(t => t.AutoRenew
                     && t.ExpiresAt != null
                     && t.ExpiresAt >= now
                     && t.ExpiresAt < dayEnd)
            .ToListAsync(ct);

        // Aynı kullanıcının birden fazla aracı varsa tek seferde işle
        var toolsByUser = tools.GroupBy(t => t.UserId).ToList();
        foreach (var userGroup in toolsByUser)
        {
            await RenewUserToolsAsync(userGroup.ToList(), db, paytr, email, ct);
        }

        try { await db.SaveChangesAsync(ct); }
        catch (Exception ex) { logger.LogError(ex, "[AutoRenew] SaveChanges başarısız."); }

        logger.LogInformation("[AutoRenew] Tamamlandı. Abonelik={SubCount}, Araç Grubu={ToolGroupCount}",
            subs.Count, toolsByUser.Count);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private async Task RenewSubscriptionAsync(
        Subscription sub, AppDbContext db, PayTrService paytr, EmailService email, CancellationToken ct)
    {
        var user = sub.User;
        var plan = sub.Plan!;

        logger.LogInformation("[AutoRenew] Abonelik yenileme: userId={UserId} plan={Plan}",
            user.Id, plan.Name);

        var orderId = $"AR-SUB-{user.Id.ToString("N")[..8]}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var success = false;
        var hasCard = !string.IsNullOrEmpty(user.PayTrCardToken);

        if (hasCard && plan.PriceMonthly > 0)
        {
            success = await paytr.RecurringChargeAsync(
                user.PayTrCardToken, orderId, plan.PriceMonthly,
                $"{plan.Name} Paketi — 1 Aylık", user, ct);
        }
        else if (!hasCard)
        {
            // Kart kaydı olmayan kullanıcılar → ücretsiz yenileme (admin tarafından oluşturulan)
            success = true;
            logger.LogInformation("[AutoRenew] Kart token yok, ücretsiz yenileme: {Email} - {Plan}",
                user.Email, plan.Name);
        }

        if (success)
        {
            // Aboneliği 1 ay uzat
            sub.ExpiresAt = sub.ExpiresAt!.Value.AddMonths(1);

            // Ödeme kaydı
            db.PaymentOrders.Add(new PaymentOrder
            {
                UserId          = user.Id,
                PlanId          = plan.Id,
                ConversationId  = orderId,
                IyzicoToken     = "AUTO-RENEW",
                Status          = PaymentOrderStatus.Completed,
                Amount          = plan.PriceMonthly,
                IyzicoPaymentId = orderId,
                CompletedAt     = DateTime.UtcNow,
            });

            var features = BuildPlanFeatures(plan);
            try
            {
                await email.SendRenewalSuccessEmailAsync(
                    user.Email, user.Name,
                    plan.Name, plan.PriceMonthly, sub.ExpiresAt.Value,
                    features);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[AutoRenew] Başarı maili gönderilemedi: {Email}", user.Email);
            }

            logger.LogInformation("[AutoRenew] ✅ Abonelik yenilendi: {Email}", user.Email);
        }
        else
        {
            try
            {
                await email.SendRenewalFailedEmailAsync(
                    user.Email, user.Name,
                    plan.Name, sub.ExpiresAt!.Value);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[AutoRenew] Hata maili gönderilemedi: {Email}", user.Email);
            }

            logger.LogWarning("[AutoRenew] ❌ Abonelik yenilenemedi: {Email}", user.Email);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Bir kullanıcının aynı gün sona eren tüm araçlarını gruplayarak yeniler.
    /// Birden fazla araç varsa → TEK PaymentOrder (birleşik ödeme kaydı).
    /// </summary>
    private async Task RenewUserToolsAsync(
        List<ToolPurchase> userTools, AppDbContext db, PayTrService paytr,
        EmailService email, CancellationToken ct)
    {
        var user    = userTools[0].User;
        var hasCard = !string.IsNullOrEmpty(user.PayTrCardToken);

        logger.LogInformation("[AutoRenew] Araç yenileme: userId={UserId} araç sayısı={Count}",
            user.Id, userTools.Count);

        // ── Gerçek araç fiyatlarını ToolPrices tablosundan al ─────────────────
        var toolIdList    = userTools.Select(t => t.ToolId).ToArray();
        var toolPriceDict = await db.ToolPrices
            .Where(tp => toolIdList.Contains(tp.ToolId))
            .ToDictionaryAsync(tp => tp.ToolId, tp => tp.PriceMonthly, ct);

        // Araç başına tutar: base fiyat × (kullanım limiti / 10)
        // Örnek: icerik-takvimi ₺29 × (25/10) = ₺58
        var toolAmounts = userTools.ToDictionary(
            t => t.ToolId,
            t =>
            {
                var basePrice  = toolPriceDict.TryGetValue(t.ToolId, out var p) ? p : t.AmountPaid;
                var multiplier = t.MonthlyLimit.HasValue ? t.MonthlyLimit.Value / 10m : 1m;
                return Math.Round(basePrice * multiplier, 2);
            });

        var totalAmount = toolAmounts.Values.Sum();
        var orderId     = $"AR-TOOL-{user.Id.ToString("N")[..8]}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var success     = false;

        if (hasCard && totalAmount > 0)
        {
            var desc = userTools.Count == 1
                ? $"{ToolIdToName(userTools[0].ToolId)} araç aboneliği"
                : $"Araç aboneliği yenileme ({userTools.Count} araç)";

            success = await paytr.RecurringChargeAsync(
                user.PayTrCardToken, orderId, totalAmount, desc, user, ct);
        }
        else if (!hasCard)
        {
            // Kart kaydı olmayan kullanıcı (admin tarafından oluşturulan) → ücretsiz yenileme
            success = true;
            logger.LogInformation("[AutoRenew] Kart token yok, ücretsiz yenileme: {Email} - {Count} araç",
                user.Email, userTools.Count);
        }

        if (success)
        {
            // ── Her araç için yeni ToolPurchase (doğru AmountPaid ile) ──────────
            foreach (var tool in userTools)
            {
                var renewAmount = toolAmounts.TryGetValue(tool.ToolId, out var a) ? a : tool.AmountPaid;
                db.ToolPurchases.Add(new ToolPurchase
                {
                    UserId          = tool.UserId,
                    ToolId          = tool.ToolId,
                    MonthlyLimit    = tool.MonthlyLimit,
                    UsesGranted     = tool.MonthlyLimit ?? tool.UsesGranted,
                    UsesRemaining   = tool.MonthlyLimit ?? tool.UsesGranted,
                    AmountPaid      = renewAmount,
                    IyzicoPaymentId = orderId,
                    PurchasedAt     = DateTime.UtcNow,
                    ExpiresAt       = DateTime.UtcNow.AddMonths(1),
                    AutoRenew       = true,
                });
            }

            // ── Kullanıcı başına TEK birleşik ödeme kaydı ─────────────────────
            db.PaymentOrders.Add(new PaymentOrder
            {
                UserId          = user.Id,
                ToolId          = userTools.Count == 1 ? userTools[0].ToolId : null,
                ToolIds         = userTools.Count > 1
                                    ? JsonSerializer.Serialize(toolIdList)
                                    : null,
                ConversationId  = orderId,
                IyzicoToken     = "AUTO-RENEW",
                Status          = PaymentOrderStatus.Completed,
                Amount          = totalAmount,
                IyzicoPaymentId = orderId,
                CompletedAt     = DateTime.UtcNow,
                UsesPerTool     = userTools[0].MonthlyLimit,
            });

            // ── Birleşik başarı e-postası ──────────────────────────────────────
            var features = userTools.Select(t =>
            {
                var name     = ToolIdToName(t.ToolId);
                var limitLbl = t.MonthlyLimit.HasValue ? $"{t.MonthlyLimit} kullanım/ay" : "Sınırsız";
                var amount   = toolAmounts.TryGetValue(t.ToolId, out var a) ? $"₺{a:F0}" : "";
                return $"{name} ({limitLbl}) — {amount}";
            }).ToArray();

            var serviceTitle = userTools.Count == 1
                ? ToolIdToName(userTools[0].ToolId)
                : $"{userTools.Count} Araç Aboneliği";

            try
            {
                await email.SendRenewalSuccessEmailAsync(
                    user.Email, user.Name,
                    serviceTitle, totalAmount,
                    DateTime.UtcNow.AddMonths(1),
                    features);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[AutoRenew] Araç başarı maili gönderilemedi: {Email}", user.Email);
            }

            logger.LogInformation("[AutoRenew] ✅ {Count} araç yenilendi: {Email}",
                userTools.Count, user.Email);
        }
        else
        {
            foreach (var tool in userTools)
            {
                try
                {
                    await email.SendRenewalFailedEmailAsync(
                        user.Email, user.Name,
                        ToolIdToName(tool.ToolId), tool.ExpiresAt!.Value);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "[AutoRenew] Araç hata maili gönderilemedi: {Email}", user.Email);
                }
            }
            logger.LogWarning("[AutoRenew] ❌ Araç yenilenemedi: {Email}", user.Email);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private static string[] BuildPlanFeatures(Plan plan) =>
    [
        $"Tüm araçlara erişim",
        plan.UsagePerToolPerMonth.HasValue
            ? $"Araç başına {plan.UsagePerToolPerMonth} kullanım/ay"
            : "Sınırsız kullanım",
        $"Aylık ücret: ₺{plan.PriceMonthly:F2}",
    ];

    private static string ToolIdToName(string toolId) => toolId switch
    {
        "gorunurluk-skoru"    => "İşletme Görünürlük Skoru",
        "musteri-persona"     => "Müşteri Persona Oluşturucu",
        "icerik-takvimi"      => "30 Günlük İçerik Takvimi",
        "whatsapp-satis"      => "WhatsApp Satış Script Üretici",
        "reklam-butce"        => "Reklam Bütçe Dağıtıcı",
        "musteri-geri-donus"  => "Müşteri Geri Dönüş Senaryosu",
        "rakip-analiz"        => "Rakip Analiz Panosu",
        "chatbot-senaryo"     => "Chatbot Senaryo Hazırlayıcı",
        "ai-gorunurluk"       => "AI Görünürlük Takipçisi",
        "viral-video"         => "Viral Video Uyarlayıcı",
        "trend-video"         => "Trend Video Bulucu",
        _                     => toolId,
    };
}
