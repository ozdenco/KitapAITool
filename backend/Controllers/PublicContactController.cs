using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KolayKobi.Api.Controllers;

/// <summary>
/// Kurumsal talep formunun AÇIK ucu — üyelik gerektirmez.
///
/// Kimlik doğrulaması olmadığı için spam'e açıktır; bu yüzden
/// IP başına saatlik gönderim sınırı ve bir honeypot alanı vardır.
/// </summary>
[ApiController]
[Route("api/public/iletisim")]
[AllowAnonymous]
public class PublicContactController(
    EmailService email,
    ILogger<PublicContactController> logger) : ControllerBase
{
    /// <summary>Aynı IP'den saatte kabul edilen en fazla talep.</summary>
    private const int SaatlikSinir = 3;

    // IP → (pencere başlangıcı, sayaç). Tek sunucu için yeterli; birden fazla
    // örneğe çıkıldığında Redis'e taşınmalı.
    private static readonly ConcurrentDictionary<string, (DateTime Pencere, int Sayi)> Gecmis = new();

    public class KurumsalTalepDto
    {
        [Required(ErrorMessage = "Ad soyad zorunludur.")]
        [StringLength(120, MinimumLength = 2, ErrorMessage = "Ad soyad 2-120 karakter olmalıdır.")]
        public string AdSoyad { get; set; } = "";

        [StringLength(160, ErrorMessage = "Şirket adı en fazla 160 karakter olabilir.")]
        public string? Sirket { get; set; }

        [Required(ErrorMessage = "E-posta zorunludur.")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin.")]
        [StringLength(200)]
        public string Eposta { get; set; } = "";

        [StringLength(30, ErrorMessage = "Telefon en fazla 30 karakter olabilir.")]
        public string? Telefon { get; set; }

        [Required(ErrorMessage = "İhtiyaçlarınızı yazın.")]
        [StringLength(4000, MinimumLength = 10, ErrorMessage = "İhtiyaç açıklaması 10-4000 karakter olmalıdır.")]
        public string Ihtiyac { get; set; } = "";

        /// <summary>
        /// Honeypot — ekranda gizli tutulur, gerçek kullanıcı doldurmaz.
        /// Doluysa istek sessizce başarılı sayılır ama e-posta gönderilmez.
        /// </summary>
        public string? Website { get; set; }
    }

    /// <summary>POST /api/public/iletisim/kurumsal-talep</summary>
    [HttpPost("kurumsal-talep")]
    public async Task<IActionResult> KurumsalTalep([FromBody] KurumsalTalepDto dto)
    {
        if (!ModelState.IsValid)
        {
            var ilkHata = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault() ?? "Form bilgileri geçersiz.";
            return BadRequest(new { success = false, error = ilkHata });
        }

        // Honeypot: bot doldurmuş. Başarılı gibi dön, hiçbir şey yapma.
        if (!string.IsNullOrWhiteSpace(dto.Website))
        {
            logger.LogInformation("Kurumsal talep honeypot tetiklendi, istek yok sayıldı.");
            return Ok(new { success = true });
        }

        if (SinirAsildi(IstemciIp()))
        {
            return StatusCode(429, new
            {
                success = false,
                error = "Çok fazla talep gönderdiniz. Lütfen bir saat sonra tekrar deneyin.",
            });
        }

        try
        {
            await email.SendKurumsalTalepAsync(
                dto.AdSoyad.Trim(),
                dto.Sirket?.Trim(),
                dto.Eposta.Trim(),
                dto.Telefon?.Trim(),
                dto.Ihtiyac.Trim());

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Kurumsal talep e-postası gönderilemedi.");
            return StatusCode(500, new
            {
                success = false,
                error = "Talebiniz şu anda iletilemedi. Lütfen merhaba@kolaykobi.com adresine yazın.",
            });
        }
    }

    /// <summary>Ters proxy arkasında gerçek ziyaretçi IP'si.</summary>
    private string IstemciIp()
    {
        var iletilen = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(iletilen))
        {
            // "istemci, proxy1, proxy2" — ilki gerçek ziyaretçi
            var ilk = iletilen.Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(ilk)) return ilk;
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "bilinmiyor";
    }

    private static bool SinirAsildi(string ip)
    {
        var simdi = DateTime.UtcNow;

        // Süresi dolmuş kayıtları temizle (sözlük sınırsız büyümesin)
        foreach (var (anahtar, deger) in Gecmis)
        {
            if (simdi - deger.Pencere > TimeSpan.FromHours(1)) Gecmis.TryRemove(anahtar, out _);
        }

        var guncel = Gecmis.AddOrUpdate(
            ip,
            _ => (simdi, 1),
            (_, mevcut) => simdi - mevcut.Pencere > TimeSpan.FromHours(1)
                ? (simdi, 1)
                : (mevcut.Pencere, mevcut.Sayi + 1));

        return guncel.Sayi > SaatlikSinir;
    }
}
