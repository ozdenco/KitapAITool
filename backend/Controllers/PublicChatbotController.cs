using System.Text.Json;
using KolayKobi.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

/// <summary>
/// Kullanıcının kendi web sitesine gömdüğü chatbot widget'ının senaryoyu
/// çektiği AÇIK uç. Kimlik doğrulaması YOKTUR — widget ziyaretçinin
/// tarayıcısında çalışır, oturum bilgisi taşımaz.
///
/// Güvenlik notu: yalnızca chatbot senaryosu döndürülür ve yalnızca
/// tahmin edilemeyecek bir GUID ile erişilir. Kullanıcının e-postası,
/// diğer araç çıktıları veya hesap bilgisi bu uçtan ASLA dönmez.
/// Zaten ziyaretçilere gösterilmek üzere üretilmiş içeriktir.
/// </summary>
[ApiController]
[Route("api/public/chatbot")]
[AllowAnonymous]
public class PublicChatbotController(
    AppDbContext db,
    ILogger<PublicChatbotController> logger) : ControllerBase
{
    private const string CHATBOT_TOOL_ID = "chatbot-senaryo";

    /// <summary>GET /api/public/chatbot/{id} — Gömülü widget için senaryo.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetScenario(Guid id, CancellationToken ct)
    {
        var kayit = await db.ToolResults
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && r.ToolId == CHATBOT_TOOL_ID, ct);

        if (kayit is null)
            return NotFound(new { error = "Senaryo bulunamadı." });

        var senaryo = SenaryoyuCozumle(kayit.OutputJson);
        if (senaryo is null)
        {
            logger.LogWarning("Chatbot senaryosu çözümlenemedi: {ResultId}", id);
            return StatusCode(422, new { error = "Senaryo okunamadı." });
        }

        // Widget üçüncü taraf sitelerden çağrılır → CORS serbest, kısa süreli cache
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        Response.Headers["Cache-Control"] = "public, max-age=300";

        return Content(senaryo, "application/json");
    }

    /// <summary>
    /// Depolanan çıktı n8n'den geldiği gibi saklanır:
    ///   { "content": [ { "type": "text", "text": "{...asıl JSON...}" } ] }
    /// Bazen bu metin markdown çiti veya MiniMax'in &lt;think&gt; bloğuyla sarılıdır.
    /// Widget'ı basit tutmak için ayıklamayı burada yapıyoruz; widget doğrudan
    /// kullanılabilir JSON alır.
    /// </summary>
    private static string? SenaryoyuCozumle(string outputJson)
    {
        try
        {
            var ham = outputJson;

            using (var doc = JsonDocument.Parse(outputJson))
            {
                if (doc.RootElement.TryGetProperty("content", out var content)
                    && content.ValueKind == JsonValueKind.Array
                    && content.GetArrayLength() > 0
                    && content[0].TryGetProperty("text", out var text))
                {
                    ham = text.GetString() ?? "";
                }
            }

            // <think> bloğu ve markdown çitlerini at (bkz. rehber bölüm 16)
            var thinkSonu = ham.LastIndexOf("</think>", StringComparison.OrdinalIgnoreCase);
            if (thinkSonu != -1) ham = ham[(thinkSonu + "</think>".Length)..];
            ham = ham.Replace("```json", "").Replace("```", "");

            var basla = ham.IndexOf('{');
            var bitir = ham.LastIndexOf('}');
            if (basla == -1 || bitir <= basla) return null;
            ham = ham[basla..(bitir + 1)];

            // Geçerli JSON mu ve beklenen alanlar var mı?
            using var senaryo = JsonDocument.Parse(ham);
            if (!senaryo.RootElement.TryGetProperty("sss_kartlari", out _)) return null;

            return ham;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
