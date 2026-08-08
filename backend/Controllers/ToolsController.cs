using System.Security.Claims;
using System.Text.Json;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/tools")]
[Authorize]
public class ToolsController(
    ToolUsageService usage,
    N8nProxyService n8n,
    ILogger<ToolsController> logger) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>GET /api/tools/usage — Returns usage summary for all tools.</summary>
    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage()
    {
        var summary = await usage.GetUsageSummaryAsync(CurrentUserId);
        var data = summary.Select(s => new
        {
            toolId = s.ToolId,
            usedCount = s.UsedCount,
            limit = s.Limit
        });
        return Ok(new { success = true, data });
    }

    /// <summary>POST /api/tools/{toolId}/run — Proxy request to n8n and log usage.</summary>
    [HttpPost("{toolId}/run")]
    public async Task<IActionResult> RunTool(
        string toolId,
        [FromBody] JsonElement payload,
        CancellationToken ct)
    {
        var userId = CurrentUserId;

        // E-posta doğrulama + rate limit kontrolü
        bool canUse;
        try { canUse = await usage.CanUseToolAsync(userId, toolId); }
        catch (InvalidOperationException ex) when (ex.Message == "EMAIL_NOT_VERIFIED")
        {
            return StatusCode(403, new { error = "EMAIL_NOT_VERIFIED" });
        }
        if (!canUse)
            return StatusCode(429, new { error = "Aylık kullanım limitinize ulaştınız. Planı yükseltin." });

        try
        {
            var response = await n8n.ForwardAsync(toolId, payload, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("n8n returned {Status} for tool {ToolId}", response.StatusCode, toolId);
                await usage.RecordUsageAsync(userId, toolId, success: false);
                return StatusCode((int)response.StatusCode, new { error = "Araç şu an kullanılamıyor. Lütfen tekrar deneyin." });
            }

            await usage.RecordUsageAsync(userId, toolId, success: true);

            // For async tools, return job_id for polling
            if (n8n.IsAsync(toolId))
                return Accepted(JsonSerializer.Deserialize<object>(content));

            return Content(content, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "n8n connection error for tool {ToolId}", toolId);
            return StatusCode(503, new { error = "Servis bağlantı hatası. Lütfen tekrar deneyin." });
        }
        catch (TaskCanceledException)
        {
            return StatusCode(408, new { error = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin." });
        }
    }

    /// <summary>GET /api/tools/{toolId}/status/{jobId} — Poll async tool result.</summary>
    [HttpGet("{toolId}/status/{jobId}")]
    public async Task<IActionResult> PollStatus(string toolId, string jobId, CancellationToken ct)
    {
        try
        {
            var response = await n8n.PollJobAsync(toolId, jobId, ct);
            var content = await response.Content.ReadAsStringAsync(ct);
            return Content(content, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "n8n poll error for {ToolId}/{JobId}", toolId, jobId);
            return StatusCode(503, new { error = "Sonuç alınamadı. Lütfen tekrar deneyin." });
        }
    }
}
