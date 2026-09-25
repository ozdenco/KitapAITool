using System.Security.Claims;
using KolayKobi.Api.Data.Models;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KolayKobi.Api.Controllers;

/// <summary>
/// Video kredisi cüzdanı uçları.
///
/// Kredi, araç kullanım hakkından ayrı bir birim: 1 kredi = 8 saniyelik bir
/// sahne. Ayrı tutulmasının sebebi maliyet mertebesi — araç çalıştırmak
/// kuruşlar, video üretmek klip başına ~$0.40.
/// </summary>
[ApiController]
[Route("api/video-credits")]
[Authorize]
public class VideoCreditsController(VideoCreditService kredi) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// GET /api/video-credits/me — bakiye ve son hareketler.
    ///
    /// Hak edilmiş ücretsiz önizleme burada da veriliyor: kullanıcı cüzdanını
    /// açtığında hakkını görsün, üretime kalkışıp "krediniz yok" duvarına
    /// çarpmasın.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> Bakiyem(CancellationToken ct)
    {
        var userId = CurrentUserId;
        await kredi.UcretsizHakkiVerAsync(userId, ct);

        var sinirsiz  = await kredi.SinirsizMiAsync(userId, ct);
        var bakiye    = await kredi.BakiyeAsync(userId, ct);
        var hareketler = await kredi.HareketlerAsync(userId, 20, ct);

        return Ok(new
        {
            success = true,
            data = new
            {
                bakiye,
                sinirsiz,
                hareketler = hareketler.Select(h => new
                {
                    h.Id,
                    h.Delta,
                    h.Reason,
                    h.Aciklama,
                    h.CreatedAt,
                }),
            },
        });
    }
}

/// <summary>Yönetici tarafı — kredi yükleme.</summary>
[ApiController]
[Route("api/admin/video-credits")]
[Authorize(Policy = "AdminOnly")]
public class AdminVideoCreditsController(VideoCreditService kredi) : ControllerBase
{
    /// <summary>POST /api/admin/video-credits/grant — bir kullanıcıya kredi yükler.</summary>
    [HttpPost("grant")]
    public async Task<IActionResult> Yukle(
        [FromBody] KrediYuklemeIstegi istek,
        CancellationToken ct)
    {
        if (istek.Adet <= 0 || istek.Adet > 500)
            return BadRequest(new { error = "Adet 1 ile 500 arasında olmalı." });

        await kredi.YukleAsync(
            istek.UserId,
            istek.Adet,
            KrediSebepleri.YoneticiYukleme,
            aciklama: istek.Aciklama ?? $"Yönetici {istek.Adet} kredi yükledi",
            ct: ct);

        var bakiye = await kredi.BakiyeAsync(istek.UserId, ct);
        return Ok(new { success = true, data = new { bakiye } });
    }
}

public record KrediYuklemeIstegi(Guid UserId, int Adet, string? Aciklama);
