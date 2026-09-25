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
    VideoCreditService kredi,
    AppDbContext db,
    ILogger<ToolsController> logger) : ControllerBase
{
    /// <summary>Video üretimi kaç kredi tüketir: sahne başına 1 (1 kredi = 8 sn klip).</summary>
    private static int KrediMaliyeti(JsonElement payload) =>
        payload.ValueKind == JsonValueKind.Object
        && payload.TryGetProperty("sahneler", out var el)
        && el.ValueKind == JsonValueKind.Array
            ? el.GetArrayLength()
            : 0;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>GET /api/tools/usage — Returns usage summary for all tools.</summary>
    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage()
    {
        var summary  = await usage.GetUsageSummaryAsync(CurrentUserId);
        var planName = await usage.GetPlanNameAsync(CurrentUserId);
        var data = summary.Select(s => new
        {
            toolId = s.ToolId,
            usedCount = s.UsedCount,
            limit = s.Limit,
            planLabel = planName      // frontend limit==null'dan plan tahmin etmesin
        });
        return Ok(new { success = true, data });
    }

    /// <summary>
    /// GET /api/tools/usage/history?months=6&amp;startDay=1
    /// Fatura dönemi bazlı kullanım geçmişi.
    /// startDay: satın alım tarihinin günü (1–28), varsayılan 1 (takvim ayı gibi davranır).
    /// </summary>
    [HttpGet("usage/history")]
    public async Task<IActionResult> GetUsageHistory(
        [FromQuery] int months   = 6,
        [FromQuery] int startDay = 1)
    {
        var history = await usage.GetUsageHistoryAsync(CurrentUserId, months, startDay);
        var data = history.Select(h => new
        {
            periodStart = h.PeriodStart,  // "2026-07-14"
            periodEnd   = h.PeriodEnd,    // "2026-08-14"
            totalUsed   = h.TotalUsed,
        });
        return Ok(data);
    }

    /// <summary>GET /api/tools/usage/period?start=yyyy-MM-dd&amp;end=yyyy-MM-dd — Dönem içi araç bazlı dökümü.</summary>
    [HttpGet("usage/period")]
    public async Task<IActionResult> GetPeriodUsage(
        [FromQuery] string start,
        [FromQuery] string end)
    {
        if (string.IsNullOrWhiteSpace(start) || string.IsNullOrWhiteSpace(end))
            return BadRequest(new { error = "start ve end parametreleri gerekli." });

        var data = await usage.GetPeriodUsageAsync(CurrentUserId, start, end);
        return Ok(data.Select(t => new
        {
            toolId    = t.ToolId,
            usedCount = t.UsedCount,
            limit     = t.Limit,
        }));
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

    /// <summary>GET /api/tools/{toolId}/last-result — Kullanıcının o tool için son kayıtlı sonucu.</summary>
    [HttpGet("{toolId}/last-result")]
    public async Task<IActionResult> GetLastResult(string toolId)
    {
        var result = await db.ToolResults
            .Where(r => r.UserId == CurrentUserId && r.ToolId == toolId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.ToolId, r.InputSummary, r.OutputJson, r.FormBilgileri, r.CreatedAt })
            .FirstOrDefaultAsync();

        if (result is null)
            return NotFound(new { error = "Henüz sonuç yok." });

        return Ok(new { success = true, data = result });
    }

    /// <summary>GET /api/tools/results/{id} — Tek bir çıktının tam JSON içeriği.</summary>
    [HttpGet("results/{id:guid}")]
    public async Task<IActionResult> GetResult(Guid id)
    {
        var result = await db.ToolResults
            .Where(r => r.UserId == CurrentUserId && r.Id == id)
            .Select(r => new { r.Id, r.ToolId, r.InputSummary, r.OutputJson, r.FormBilgileri, r.CreatedAt })
            .FirstOrDefaultAsync();

        if (result is null)
            return NotFound(new { error = "Kayıt bulunamadı." });

        return Ok(new { success = true, data = result });
    }

    /*
     * MÜŞTERİYE KAPALI ARAÇLAR (12 Eyl 2026, canlıya çıkış öncesi).
     *
     * Arayüzde gizlemek erişimi engellemiyor: adresi/uç noktayı bilen herhangi
     * bir oturum açmış kullanıcı doğrudan istek atabilirdi. Bu uçlar GERÇEK PARA
     * yakıyor (Veo klip üretimi, Apify çalıştırması), o yüzden kilit sunucuda.
     *
     * 404 dönüyoruz, 403 değil: aracın varlığını sızdırmanın anlamı yok.
     */
    private static readonly HashSet<string> YoneticiAraclari =
        new(StringComparer.OrdinalIgnoreCase)
        { "trend-video", "video-olusturma", "video-uret" };

    private bool KullaniciYonetici => User.FindFirst("is_admin")?.Value == "true";

    /// <summary>POST /api/tools/{toolId}/run — Proxy request to n8n and log usage.</summary>
    [HttpPost("{toolId}/run")]
    public async Task<IActionResult> RunTool(
        string toolId,
        [FromBody] JsonElement payload,
        CancellationToken ct)
    {
        var userId = CurrentUserId;

        if (YoneticiAraclari.Contains(toolId) && !KullaniciYonetici)
            return NotFound(new { error = "Araç bulunamadı." });

        /*
         * ÜCRETSİZ SAHNE PLANI ADIMI KULLANIM SAYILMAZ.
         *
         * video-uret iki aşamalı: önce ücretsiz sahne planı üretilir, kullanıcı
         * okuyup onaylarsa ikinci istek videoyu üretir. İki aşama da aynı uca
         * geliyor; ayrımı n8n'deki "Onaylanmış plan mı?" düğümüyle aynı sinyal
         * veriyor: gövdede `sahneler` dizisi VARSA üretim, YOKSA plan.
         *
         * Eskiden ikisi de kullanım olarak sayılıyordu: kullanıcı yalnızca
         * sahne planına baktığı hâlde Kullanım Raporu'nda "Video Üretimi"
         * kayıtları oluşuyordu (8 Eyl 2026'da bildirildi — hiç video
         * üretilmeden 2 kayıt).
         *
         * Kötüye kullanım riski sınırlı: plan adımına ancak Video Oluşturma
         * aracını çalıştırmış (ve o kullanım sayılmış) bir kullanıcı ulaşıyor.
         */
        var planAdimi = toolId == "video-uret" && !SahneleriIceriyorMu(payload);

        // E-posta doğrulama + rate limit kontrolü
        bool canUse;
        try { canUse = await usage.CanUseToolAsync(userId, toolId); }
        catch (InvalidOperationException ex) when (ex.Message == "EMAIL_NOT_VERIFIED")
        {
            return StatusCode(403, new { error = "EMAIL_NOT_VERIFIED" });
        }
        if (!canUse && !planAdimi)
            return StatusCode(429, new { error = "Aylık kullanım limitinize ulaştınız. Planı yükseltin." });

        /*
         * VİDEO KREDİSİ ÖN KONTROLÜ.
         *
         * 1 kredi = 1 sahne (8 sn klip, ham maliyet ~$0.40). Bakiye ÖNCE
         * bakılıyor: krediyi n8n çağrısından sonra düşüyoruz ki başlamayan bir
         * iş için kullanıcı ödemesin, ama yetersiz bakiyeyle Veo'yu hiç
         * tetiklememek gerek — o çağrı gerçek para yakıyor.
         *
         * Hak edilmiş ücretsiz önizleme varsa burada deftere yazılıyor;
         * kullanıcı hakkı olduğu hâlde "krediniz yok" görmesin.
         */
        var krediMaliyeti = toolId == "video-uret" && !planAdimi ? KrediMaliyeti(payload) : 0;
        if (krediMaliyeti > 0)
        {
            await kredi.UcretsizHakkiVerAsync(userId, ct);
            var bakiye = await kredi.BakiyeAsync(userId, ct);
            if (!await kredi.SinirsizMiAsync(userId, ct) && bakiye < krediMaliyeti)
            {
                return StatusCode(402, new
                {
                    error = $"Bu video {krediMaliyeti} kredi gerektiriyor, bakiyeniz {bakiye}. "
                          + "Kredi yükleyip tekrar deneyin.",
                    kredi = new { bakiye, gereken = krediMaliyeti },
                });
            }
        }

        try
        {
            // Kullanım kotası n8n'de IP başına tutuluyordu; uygulamadan gelen her istek
            // aynı sunucu IP'siyle ulaştığı için bütün kullanıcılar tek kovayı
            // paylaşıyordu. Kimliği gövdeyle taşıyoruz — ayrıntı N8nProxyService'te.
            var response = await n8n.ForwardAsync(toolId, payload, $"u:{userId}", ct);
            var content = MojibakeOnarici.Onar(await response.Content.ReadAsStringAsync(ct));

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("n8n returned {Status} for tool {ToolId}", response.StatusCode, toolId);
                if (!planAdimi)
                    await usage.RecordUsageAsync(userId, toolId, success: false);
                return StatusCode((int)response.StatusCode, new { error = "Araç şu an kullanılamıyor. Lütfen tekrar deneyin." });
            }

            /*
             * n8n'İN KOTA YANITI HTTP 200 İLE GELİR — BAŞARI SAYILMAMALI.
             *
             * AI Görünürlük, Viral Video, Video Oluşturma ve Video Üret akışları
             * responseMode='lastNode' kullanıyor; 429 döndürebilmek için bütün
             * başarı yollarına ayrıca "Respond to Webhook" düğümü eklemek
             * gerekirdi. Bunun yerine kota düğümü gövdeye `_kotaDoldu` işaretini
             * koyuyor, ayrımı burada yapıyoruz.
             *
             * Bu kontrol kayıttan ve kredi düşümünden ÖNCE olmak zorunda:
             * RecordUsageAsync başarısız kaydı da aylık sayıma dahil ediyor ve
             * kredi düşümü yalnızca HTTP durumuna bakıyordu. Aksi halde kullanıcı
             * hiçbir şey almadan hem aylık hakkını hem kredisini kaybederdi —
             * video araçlarında bu doğrudan para kaybı demek.
             */
            if (KotaYanitiMi(content))
            {
                logger.LogWarning("n8n günlük kota sınırı aşıldı: {ToolId}, kullanıcı {UserId}", toolId, userId);
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    error = "Bu araç için günlük kullanım sınırına ulaştınız. Yarın tekrar deneyebilirsiniz.",
                });
            }

            // Ücretsiz plan adımı sayılmaz (bkz. yukarıdaki planAdimi açıklaması)
            if (!planAdimi)
                await usage.RecordUsageAsync(userId, toolId, success: true);

            /*
             * Kredi, iş n8n tarafından KABUL EDİLDİKTEN sonra düşülüyor.
             * İş sonradan başarısız olursa AsyncJobWatcher iade ediyor —
             * üretilmeyen video için kredi yakmak güveni bitirir.
             */
            if (krediMaliyeti > 0)
            {
                AsyncJobHelper.TryExtractJobId(content, out var krediIsId);
                await kredi.HarcaAsync(userId, krediMaliyeti, krediIsId, ct);
            }

            /*
             * SONUCU KAYDET — ama async araçlarda BURADA DEĞİL.
             *
             * Async araçlarda (icerik-takvimi, trend-video, video-uret) bu yanıt
             * sonuç değil, yalnızca bir İŞ BİLETİ: {_ok, isId, ...}. Kullanıcı
             * için hiçbir anlamı yok. Gerçek sonuç iş bitince PollStatus
             * tarafından kaydediliyor.
             *
             * Bileti de kaydetmek Geçmiş Çıktılar'da her çalıştırma için İKİ
             * kayıt üretiyordu; biri açıldığında neredeyse boş görünüyordu
             * (8 Eyl 2026'da Video Üretimi'nde bildirildi, üç aracı da
             * etkiliyordu).
             *
             * Bu yüzden async araçlarda TEK bir YER TUTUCU satır açıyoruz.
             * Satırı, iş bitince ya kullanıcının tarayıcısı (PollStatus) ya da
             * AsyncJobWatcher arka plan servisi gerçek çıktıyla GÜNCELLİYOR.
             * Hiç satır açmamak da yanlıştı: kullanıcı sekmeyi kapatınca
             * tarayıcı yoklaması duruyor ve ürettiği videoyu bir daha
             * bulamıyordu.
             */
            Guid? resultId;
            if (planAdimi)
            {
                // Sahne planı ara adım — Geçmiş Çıktılar'a kayıt açmaz.
                resultId = null;
            }
            else if (n8n.IsAsync(toolId) && AsyncJobHelper.TryExtractJobId(content, out var yeniJobId))
            {
                // YER TUTUCU satır — iş bitince AYNI satır güncellenecek.
                resultId = await SaveToolResultAsync(
                    userId, toolId, payload, AsyncJobHelper.BekleyenCiktisi(yeniJobId), ct);
            }
            else
            {
                resultId = await SaveToolResultAsync(userId, toolId, payload, content, ct);
            }

            // Kayıt Id'sini header ile döndür: yanıt gövdesi n8n'den geldiği gibi
            // kalmalı (frontend parseAiJson bekliyor), araya alan eklemek kırardı.
            // Chatbot "siteme ekle" gömme kodu bu Id'yi kullanır.
            if (resultId is not null)
            {
                Response.Headers["X-Result-Id"] = resultId.Value.ToString();
                Response.Headers["Access-Control-Expose-Headers"] = "X-Result-Id";
            }

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
            var content = MojibakeOnarici.Onar(await response.Content.ReadAsStringAsync(ct));

            /*
             * İş bitmişse sonucu kalıcılaştır.
             *
             * Çalıştırma anında açılan YER TUTUCU satırı bulup GÜNCELLİYORUZ —
             * yeni satır eklemiyoruz. Eskiden ekleniyordu ve her çalıştırma
             * Geçmiş Çıktılar'da biri boş görünen iki kayıt bırakıyordu.
             *
             * Yer tutucu bulunamazsa (yer tutucudan önceki eski çalıştırmalar)
             * eski davranışa düşülür: yeni satır eklenir.
             */
            if (AsyncJobHelper.TamamlandiMi(content))
            {
                var gercekCikti = AsyncJobHelper.GercekCiktiyiAyikla(content) ?? content;

                var yerTutucu = await db.ToolResults
                    .Where(r => r.UserId == CurrentUserId
                             && r.ToolId == toolId
                             && r.OutputJson.Contains("\"jobId\":\"" + jobId + "\""))
                    .FirstOrDefaultAsync(ct);

                if (yerTutucu is not null)
                {
                    // Arka plan servisi önce yazmış olabilir — o zaman dokunma
                    if (AsyncJobHelper.BekliyorMu(yerTutucu.OutputJson))
                    {
                        yerTutucu.OutputJson = gercekCikti;
                        await db.SaveChangesAsync(ct);
                    }
                }
                else
                {
                    var zatenVar = await db.ToolResults
                        .AnyAsync(r => r.UserId == CurrentUserId
                                    && r.ToolId == toolId
                                    && r.InputSummary != null && r.InputSummary.Contains(jobId), ct);

                    if (!zatenVar)
                    {
                        var fakePayload = System.Text.Json.JsonSerializer.Deserialize<JsonElement>(
                            $"{{\"job_id\":\"{jobId}\"}}");
                        await SaveToolResultAsync(CurrentUserId, toolId, fakePayload, gercekCikti, ct);
                    }
                }
            }

            return Content(content, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "n8n poll error for {ToolId}/{JobId}", toolId, jobId);
            return StatusCode(503, new { error = "Sonuç alınamadı. Lütfen tekrar deneyin." });
        }
    }

    /*
     * NOT: "tamamlandı mı?" ve "sarmalayıcıdan gerçek çıktıyı ayıkla" mantığı
     * AsyncJobHelper'a taşındı — aynı mantığı arka plan servisi (AsyncJobWatcher)
     * de kullanıyor ve iki kopyanın zamanla ayrışması kaçınılmazdı.
     */

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// <returns>Kaydedilen ToolResult Id'si; kayıt başarısızsa null.</returns>
    private async Task<Guid?> SaveToolResultAsync(
        Guid userId,
        string toolId,
        JsonElement payload,
        string outputJson,
        CancellationToken ct)
    {
        try
        {
            // İşletme adı ARTIK AÇIKÇA gönderiliyor (isletmeAdi alanı).
            //
            // Eskiden yalnızca prompt metni gelip regex ile "İşletme adı: X"
            // kalıbı aranıyordu; araçlar bu ifadeyi farklı yazdığı için çoğunda
            // eşleşmiyor ve özet olarak prompt'un ilk 120 karakteri
            // ("Sen bir pazarlama stratejisti…") kaydediliyordu. Yönetici
            // raporlarında hangi işletme için çalıştırıldığı anlaşılmıyordu.
            //
            // Alan yoksa eski davranışa düşülür (geriye dönük uyumluluk).
            var acikIsletmeAdi = TryGetString(payload, "isletmeAdi");

            string summary;
            if (!string.IsNullOrWhiteSpace(acikIsletmeAdi))
            {
                summary = acikIsletmeAdi[..Math.Min(acikIsletmeAdi.Length, 150)];
            }
            else
            {
                var summaryText =
                    TryGetString(payload, "prompt")     ??
                    TryGetString(payload, "videoDesc")  ??
                    TryGetString(payload, "videoUrl")   ??
                    CombineFields(payload, "biz", "sector") ??
                    "";
                summary = ExtractSummary(toolId, summaryText);
            }

            // Form bilgileri ham JSON olarak saklanır; yorumlamayı arayüz yapar.
            var formBilgileri = payload.ValueKind == JsonValueKind.Object
                                && payload.TryGetProperty("formBilgileri", out var fb)
                                && fb.ValueKind == JsonValueKind.Object
                ? fb.GetRawText()
                : null;

            var kayit = new ToolResult
            {
                UserId        = userId,
                ToolId        = toolId,
                InputSummary  = summary,
                OutputJson    = outputJson,
                FormBilgileri = formBilgileri,
            };
            db.ToolResults.Add(kayit);
            await db.SaveChangesAsync(ct);
            return kayit.Id;
        }
        catch (Exception ex)
        {
            // Saving history must not break the main request
            logger.LogWarning(ex, "Failed to save tool result for {ToolId}", toolId);
            return null;
        }
    }

    /// <summary>
    /// Gövdede onaylanmış sahne listesi var mı? n8n'deki "Onaylanmış plan mı?"
    /// düğümüyle AYNI sinyal: doluysa video üretimi, boşsa ücretsiz plan adımı.
    /// </summary>
    private static bool SahneleriIceriyorMu(JsonElement payload)
    {
        if (payload.ValueKind != JsonValueKind.Object) return false;
        return payload.TryGetProperty("sahneler", out var el)
            && el.ValueKind == JsonValueKind.Array
            && el.GetArrayLength() > 0;
    }

    /// <summary>
    /// n8n'den gelen gövde, günlük kota sınırının aşıldığını bildiren yanıt mı?
    /// Kota düğümü `_kotaDoldu: true` işaretini koyuyor. n8n 'lastNode' modunda
    /// yanıtı bazen tek nesne, bazen tek elemanlı dizi olarak döndürdüğü için
    /// ikisi de kontrol ediliyor.
    /// </summary>
    private static bool KotaYanitiMi(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return false;

        try
        {
            using var doc = JsonDocument.Parse(content);
            var kok = doc.RootElement;

            if (kok.ValueKind == JsonValueKind.Array)
                kok = kok.GetArrayLength() > 0 ? kok[0] : default;

            return kok.ValueKind == JsonValueKind.Object
                && kok.TryGetProperty("_kotaDoldu", out var v)
                && v.ValueKind == JsonValueKind.True;
        }
        catch (JsonException)
        {
            // Gövde JSON değilse kota yanıtı da değildir; normal akış devam etsin.
            return false;
        }
    }

    private static string? TryGetString(JsonElement el, string key) =>
        el.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()?.Trim()
            : null;

    private static string? CombineFields(JsonElement el, params string[] keys)
    {
        var parts = keys
            .Select(k => TryGetString(el, k))
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();
        return parts.Count > 0 ? string.Join(" — ", parts) : null;
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
