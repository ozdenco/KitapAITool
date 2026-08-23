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
        ["trend-video"]       = "/webhook/kolay-kobi-trend-video"
    };

    // Async tools use job polling.
    private static readonly HashSet<string> AsyncToolIds = ["icerik-takvimi", "trend-video"];

    // Araçların durum sorgulama webhook'ları ana path'den AYRI olabilir.
    // Her async araç için ayrı bir Status Webhook path + ?jobId= query param kullanılır.
    private static readonly Dictionary<string, string> StatusWebhookPaths = new()
    {
        ["trend-video"]    = "/webhook/kolay-kobi-trend-video-status",
        ["icerik-takvimi"] = "/webhook/kolay-kobi-takvim-status"
    };

    public async Task<HttpResponseMessage> ForwardAsync(
        string toolId,
        object payload,
        CancellationToken cancellationToken = default)
    {
        if (!WebhookPaths.TryGetValue(toolId, out var path))
            throw new ArgumentException($"Unknown tool: {toolId}");

        var url = $"{_baseUrl}{path}";
        logger.LogInformation("Forwarding {ToolId} request to n8n: {Url}", toolId, url);

        var response = await http.PostAsJsonAsync(url, payload, cancellationToken);
        return response;
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
