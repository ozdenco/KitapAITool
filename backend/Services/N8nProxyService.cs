namespace KolayKobi.Api.Services;

/// <summary>
/// Forwards requests to the existing n8n webhook infrastructure.
/// The .NET backend acts as an authenticated proxy — n8n workflows are untouched.
/// </summary>
public class N8nProxyService(HttpClient http, IConfiguration config, ILogger<N8nProxyService> logger)
{
    private readonly string _baseUrl = config["N8n:BaseUrl"]
        ?? throw new InvalidOperationException("N8n:BaseUrl not configured");

    // Tool ID → n8n webhook path mapping (matches existing webhook paths)
    private static readonly Dictionary<string, string> WebhookPaths = new()
    {
        ["gorunurluk-skoru"]  = "/webhook/isletme-gorunurluk-skoru",
        ["musteri-persona"]   = "/webhook/musteri-persona-olusturucu",
        ["icerik-takvimi"]    = "/webhook/icerik-takvimi-uretici",
        ["whatsapp-script"]   = "/webhook/whatsapp-satis-script",
        ["reklam-butce"]      = "/webhook/reklam-butce-optimize",
        ["musteri-geri-donus"]= "/webhook/musteri-geri-donus-sistemi",
        ["rakip-analiz"]      = "/webhook/rakip-analiz-araci",
        ["chatbot-senaryo"]   = "/webhook/chatbot-senaryo-uretici",
        ["ai-gorunurluk"]     = "/webhook/ai-gorunurluk-optimize",
        ["viral-video"]       = "/webhook/viral-video-script",
        ["trend-video"]       = "/webhook/trend-video-bulucu"
    };

    // Async tools use job polling
    private static readonly HashSet<string> AsyncToolIds = ["icerik-takvimi", "trend-video"];

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

    /// <summary>Poll n8n for async job result by job_id.</summary>
    public async Task<HttpResponseMessage> PollJobAsync(
        string toolId,
        string jobId,
        CancellationToken cancellationToken = default)
    {
        if (!WebhookPaths.TryGetValue(toolId, out var path))
            throw new ArgumentException($"Unknown tool: {toolId}");

        var url = $"{_baseUrl}{path}/status/{jobId}";
        return await http.GetAsync(url, cancellationToken);
    }
}
