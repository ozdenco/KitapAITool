using System.Text.Json;
using System.Text.Json.Nodes;

namespace KolayKobi.Api.Services;

/// <summary>
/// Forwards requests to the existing n8n webhook infrastructure.
/// The .NET backend acts as an authenticated proxy — n8n workflows are untouched.
/// </summary>
public class N8nProxyService(HttpClient http, IConfiguration config, ILogger<N8nProxyService> logger)
{
    private readonly string _baseUrl = config["N8n:BaseUrl"]
        ?? throw new InvalidOperationException("N8n:BaseUrl not configured");

    // Tool ID → n8n webhook path mapping
    // Paths match workflow JSON files in /n8n-workflows/
    private static readonly Dictionary<string, string> WebhookPaths = new()
    {
        ["gorunurluk-skoru"]  = "/webhook/kolay-kobi-skor",
        ["musteri-persona"]   = "/webhook/kolay-kobi-persona",
        ["icerik-takvimi"]    = "/webhook/kolay-kobi-takvim",
        ["whatsapp-satis"]    = "/webhook/kolay-kobi-wa",
        ["reklam-butce"]      = "/webhook/kolay-kobi-butce",
        ["musteri-geri-donus"]= "/webhook/kolay-kobi-geri-donus",
        ["rakip-analiz"]      = "/webhook/kolay-kobi-rakip",
        ["chatbot-senaryo"]   = "/webhook/kolay-kobi-chatbot",
        ["ai-gorunurluk"]     = "/webhook/kolay-kobi-ai-visibility",
        ["viral-video"]       = "/webhook/kolay-kobi-viral-uyarlayici",
        ["trend-video"]       = "/webhook/kolay-kobi-trend-video",
        // Viral Video'nun kopyası — Veo video üretimi burada geliştiriliyor.
        ["video-olusturma"]   = "/webhook/kolay-kobi-video-olusturma",
        // Seçilen uyarlamayı Veo ile gerçek videoya çevirir (2-5 dk, async)
        ["video-uret"]        = "/webhook/kolay-kobi-video-uret"
    };

    // Async tools use job polling.
    private static readonly HashSet<string> AsyncToolIds = ["icerik-takvimi", "trend-video", "video-uret"];

    // Araçların durum sorgulama webhook'ları ana path'den AYRI olabilir.
    // Her async araç için ayrı bir Status Webhook path + ?jobId= query param kullanılır.
    private static readonly Dictionary<string, string> StatusWebhookPaths = new()
    {
        ["trend-video"]    = "/webhook/kolay-kobi-trend-video-status",
        ["icerik-takvimi"] = "/webhook/kolay-kobi-takvim-status",
        ["video-uret"]     = "/webhook/kolay-kobi-video-uret-status"
    };

    public async Task<HttpResponseMessage> ForwardAsync(
        string toolId,
        object payload,
        string? kimlik,
        CancellationToken cancellationToken = default)
    {
        if (!WebhookPaths.TryGetValue(toolId, out var path))
            throw new ArgumentException($"Unknown tool: {toolId}");

        var url = $"{_baseUrl}{path}";
        logger.LogInformation("Forwarding {ToolId} request to n8n: {Url}", toolId, url);

        var response = await http.PostAsJsonAsync(url, KimlikEkle(payload, kimlik), cancellationToken);
        return response;
    }

    /// <summary>
    /// n8n'deki "Rate Limit Check" düğümü günlük kotayı IP'ye göre ayırıyor. Uygulamadan
    /// gelen bütün istekler n8n'e tek bir kimlikle (backend sunucusunun IP'si) ulaştığı
    /// için her kullanıcı aynı kovayı paylaşıyordu — 30 kişilik bir workshop tek kovaya
    /// sığmaz. IP zaten güvenilir bir ayraç da değil: mobil veride değişiyor, ortak
    /// wifi'de birleşiyor.
    ///
    /// Çözüm, kovayı JWT'den gelen kullanıcı kimliğiyle ayırmak. Kimlik BAŞLIK yerine
    /// GÖVDEYE konuyor; Traefik güvenilmeyen X-Forwarded-* başlıklarını siliyor, gövdeye
    /// ise kimse dokunmuyor. n8n tarafı `body.kkbKimlik` yoksa eskisi gibi IP'ye düşer,
    /// böylece WordPress'ten gelen girişsiz istekler olduğu gibi çalışmaya devam eder.
    /// </summary>
    private object KimlikEkle(object payload, string? kimlik)
    {
        if (string.IsNullOrWhiteSpace(kimlik))
            return payload;

        try
        {
            if (JsonSerializer.SerializeToNode(payload) is JsonObject govde)
            {
                govde["kkbKimlik"] = kimlik;
                return govde;
            }

            logger.LogWarning("İstek gövdesi JSON nesnesi değil, kimlik eklenemedi.");
            return payload;
        }
        catch (Exception ex)
        {
            // Kimlik eklenemezse istek yine de gitsin: n8n IP'ye düşer, kullanıcı en
            // fazla ortak kovaya girer. İsteği tamamen düşürmek bundan çok daha kötü.
            logger.LogWarning(ex, "İstek gövdesine kimlik eklenemedi.");
            return payload;
        }
    }

    public bool IsAsync(string toolId) => AsyncToolIds.Contains(toolId);

    /// <summary>
    /// Poll n8n for async job result by job_id.
    /// trend-video uses a dedicated status webhook at a separate path with ?jobId= query param.
    /// Other async tools fall back to {mainWebhookPath}/status/{jobId}.
    /// </summary>
    public async Task<HttpResponseMessage> PollJobAsync(
        string toolId,
        string jobId,
        CancellationToken cancellationToken = default)
    {
        string url;

        if (StatusWebhookPaths.TryGetValue(toolId, out var statusPath))
        {
            // Dedicated status webhook — uses ?jobId= query param
            url = $"{_baseUrl}{statusPath}?jobId={Uri.EscapeDataString(jobId)}";
        }
        else
        {
            // Default fallback: append /status/{jobId} to the main webhook path
            if (!WebhookPaths.TryGetValue(toolId, out var mainPath))
                throw new ArgumentException($"Unknown tool: {toolId}");
            url = $"{_baseUrl}{mainPath}/status/{jobId}";
        }

        logger.LogDebug("Polling job {JobId} for {ToolId}: {Url}", jobId, toolId, url);
        return await http.GetAsync(url, cancellationToken);
    }
}
