using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

/// <summary>
/// Kullanıcının işletme künyesi. Araç formlarını ön-doldurmakta kullanılır.
/// Tüm alanlar isteğe bağlıdır.
/// </summary>
[ApiController]
[Route("api/users/me/business-profile")]
[Authorize]
public class BusinessProfileController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public record BusinessProfileDto(
        [MaxLength(160)] string? BusinessName,
        [MaxLength(120)] string? Sector,
        [MaxLength(120)] string? City,
        [MaxLength(2000)] string? ProductService,
        [MaxLength(1000)] string? TargetAudience,
        [MaxLength(200)] string? PriceSegment,
        [MaxLength(1000)] string? Strengths,
        [MaxLength(300)] string? Website,
        [MaxLength(300)] string? Instagram,
        [MaxLength(300)] string? LinkedIn,
        [MaxLength(300)] string? Facebook,
        [MaxLength(300)] string? YouTube,
        [MaxLength(300)] string? TikTok,
        [MaxLength(80)] string? BrandTone,
        [MaxLength(2000)] string? Notes,
        DateTime? UpdatedAt = null);

    /// <summary>GET — profil yoksa boş bir şablon döner (404 değil).</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var p = await db.BusinessProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == CurrentUserId, ct);

        return Ok(new { success = true, data = Donustur(p) });
    }

    /// <summary>PUT — kayıt yoksa oluşturur, varsa günceller.</summary>
    [HttpPut]
    public async Task<IActionResult> Upsert([FromBody] BusinessProfileDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            var hata = ModelState.Values.SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage).FirstOrDefault() ?? "Bilgiler geçersiz.";
            return BadRequest(new { success = false, error = hata });
        }

        var p = await db.BusinessProfiles.FirstOrDefaultAsync(x => x.UserId == CurrentUserId, ct);
        var yeniKayit = p is null;

        if (p is null)
        {
            p = new BusinessProfile { UserId = CurrentUserId };
            db.BusinessProfiles.Add(p);
        }

        p.BusinessName   = Temizle(dto.BusinessName);
        p.Sector         = Temizle(dto.Sector);
        p.City           = Temizle(dto.City);
        p.ProductService = Temizle(dto.ProductService);
        p.TargetAudience = Temizle(dto.TargetAudience);
        p.PriceSegment   = Temizle(dto.PriceSegment);
        p.Strengths      = Temizle(dto.Strengths);
        p.Website        = Temizle(dto.Website);
        p.Instagram      = Temizle(dto.Instagram);
        p.LinkedIn       = Temizle(dto.LinkedIn);
        p.Facebook       = Temizle(dto.Facebook);
        p.YouTube        = Temizle(dto.YouTube);
        p.TikTok         = Temizle(dto.TikTok);
        p.BrandTone      = Temizle(dto.BrandTone);
        p.Notes          = Temizle(dto.Notes);
        p.UpdatedAt      = DateTime.UtcNow;
        if (yeniKayit) p.CreatedAt = p.UpdatedAt;

        // İşletme adını Users tablosunda da güncel tut: oturum yanıtı ve
        // Dashboard hatırlatması bu alanı okuyor, ek istek atmasınlar.
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == CurrentUserId, ct);
        if (user is not null)
        {
            user.Company   = p.BusinessName;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        return Ok(new { success = true, data = Donustur(p) });
    }

    private static string? Temizle(string? deger) =>
        string.IsNullOrWhiteSpace(deger) ? null : deger.Trim();

    private static BusinessProfileDto Donustur(BusinessProfile? p) => new(
        p?.BusinessName, p?.Sector, p?.City, p?.ProductService, p?.TargetAudience,
        p?.PriceSegment, p?.Strengths, p?.Website, p?.Instagram, p?.LinkedIn,
        p?.Facebook, p?.YouTube, p?.TikTok, p?.BrandTone, p?.Notes, p?.UpdatedAt);
}
