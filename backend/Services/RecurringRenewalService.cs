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
/// </summary>
public class RecurringRenewalService(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringRenewalService> logger) : BackgroundService
{
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

        // ── 2. Araç satın alım yenilemeleri ─────────────────────────────────
        var tools = await db.ToolPurchases
            .Include(t => t.User)
            .Where(t => t.AutoRenew
                     && t.ExpiresAt != null
                     && t.ExpiresAt >= now
                     && t.ExpiresAt < dayEnd)
            .ToListAsync(ct);

        foreach (var tool in tools)
        {
            await RenewToolPurchaseAsync(tool, db, paytr, email, ct);
        }

        try { await db.SaveChangesAsync(ct); }
        catch (Exception ex) { logger.LogError(ex, "[AutoRenew] SaveChanges başarısız."); }

        logger.LogInformation("[AutoRenew] Tamamlandı. Abonelik={SubCount}, Araç={ToolCount}",
            subs.Count, tools.Count);
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

        if (!string.IsNullOrEmpty(user.PayTrCardToken) && plan.PriceMonthly > 0)
        {
            success = await paytr.RecurringChargeAsync(
                user.PayTrCardToken, orderId, plan.PriceMonthly,
                $"{plan.Name} Paketi — 1 Aylık", user, ct);
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

    private async Task RenewToolPurchaseAsync(
        ToolPurchase tool, AppDbContext db, PayTrService paytr, EmailService email, CancellationToken ct)
    {
        var user = tool.User;

        logger.LogInformation("[AutoRenew] Araç yenileme: userId={UserId} toolId={ToolId}",
            user.Id, tool.ToolId);

        var orderId  = $"AR-TOOL-{user.Id.ToString("N")[..8]}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var success  = false;
        var toolName = ToolIdToName(tool.ToolId);

        if (!string.IsNullOrEmpty(user.PayTrCardToken) && tool.AmountPaid > 0)
        {
            success = await paytr.RecurringChargeAsync(
                user.PayTrCardToken, orderId, tool.AmountPaid,
                $"{toolName} araç aboneliği", user, ct);
        }

        if (success)
        {
            // Yeni ToolPurchase oluştur (mevcut sona erer, yeni başlar)
            db.ToolPurchases.Add(new ToolPurchase
            {
                UserId          = tool.UserId,
                ToolId          = tool.ToolId,
                MonthlyLimit    = tool.MonthlyLimit,
                UsesGranted     = tool.MonthlyLimit ?? tool.UsesGranted,
                UsesRemaining   = tool.MonthlyLimit ?? tool.UsesGranted,
                AmountPaid      = tool.AmountPaid,
                IyzicoPaymentId = orderId,
                PurchasedAt     = DateTime.UtcNow,
                ExpiresAt       = DateTime.UtcNow.AddMonths(1),
                AutoRenew       = true,
            });

            // Ödeme kaydı
            db.PaymentOrders.Add(new PaymentOrder
            {
                UserId          = tool.UserId,
                ToolId          = tool.ToolId,
                ConversationId  = orderId,
                IyzicoToken     = "AUTO-RENEW",
                Status          = PaymentOrderStatus.Completed,
                Amount          = tool.AmountPaid,
                IyzicoPaymentId = orderId,
                CompletedAt     = DateTime.UtcNow,
                UsesPerTool     = tool.MonthlyLimit,
            });

            var limitLabel = tool.MonthlyLimit.HasValue
                ? $"{tool.MonthlyLimit} kullanım/ay"
                : "Sınırsız kullanım";

            try
            {
                await email.SendRenewalSuccessEmailAsync(
                    user.Email, user.Name,
                    toolName, tool.AmountPaid, DateTime.UtcNow.AddMonths(1),
                    [$"{toolName}: {limitLabel}"]);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[AutoRenew] Araç başarı maili gönderilemedi: {Email}", user.Email);
            }

            logger.LogInformation("[AutoRenew] ✅ Araç yenilendi: {Email} - {ToolId}", user.Email, tool.ToolId);
        }
        else
        {
            try
            {
                await email.SendRenewalFailedEmailAsync(
                    user.Email, user.Name,
                    toolName, tool.ExpiresAt!.Value);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "[AutoRenew] Araç hata maili gönderilemedi: {Email}", user.Email);
            }

            logger.LogWarning("[AutoRenew] ❌ Araç yenilenemedi: {Email} - {ToolId}", user.Email, tool.ToolId);
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
