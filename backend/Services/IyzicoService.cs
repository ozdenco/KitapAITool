using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using KolayKobi.Api.Data.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace KolayKobi.Api.Services;

// ─── Result records ───────────────────────────────────────────────────────────

public record IyzicoCheckoutResult(
    string Token,
    string PaymentPageUrl
);

public record IyzicoPaymentResult(
    bool   Success,
    string Status,           // "SUCCESS" | "FAILURE" | "INIT_THREEDS"
    string? PaymentId,
    string? ConversationId,
    string? ErrorMessage
);

// ─── Service ─────────────────────────────────────────────────────────────────

public class IyzicoService
{
    private readonly HttpClient _http;
    private readonly string     _apiKey;
    private readonly string     _secretKey;
    private readonly string     _baseUrl;
    private readonly ILogger<IyzicoService> _logger;

    // Response'lar her zaman JSON gelir (body PKI olsa bile)
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy   = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented          = false
    };

    public IyzicoService(IHttpClientFactory factory, IConfiguration config, ILogger<IyzicoService> logger)
    {
        _http      = factory.CreateClient("iyzico");
        _apiKey    = config["Iyzico:ApiKey"]    ?? throw new InvalidOperationException("Iyzico:ApiKey yapılandırılmamış");
        _secretKey = config["Iyzico:SecretKey"] ?? throw new InvalidOperationException("Iyzico:SecretKey yapılandırılmamış");
        _baseUrl   = (config["Iyzico:BaseUrl"]  ?? "https://sandbox-api.iyzipay.com").TrimEnd('/');
        _logger    = logger;
    }

    // ── Checkout form başlat ─────────────────────────────────────────────────

    public async Task<IyzicoCheckoutResult> CreateCheckoutFormAsync(
        string  conversationId,
        decimal amount,
        string  planName,
        User    user,
        string  callbackUrl)
    {
        var priceStr  = amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        var firstName = FirstName(user.Name);
        var lastName  = LastName(user.Name);

        // iyzico resmi SDK'larının tümü PKI string kullanır (JSON değil).
        // Field sırası önemli — SDK referanslarıyla birebir aynı tutuldu.
        // Türkçe karakterleri ASCII'ye çevir (iyzico form-urlencoded encoding uyumu)
        var nameAscii    = ToAscii(firstName);
        var surnameAscii = ToAscii(lastName);

        // Türkçe karakterleri ASCII'ye çevir (form-urlencoded uyumu)
        var buyerPki = Pki(
            ("id",                  $"U{user.Id:N}"[..8]),
            ("name",                nameAscii),
            ("surname",             surnameAscii),
            ("gsmNumber",           "+905350000000"),
            ("email",               user.Email),
            ("identityNumber",      "74300864791"),
            ("registrationAddress", "Istanbul"),
            ("ip",                  "85.34.78.112"),
            ("city",                "Istanbul"),
            ("country",             "Turkey"),
            ("zipCode",             "34732")
        );

        var addrPki = Pki(
            ("contactName", $"{nameAscii} {surnameAscii}"),
            ("city",        "Istanbul"),
            ("country",     "Turkey"),
            ("address",     "Istanbul"),
            ("zipCode",     "34742")
        );

        var basketItemPki = Pki(
            ("id",        $"PLN{user.Id:N}"[..12]),
            ("name",      planName),
            ("category1", "Yazilim"),
            ("itemType",  "VIRTUAL"),
            ("price",     priceStr)
        );

        var pkiBody =
            "[locale=tr" +
            $",conversationId={conversationId}" +
            $",price={priceStr}" +
            $",paidPrice={priceStr}" +
            ",currency=TRY" +
            $",basketId={conversationId}" +
            ",paymentGroup=PRODUCT" +
            $",callbackUrl={callbackUrl}" +
            ",enabledInstallments=[2, 3, 6, 9]" +
            $",buyer={buyerPki}" +
            $",shippingAddress={addrPki}" +
            $",billingAddress={addrPki}" +
            $",basketItems=[{basketItemPki}]" +
            "]";

        _logger.LogInformation("iyzico PKI body: {Pki}", pkiBody);

        var response = await SendAsync(
            HttpMethod.Post,
            "/payment/iyzipos/checkoutform/initialize/auth/ecom",
            pkiBody);

        using var doc  = JsonDocument.Parse(response);
        var root = doc.RootElement;

        var status = root.TryGetProperty("status", out var s) ? s.GetString() : null;
        if (status != "success")
        {
            var msg = root.TryGetProperty("errorMessage", out var em)
                      ? em.GetString()
                      : "iyzico hata döndü";
            throw new InvalidOperationException($"iyzico checkout hatası: {msg}");
        }

        return new IyzicoCheckoutResult(
            Token:          root.GetProperty("token").GetString()!,
            PaymentPageUrl: root.GetProperty("paymentPageUrl").GetString()!
        );
    }

    // ── Ödeme sonucunu sorgula ────────────────────────────────────────────────

    public async Task<IyzicoPaymentResult> RetrieveResultAsync(string token)
    {
        var pkiBody = $"[locale=tr,conversationId={token},token={token}]";

        var response = await SendAsync(
            HttpMethod.Post,
            "/payment/iyzipos/checkoutform/auth/ecom/detail",
            pkiBody);

        using var doc  = JsonDocument.Parse(response);
        var root = doc.RootElement;

        var paymentStatus = root.TryGetProperty("paymentStatus", out var ps)
            ? ps.GetString() ?? "FAILURE"
            : "FAILURE";

        var paymentId = root.TryGetProperty("paymentId", out var pid)
            ? pid.GetString()
            : null;

        var conversationId = root.TryGetProperty("conversationId", out var cid)
            ? cid.GetString()
            : null;

        var errorMessage = root.TryGetProperty("errorMessage", out var em2)
            ? em2.GetString()
            : null;

        return new IyzicoPaymentResult(
            Success:        paymentStatus == "SUCCESS",
            Status:         paymentStatus,
            PaymentId:      paymentId,
            ConversationId: conversationId,
            ErrorMessage:   errorMessage
        );
    }

    // ── HTTP + imza ───────────────────────────────────────────────────────────
    // iyzico resmi SDK formülü (PHP/Java/dotnet SDK kaynaklarından):
    //   hash    = Base64(SHA256(apiKey + rnd + secretKey + pkiBody))
    //   header  = "IYZWS {apiKey}:{rnd}:{hash}"
    //   body    = PKI string (application/x-www-form-urlencoded)
    //   response = JSON

    private async Task<string> SendAsync(HttpMethod method, string path, string pkiBody)
    {
        var rnd = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()
                  + Random.Shared.Next(100_000, 999_999).ToString();

        var hashInput = _apiKey + rnd + _secretKey + pkiBody;
        using var sha  = SHA256.Create();
        var hash       = Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(hashInput)));

        var req = new HttpRequestMessage(method, _baseUrl + path)
        {
            // Resmi SDK'lar PKI body'yi application/x-www-form-urlencoded olarak gönderir
            Content = new StringContent(pkiBody, Encoding.UTF8, "application/x-www-form-urlencoded")
        };

        req.Headers.TryAddWithoutValidation("Authorization",        $"IYZWS {_apiKey}:{rnd}:{hash}");
        req.Headers.TryAddWithoutValidation("x-iyzi-rnd",           rnd);
        req.Headers.TryAddWithoutValidation("x-iyzi-client-version", "kolaykobi-dotnet-1.0");
        req.Headers.TryAddWithoutValidation("Accept",                "application/json");

        var resp = await _http.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();
        _logger.LogInformation("iyzico {Method} {Path} → HTTP {Status} | body: {Body}",
            method, path, (int)resp.StatusCode, body);
        return body;
    }

    // ── PKI string builder ────────────────────────────────────────────────────
    // Çıktı: [key1=val1,key2=val2,...]   (null değerler atlanır)

    private static string Pki(params (string key, string? val)[] fields)
    {
        var parts = fields
            .Where(f => f.val is not null)
            .Select(f => $"{f.key}={f.val}");
        return "[" + string.Join(",", parts) + "]";
    }

    // ── Türkçe → ASCII dönüştürücü ───────────────────────────────────────────
    // iyzico form-urlencoded body'de Türkçe karakterler sorun çıkarabilir

    private static string ToAscii(string s) =>
        s.Replace('Ö', 'O').Replace('ö', 'o')
         .Replace('Ü', 'U').Replace('ü', 'u')
         .Replace('Ç', 'C').Replace('ç', 'c')
         .Replace('Ş', 'S').Replace('ş', 's')
         .Replace('Ğ', 'G').Replace('ğ', 'g')
         .Replace('İ', 'I').Replace('ı', 'i');

    // ── Yardımcılar ───────────────────────────────────────────────────────────

    private static string FirstName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', 2);
        return parts[0].Length > 0 ? parts[0] : "Ad";
    }

    private static string LastName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', 2);
        return parts.Length > 1 && parts[1].Length > 0 ? parts[1] : "Soyad";
    }
}
