using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using KolayKobi.Api.Data.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace KolayKobi.Api.Services;

// ─── Result records ───────────────────────────────────────────────────────────

public record PayTrCheckoutResult(
    string Token,
    string PaymentPageUrl   // https://www.paytr.com/odeme/guvenli/{token}
);

// ─── Service ─────────────────────────────────────────────────────────────────

public class PayTrService
{
    private readonly HttpClient _http;
    private readonly string     _merchantId;
    private readonly string     _merchantKey;
    private readonly string     _merchantSalt;
    private readonly bool       _testMode;
    private readonly ILogger<PayTrService> _logger;

    private const string TokenUrl     = "https://www.paytr.com/odeme/api/get-token";
    private const string PaymentBase  = "https://www.paytr.com/odeme/guvenli/";

    public PayTrService(IHttpClientFactory factory, IConfiguration config, ILogger<PayTrService> logger)
    {
        _http         = factory.CreateClient("paytr");
        _merchantId   = config["PayTr:MerchantId"]   ?? throw new InvalidOperationException("PayTr:MerchantId yapılandırılmamış");
        _merchantKey  = config["PayTr:MerchantKey"]  ?? throw new InvalidOperationException("PayTr:MerchantKey yapılandırılmamış");
        _merchantSalt = config["PayTr:MerchantSalt"] ?? throw new InvalidOperationException("PayTr:MerchantSalt yapılandırılmamış");
        _testMode     = config.GetValue<bool>("PayTr:TestMode", false);
        _logger       = logger;
    }

    // ── Ödeme formu oluştur ──────────────────────────────────────────────────

    public async Task<PayTrCheckoutResult> CreateCheckoutAsync(
        string  orderId,        // benzersiz sipariş no (conversationId)
        decimal amount,         // TL cinsinden (199.00)
        string  planName,
        User    user,
        string  userIp,
        string  successUrl,     // ödeme başarı sonrası yönlendirme
        string  failUrl)        // ödeme hata sonrası yönlendirme
    {
        // PayTR tutarı KURUŞ cinsinden (199 TL → 19900)
        var amountKurus = (int)(amount * 100);

        // Sepet: JSON array → base64
        var basket = JsonSerializer.Serialize(new[]
        {
            new[] { planName, amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture), "1" }
        });
        var basketB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(basket));

        // Hash: merchant_id + user_ip + merchant_oid + email + payment_amount
        //       + user_basket_b64 + no_installment + max_installment + currency
        //       + test_mode + merchant_salt
        var noInstallment  = "0";
        var maxInstallment = "0";
        var currency       = "TL";
        var testMode       = _testMode ? "1" : "0";

        var hashInput =
            _merchantId +
            userIp +
            orderId +
            user.Email +
            amountKurus.ToString() +
            basketB64 +
            noInstallment +
            maxInstallment +
            currency +
            testMode +
            _merchantSalt;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_merchantKey));
        var token = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(hashInput)));

        // Form POST parametreleri
        var fields = new Dictionary<string, string>
        {
            ["merchant_id"]      = _merchantId,
            ["user_ip"]          = userIp,
            ["merchant_oid"]     = orderId,
            ["email"]            = user.Email,
            ["payment_amount"]   = amountKurus.ToString(),
            ["payment_type"]     = "card",
            ["currency"]         = currency,
            ["test_mode"]        = testMode,
            ["no_installment"]   = noInstallment,
            ["max_installment"]  = maxInstallment,
            ["user_name"]        = user.Name,
            ["user_address"]     = "Istanbul",
            ["user_phone"]       = "05350000000",
            ["merchant_ok_url"]  = successUrl,
            ["merchant_fail_url"]= failUrl,
            ["user_basket"]      = basketB64,
            ["paytr_token"]      = token,
            ["lang"]             = "tr",
            ["debug_on"]         = "0",
        };

        var content  = new FormUrlEncodedContent(fields);
        var response = await _http.PostAsync(TokenUrl, content);
        var body     = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("PayTR get-token → HTTP {Status} | body: {Body}",
            (int)response.StatusCode, body);

        using var doc  = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var status = root.TryGetProperty("status", out var s) ? s.GetString() : null;
        if (status != "success")
        {
            var reason = root.TryGetProperty("reason", out var r) ? r.GetString() : body;
            throw new InvalidOperationException($"PayTR token hatası: {reason}");
        }

        var paytrToken = root.GetProperty("token").GetString()!;

        return new PayTrCheckoutResult(
            Token:          paytrToken,
            PaymentPageUrl: PaymentBase + paytrToken
        );
    }

    // ── Callback doğrula ─────────────────────────────────────────────────────
    // PayTR, ödeme sonrası callback URL'e POST atar.
    // Hash doğrulama: merchant_oid + merchant_salt + status + total_amount → HMAC-SHA256 → base64

    public bool VerifyCallback(
        string merchantOid,
        string status,
        string totalAmount,
        string receivedHash)
    {
        var hashInput = merchantOid + _merchantSalt + status + totalAmount;
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_merchantKey));
        var expected   = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(hashInput)));

        var ok = expected == receivedHash;
        if (!ok)
            _logger.LogWarning("PayTR callback hash uyuşmazlığı! orderId={OrderId}", merchantOid);
        return ok;
    }
}
