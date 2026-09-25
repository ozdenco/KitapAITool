namespace KolayKobi.Api.Data.Models;

/// <summary>
/// Kullanıcının işletme künyesi — araç formlarını ön-doldurmak için.
///
/// NEDEN AYRI TABLO: Araçların 11'i "işletme adı" ve "sektör", 5'i "hedef
/// kitle", 4'ü "hizmet/ürün" soruyor. Kullanıcı aynı bilgiyi her araçta
/// yeniden yazıyordu. Bu alanları Users tablosuna eklemek kullanıcı
/// tablosunu 14 sütun şişirirdi; ayrı tablo hem temiz kalır hem de ileride
/// "sektöre göre kullanım" gibi raporları kolaylaştırır.
///
/// TÜM ALANLAR İSTEĞE BAĞLIDIR. Boş bırakılan alan, ilgili araçta
/// kullanıcıya sorulmaya devam eder.
/// </summary>
public class BusinessProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Sahibi. Kullanıcı başına en fazla bir profil bulunur.</summary>
    public Guid UserId { get; set; }
    public User? User { get; set; }

    // ── Temel (11 aracın tamamında kullanılır) ────────────────────────────────
    public string? BusinessName { get; set; }
    public string? Sector { get; set; }
    public string? City { get; set; }

    // ── İşiniz ────────────────────────────────────────────────────────────────
    /// <summary>Sunulan hizmet veya ürünün açıklaması (4 araç).</summary>
    public string? ProductService { get; set; }
    /// <summary>Hedef kitle / müşteri profili (5 araç).</summary>
    public string? TargetAudience { get; set; }
    /// <summary>Fiyat aralığı veya segmenti (3 araç).</summary>
    public string? PriceSegment { get; set; }
    /// <summary>Rakiplerden ayrışan yönler (2 araç).</summary>
    public string? Strengths { get; set; }

    // ── Dijital varlıklar ─────────────────────────────────────────────────────
    public string? Website { get; set; }
    public string? Instagram { get; set; }
    public string? LinkedIn { get; set; }
    public string? Facebook { get; set; }
    public string? YouTube { get; set; }
    public string? TikTok { get; set; }

    // ── Tercihler ─────────────────────────────────────────────────────────────
    /// <summary>Marka tonu — İçerik Takvimi'nde kullanılır.</summary>
    public string? BrandTone { get; set; }
    /// <summary>Araç promptlarına eklenecek serbest not.</summary>
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
