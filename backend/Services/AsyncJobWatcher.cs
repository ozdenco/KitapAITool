using KolayKobi.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

/// <summary>
/// Sonucu beklenen async araç işlerini SUNUCU TARAFINDA takip eder.
///
/// NEDEN VAR:
/// Async araçlarda (icerik-takvimi, trend-video, video-uret) sonucu eskiden
/// yalnızca kullanıcının tarayıcısı yokluyordu. Kullanıcı sekmeyi kapatırsa
/// yoklama duruyor, sonuç hiçbir yere yazılmıyordu — video üretimi 2-5 dakika
/// sürdüğü için ödediği videoyu bir daha bulamıyordu (8 Eyl 2026).
///
/// NASIL ÇALIŞIR:
/// ToolsController çalıştırma anında bir YER TUTUCU satır açar
/// ({_bekliyor:true, jobId}). Bu servis o satırları bulup n8n'i yoklar ve iş
/// bitince AYNI satırı gerçek çıktıyla günceller. Kullanıcının tarayıcısı da
/// aynı satırı güncelleyebilir; hangisi önce görürse o yazar, ikisi de aynı
/// sonucu yazdığı için yarış zararsız.
///
/// Kullanım sayacı çalıştırma anında zaten işlendi — burada tekrar sayılmaz.
/// </summary>
public class AsyncJobWatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<AsyncJobWatcher> logger) : BackgroundService
{
    /// <summary>İki tarama arası bekleme.</summary>
    private static readonly TimeSpan TaramaAraligi = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Bu süreden eski yer tutucular ölü kabul edilir. Video üretimi en fazla
    /// birkaç dakika sürüyor; 2 saat fazlasıyla yeterli ve n8n'i sonsuza kadar
    /// yoklamamızı engelliyor.
    /// </summary>
    private static readonly TimeSpan VazgecmeSuresi = TimeSpan.FromHours(2);

    /// <summary>Tek taramada işlenecek en fazla iş — n8n'i boğmamak için.</summary>
    private const int TaramaBasinaEnFazla = 20;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("[AsyncJobWatcher] Servis başladı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await Task.Delay(TaramaAraligi, stoppingToken); }
            catch (OperationCanceledException) { break; }

            try
            {
                await TaraAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Tek bir tarama hatası servisi düşürmemeli
                logger.LogError(ex, "[AsyncJobWatcher] Tarama hatası.");
            }
        }
    }

    private async Task TaraAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db    = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var n8n   = scope.ServiceProvider.GetRequiredService<N8nProxyService>();
        var kredi = scope.ServiceProvider.GetRequiredService<VideoCreditService>();

        var enEski = DateTime.UtcNow - VazgecmeSuresi;

        // Yer tutucu satırlar. Alan adı sabit olduğu için metin araması yeterli;
        // ayrı bir tablo veya indeks açmaya değmeyecek kadar az kayıt oluyor.
        var bekleyenler = await db.ToolResults
            .Where(r => r.OutputJson.Contains("\"_bekliyor\":true")
                     && r.CreatedAt >= enEski)
            .OrderBy(r => r.CreatedAt)
            .Take(TaramaBasinaEnFazla)
            .ToListAsync(ct);

        if (bekleyenler.Count == 0) return;

        foreach (var kayit in bekleyenler)
        {
            var jobId = AsyncJobHelper.JobIdOku(kayit.OutputJson);
            if (string.IsNullOrWhiteSpace(jobId)) continue;

            try
            {
                var yanit = await n8n.PollJobAsync(kayit.ToolId, jobId, ct);
                if (!yanit.IsSuccessStatusCode) continue;

                var icerik = MojibakeOnarici.Onar(await yanit.Content.ReadAsStringAsync(ct));

                /*
                 * BAŞARISIZ İŞTE KREDİ İADESİ.
                 * Kredi, iş başlatıldığında düşülüyor. Üretim sonradan
                 * başarısız olursa kullanıcı hiç video almadan ödemiş olur —
                 * bu kabul edilemez, krediyi geri veriyoruz.
                 */
                if (AsyncJobHelper.HataMi(icerik))
                {
                    await kredi.IadeEtAsync(kayit.UserId, jobId, ct);
                    kayit.OutputJson = icerik;
                    logger.LogInformation(
                        "[AsyncJobWatcher] {ToolId}/{JobId} başarısız, kredi iade edildi.",
                        kayit.ToolId, jobId);
                    continue;
                }

                if (!AsyncJobHelper.TamamlandiMi(icerik)) continue;

                kayit.OutputJson = AsyncJobHelper.GercekCiktiyiAyikla(icerik) ?? icerik;
                logger.LogInformation(
                    "[AsyncJobWatcher] {ToolId}/{JobId} tamamlandı, kayıt güncellendi.",
                    kayit.ToolId, jobId);
            }
            catch (Exception ex)
            {
                // Bu iş bir sonraki taramada yeniden denenecek
                logger.LogWarning(ex,
                    "[AsyncJobWatcher] {ToolId}/{JobId} yoklanamadı.", kayit.ToolId, jobId);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
