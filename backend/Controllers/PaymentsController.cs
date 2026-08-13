using System.Security.Claims;
using System.Text.Json;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(
    AppDbContext        db,
    PayTrService        paytr,
    SubscriptionService subs,
    IConfiguration      config) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── POST /api/payments/checkout-form ─────────────────────────────────────

    [HttpPost("checkout-form")]
    [Authorize]
    public async Task<IActionResult> CreateCheckoutForm([FromBody] CheckoutRequest req)
    {
        var plan = await db.Plans.FindAsync(req.PlanId);
        if (plan is null || plan.PriceMonthly <= 0)
            return BadRequest(new { error = "Geçersiz plan" });

        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return Unauthorized();

        // Aktif abonelik varsa downgrade/aynı plan engellemesi
        var activeSub = await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == CurrentUserId
                                   && s.Status == SubscriptionStatus.Active
                                   && s.ExpiresAt > DateTime.UtcNow);

        if (activeSub is not null)
        {
            // Plan tier sırası: free=0, standard=1, premium=2, enterprise=3
            var tierOrder = new Dictionary<string, int>
            {
                ["free"]       = 0,
                ["standard"]   = 1,
                ["premium"]    = 2,
                ["enterprise"] = 3,
            };

            var currentTier = tierOrder.GetValueOrDefault(activeSub.Plan?.Type.ToString().ToLower() ?? "free", 0);
            var newTier     = tierOrder.GetValueOrDefault(plan.Type.ToString().ToLower(), 0);

            if (newTier <= currentTier)
                return BadRequest(new { error = "Aktif paketiniz süresi dolmadan aynı veya daha düşük bir paket satın alamazsınız." });
        }

        // Bekleyen eski siparişleri kapat
        var existing = await db.PaymentOrders
            .Where(o => o.UserId == CurrentUserId && o.Status == PaymentOrderStatus.Pending)
            .ToListAsync();
        foreach (var old in existing)
            old.Status = PaymentOrderStatus.Failed;

        var userIdShort = CurrentUserId.ToString("N")[..8];
        var orderId     = $"KKB{userIdShort}{DateTime.UtcNow:yyyyMMddHHmmss}";
        var frontendUrl = config["Frontend:BaseUrl"] ?? "https://app.kolaykobi.com";
        var successUrl  = $"{frontendUrl}/hesabim/odeme-sonuc?status=success&plan={plan.Type.ToString().ToLower()}";
        var failUrl     = $"{frontendUrl}/hesabim/odeme-sonuc?status=error&reason=odeme_basarisiz";

        // Kullanıcı IP'si (nginx proxy arkasındaysa X-Forwarded-For'dan al)
        var userIp = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                     ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                     ?? "1.1.1.1";
        // Birden fazla IP varsa ilkini al
        userIp = userIp.Split(',')[0].Trim();

        PayTrCheckoutResult result;
        try
        {
            result = await paytr.CreateCheckoutAsync(
                orderId,
                plan.PriceMonthly,
                plan.Name,
                user,
                userIp,
                successUrl,
                failUrl);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var order = new PaymentOrder
        {
            UserId         = CurrentUserId,
            PlanId         = plan.Id,
            ConversationId = orderId,
            IyzicoToken    = result.Token,   // PayTR token (alan adı yeniden kullanıldı)
            Amount         = plan.PriceMonthly,
            Status         = PaymentOrderStatus.Pending
        };
        db.PaymentOrders.Add(order);
        await db.SaveChangesAsync();

        return Ok(new
        {
            paymentPageUrl = result.PaymentPageUrl,
            token          = result.Token
        });
    }

    // ── POST /api/payments/tool-checkout ────────────────────────────────────
    // Tekil araç satın alımı için PayTR checkout oluşturur.

    [HttpPost("tool-checkout")]
    [Authorize]
    public async Task<IActionResult> CreateToolCheckout([FromBody] ToolCheckoutRequest req)
    {
        var toolPrice = await db.ToolPrices
            .FirstOrDefaultAsync(p => p.ToolId == req.ToolId && p.IsActive);

        if (toolPrice is null)
            return BadRequest(new { error = "Araç fiyatı bulunamadı veya satın alım kapalı." });

        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return Unauthorized();

        // Aktif araç aboneliği var mı?
        var activePurchase = await db.ToolPurchases
            .AnyAsync(p => p.UserId == CurrentUserId
                        && p.ToolId == req.ToolId
                        && p.UsesRemaining > 0
                        && (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow));
        if (activePurchase)
            return BadRequest(new { error = "Bu araç için zaten aktif bir aboneliğiniz var." });

        // Bekleyen eski siparişleri kapat
        var existing = await db.PaymentOrders
            .Where(o => o.UserId == CurrentUserId
                     && o.ToolId == req.ToolId
                     && o.Status == PaymentOrderStatus.Pending)
            .ToListAsync();
        foreach (var old in existing)
            old.Status = PaymentOrderStatus.Failed;

        var userIdShort = CurrentUserId.ToString("N")[..8];
        var orderId     = $"KKT{userIdShort}{DateTime.UtcNow:yyyyMMddHHmmss}"; // KKT = KolayKobi Tool
        var frontendUrl = config["Frontend:BaseUrl"] ?? "https://app.kolaykobi.com";
        var successUrl  = $"{frontendUrl}/hesabim/odeme-sonuc?status=success&type=tool&tool={req.ToolId}";
        var failUrl     = $"{frontendUrl}/hesabim/odeme-sonuc?status=error&reason=odeme_basarisiz";

        var userIp = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                     ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                     ?? "1.1.1.1";
        userIp = userIp.Split(',')[0].Trim();

        PayTrCheckoutResult result;
        try
        {
            result = await paytr.CreateCheckoutAsync(
                orderId,
                toolPrice.PriceMonthly,
                toolPrice.ToolName,
                user,
                userIp,
                successUrl,
                failUrl);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var order = new PaymentOrder
        {
            UserId         = CurrentUserId,
            PlanId         = null,                        // araç alımı — plan yok
            ToolId         = req.ToolId,
            ConversationId = orderId,
            IyzicoToken    = result.Token,
            Amount         = toolPrice.PriceMonthly,
            Status         = PaymentOrderStatus.Pending
        };
        db.PaymentOrders.Add(order);
        await db.SaveChangesAsync();

        return Ok(new
        {
            paymentPageUrl = result.PaymentPageUrl,
            token          = result.Token
        });
    }

    // ── POST /api/payments/bulk-tool-checkout ───────────────────────────────
    // Birden fazla araç için tek seferde ödeme başlatır.
    // usesPerTool: 10 veya 25 (diğer araçlar ücretsiz plan limitinde kalır)

    [HttpPost("bulk-tool-checkout")]
    [Authorize]
    public async Task<IActionResult> CreateBulkToolCheckout([FromBody] BulkToolCheckoutRequest req)
    {
        if (req.ToolIds is null || req.ToolIds.Length == 0)
            return BadRequest(new { error = "En az bir araç seçmelisiniz." });

        if (req.UsesPerTool != 10 && req.UsesPerTool != 25)
            return BadRequest(new { error = "Geçersiz kullanım miktarı. 10 veya 25 olmalı." });

        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return Unauthorized();

        // Aktif (ücretsiz olmayan) aboneliği olan kullanıcılar araç satın alamaz.
        // Abonelikleri sona erdikten sonra araç alımı açılır.
        var activePaidSub = await db.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == CurrentUserId
                                   && s.Status == SubscriptionStatus.Active
                                   && s.ExpiresAt > DateTime.UtcNow
                                   && s.Plan!.Type != PlanType.Free);

        if (activePaidSub is not null)
        {
            var expiryFormatted = activePaidSub.ExpiresAt!.Value.ToString("dd.MM.yyyy");
            return BadRequest(new
            {
                error = $"Aktif paket aboneliğiniz ({activePaidSub.Plan!.Name}) süresince araç satın alımı mevcut değildir. " +
                        $"Aboneliğiniz {expiryFormatted} tarihinde sona erdikten sonra araç satın alabilirsiniz.",
                subscriptionExpiresAt = activePaidSub.ExpiresAt.Value.ToString("yyyy-MM-dd")
            });
        }

        // Fiyatları yükle ve toplamı hesapla
        var toolIds = req.ToolIds.Distinct().ToArray();
        var prices = await db.ToolPrices
            .Where(p => toolIds.Contains(p.ToolId) && p.IsActive)
            .ToDictionaryAsync(p => p.ToolId, p => p.PriceMonthly);

        if (prices.Count != toolIds.Length)
            return BadRequest(new { error = "Bir veya daha fazla araç fiyatı bulunamadı." });

        // Multiplier: 10 kullanım = base fiyat, 25 kullanım = 2× fiyat
        var multiplier = req.UsesPerTool == 25 ? 2m : 1m;
        var totalAmount = prices.Values.Sum() * multiplier;

        // Bekleyen eski siparişleri kapat
        var existing = await db.PaymentOrders
            .Where(o => o.UserId == CurrentUserId && o.Status == PaymentOrderStatus.Pending)
            .ToListAsync();
        foreach (var old in existing)
            old.Status = PaymentOrderStatus.Failed;

        var userIdShort  = CurrentUserId.ToString("N")[..8];
        var orderId      = $"KKB{userIdShort}{DateTime.UtcNow:yyyyMMddHHmmss}";
        var frontendUrl  = config["Frontend:BaseUrl"] ?? "https://app.kolaykobi.com";
        var successUrl   = $"{frontendUrl}/hesabim/odeme-sonuc?status=success&type=bulk-tool&tools={string.Join(",", toolIds)}&uses={req.UsesPerTool}";
        var failUrl      = $"{frontendUrl}/hesabim/odeme-sonuc?status=error&reason=odeme_basarisiz";

        var userIp = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                     ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                     ?? "1.1.1.1";
        userIp = userIp.Split(',')[0].Trim();

        // Araç adları (iyzico/PayTR ürün açıklaması için)
        var toolNames = string.Join(", ", toolIds.Select(id =>
            prices.ContainsKey(id) ? id : id));

        PayTrCheckoutResult result;
        try
        {
            result = await paytr.CreateCheckoutAsync(
                orderId,
                totalAmount,
                $"{req.UsesPerTool} Kullanım/Ay — {toolIds.Length} Araç",
                user,
                userIp,
                successUrl,
                failUrl);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var order = new PaymentOrder
        {
            UserId         = CurrentUserId,
            PlanId         = null,
            ToolId         = null,
            ToolIds        = JsonSerializer.Serialize(toolIds),
            UsesPerTool    = req.UsesPerTool,
            ConversationId = orderId,
            IyzicoToken    = result.Token,
            Amount         = totalAmount,
            Status         = PaymentOrderStatus.Pending,
        };
        db.PaymentOrders.Add(order);
        await db.SaveChangesAsync();

        return Ok(new { paymentPageUrl = result.PaymentPageUrl, token = result.Token });
    }

    // ── POST /api/payments/callback ──────────────────────────────────────────

    [HttpPost("callback")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Callback([FromForm] PayTrCallbackForm form)
    {
        if (!paytr.VerifyCallback(form.MerchantOid, form.Status, form.TotalAmount, form.Hash))
            return Content("PAYTR_INVALID_HASH");

        var order = await db.PaymentOrders
            .Include(o => o.Plan)
            .FirstOrDefaultAsync(o => o.ConversationId == form.MerchantOid);

        if (order is null)
            return Content("OK");

        if (order.Status != PaymentOrderStatus.Pending)
            return Content("OK");

        if (form.Status == "success")
        {
            order.Status          = PaymentOrderStatus.Completed;
            order.IyzicoPaymentId = form.MerchantOid;
            order.CompletedAt     = DateTime.UtcNow;

            if (order.PlanId.HasValue)
            {
                // Abonelik paketi ödemesi
                await subs.ActivateFromPaymentAsync(order.UserId, order.PlanId.Value, form.MerchantOid);
            }
            else if (order.ToolId is not null)
            {
                // Tekil araç ödemesi — 1 ay sınırsız erişim
                db.ToolPurchases.Add(new ToolPurchase
                {
                    UserId          = order.UserId,
                    ToolId          = order.ToolId,
                    MonthlyLimit    = null,         // sınırsız (tekil araç satın alımı)
                    UsesGranted     = 9999,
                    UsesRemaining   = 9999,
                    AmountPaid      = order.Amount,
                    IyzicoPaymentId = form.MerchantOid,
                    PurchasedAt     = DateTime.UtcNow,
                    ExpiresAt       = DateTime.UtcNow.AddMonths(1),
                });
            }
            else if (order.ToolIds is not null)
            {
                // Toplu araç ödemesi — her araç için ayrı ToolPurchase oluştur
                var toolIds   = JsonSerializer.Deserialize<string[]>(order.ToolIds) ?? [];
                var perTool   = toolIds.Length > 0 ? order.Amount / toolIds.Length : 0;
                var monthly   = order.UsesPerTool;   // 10 veya 25

                foreach (var tid in toolIds)
                {
                    db.ToolPurchases.Add(new ToolPurchase
                    {
                        UserId          = order.UserId,
                        ToolId          = tid,
                        MonthlyLimit    = monthly,
                        UsesGranted     = monthly ?? 10,
                        UsesRemaining   = monthly ?? 10,
                        AmountPaid      = perTool,
                        IyzicoPaymentId = form.MerchantOid,
                        PurchasedAt     = DateTime.UtcNow,
                        ExpiresAt       = DateTime.UtcNow.AddMonths(1),
                    });
                }
            }
        }
        else
        {
            order.Status = PaymentOrderStatus.Failed;
        }

        await db.SaveChangesAsync();
        return Content("OK");
    }

    // ── GET /api/payments/orders ─────────────────────────────────────────────

    [HttpGet("orders")]
    [Authorize]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await db.PaymentOrders
            .Include(o => o.Plan)
            .Where(o => o.UserId == CurrentUserId)
            .OrderByDescending(o => o.CreatedAt)
            .Take(20)
            .Select(o => new
            {
                o.Id,
                o.Amount,
                o.Status,
                planName    = o.Plan != null ? o.Plan.Name : null,
                toolId      = o.ToolId,
                o.CreatedAt,
                o.CompletedAt
            })
            .ToListAsync();

        return Ok(new { success = true, data = orders });
    }

    // ── GET /api/payments/my-tools ────────────────────────────────────────────
    // Kullanıcının satın aldığı bireysel araçlar

    [HttpGet("my-tools")]
    [Authorize]
    public async Task<IActionResult> GetMyTools()
    {
        var now = DateTime.UtcNow;
        var purchases = await db.ToolPurchases
            .Where(p => p.UserId == CurrentUserId
                     && p.UsesRemaining > 0
                     && (p.ExpiresAt == null || p.ExpiresAt > now))
            .OrderBy(p => p.ExpiresAt)
            .Select(p => new
            {
                p.Id,
                p.ToolId,
                p.AmountPaid,
                p.PurchasedAt,
                p.ExpiresAt,
            })
            .ToListAsync();

        return Ok(new { success = true, data = purchases });
    }

    // ── GET /api/payments/tool-prices ────────────────────────────────────────
    // Public — tüm araç fiyatlarını döndürür (Araç Satın Al sayfası için).

    [HttpGet("tool-prices")]
    [AllowAnonymous]
    public async Task<IActionResult> GetToolPrices()
    {
        var prices = await db.ToolPrices
            .Where(p => p.IsActive)
            .OrderBy(p => p.Id)
            .Select(p => new { p.ToolId, p.ToolName, p.PriceMonthly })
            .ToListAsync();

        return Ok(new { success = true, data = prices });
    }

    public record CheckoutRequest(int PlanId);
    public record ToolCheckoutRequest(string ToolId);
    public record BulkToolCheckoutRequest(string[] ToolIds, int UsesPerTool);
}

// PayTR callback form-data modeli
// [FromForm] bağlaması için field isimleri PayTR'nin gönderdiği snake_case ile eşleşmeli.
public class PayTrCallbackForm
{
    [Microsoft.AspNetCore.Mvc.FromForm(Name = "merchant_oid")]
    public string MerchantOid      { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "status")]
    public string Status           { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "total_amount")]
    public string TotalAmount      { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "hash")]
    public string Hash             { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "failed_reason_code")]
    public string FailedReasonCode { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "failed_reason_msg")]
    public string FailedReasonMsg  { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "test_mode")]
    public string TestMode         { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "payment_type")]
    public string PaymentType      { get; set; } = "";

    [Microsoft.AspNetCore.Mvc.FromForm(Name = "currency")]
    public string Currency         { get; set; } = "";
}
