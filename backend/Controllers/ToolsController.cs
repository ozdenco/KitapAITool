using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/tools")]
[Authorize]
public class ToolsController(
    ToolUsageService usage,
    N8nProxyService n8n,
    AppDbContext db,
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

    /// <summary>GET /api/tools/usage/history?months=6 — Monthly usage history.</summary>
    [HttpGet("usage/history")]
    public async Task<IActionResult> GetUsageHistory([FromQuery] int months = 6)
    {
        var history = await usage.GetUsageHistoryAsync(CurrentUserId, months);
        var data = history.Select(h => new
        {
            monthYear  = h.MonthYear,
            totalUsed  = h.TotalUsed,
            totalLimit = h.TotalLimit,
        });
        return Ok(data);
    }

    /// <summary>GET /api/tools/results — Kullanıcının kayıtlı çıktıları (son 50 kayıt).</summary>
    [HttpGet("results")]
    public async Task<IActionResult> GetResults([FromQuery] int limit = 50)
    {
        var clampedLimit = Math.Min(limit, 100);
        var results = await db.ToolResults
            .Where(r => r.UserId == CurrentUserId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(clampedLimit)
            .Select(r => new
            {
                r.Id,
                r.ToolId,
                r.InputSummary,
                r.CreatedAt,
            })
            .ToListAsync();
        return Ok(new { success = true, data = results });
    }

    /// <summary>GET /api/tools/results/{id} — Tek bir çıktının tam JSON içeriği.</summary>
    [HttpGet("results/{id:guid}")]
    public async Task<IActionResult> GetResult(Guid id)
    {
        var result = await db.ToolResults
            .Where(r => r.UserId == CurrentUserId && r.Id == id)
            .Select(r => new { r.Id, r.ToolId, r.InputSummary, r.OutputJson, r.CreatedAt })
            .FirstOrDefaultAsync();

        if (result is null)
            return NotFound(new { error = "Kayıt bulunamadı." });

        return Ok(new { success = true, data = result });
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

            // Auto-save result for all successful runs (fire-and-forget for performance)
            await SaveToolResultAsync(userId, toolId, payload, content, ct);

            // Async tools return 202 Accepted; frontend reads the body the same way
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

    /// <summary>POST /api/tools/{toolId}/results/save — Async araç sonuçlarını kaydet.</summary>
    [HttpPost("{toolId}/results/save")]
    public async Task<IActionResult> SaveAsyncResult(
        string toolId,
        [FromBody] SaveResultRequest request,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var summary = ExtractSummary(toolId, request.InputSummary);
        db.ToolResults.Add(new ToolResult
        {
            UserId       = userId,
            ToolId       = toolId,
            InputSummary = summary,
            OutputJson   = request.OutputJson,
        });
        await db.SaveChangesAsync(ct);
        return Ok(new { success = true });
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

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task SaveToolResultAsync(
        Guid userId,
        string toolId,
        JsonElement payload,
        string outputJson,
        CancellationToken ct)
    {
        try
        {
            // Extract input summary from payload
            var promptText = payload.TryGetProperty("prompt", out var p) ? p.GetString() ?? "" : "";
            var summary = ExtractSummary(toolId, promptText);

            db.ToolResults.Add(new ToolResult
            {
                UserId       = userId,
                ToolId       = toolId,
                InputSummary = summary,
                OutputJson   = outputJson,
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Saving history must not break the main request
            logger.LogWarning(ex, "Failed to save tool result for {ToolId}", toolId);
        }
    }

    private static readonly Regex BusinessNamePattern =
        new(@"(?:İşletme adı|Şirket adı|işletme adı|şirket adı)\s*:\s*(.+?)(?:\n|$)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static string ExtractSummary(string toolId, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return toolId;

        var match = BusinessNamePattern.Match(text);
        if (match.Success)
            return match.Groups[1].Value.Trim()[..Math.Min(match.Groups[1].Value.Trim().Length, 150)];

        var clean = text.Replace("\n", " ").Trim();
        return clean.Length <= 120 ? clean : clean[..120].TrimEnd() + "…";
    }
}

public record SaveResultRequest(string InputSummary, string OutputJson);
