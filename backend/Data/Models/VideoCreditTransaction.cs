namespace KolayKobi.Api.Data.Models;

/// <summary>
/// Video kredisi hareketi — cüzdan bir DEFTER olarak tutuluyor.
///
/// NEDEN BAKİYE ALANI DEĞİL: kredi gerçek para karşılığı. Tek bir sayıyı
/// artırıp azaltmak, "bu kredi nereye gitti?" sorusunu cevapsız bırakır ve
/// hatalı bir düşümü geri almanın yolu kalmaz. Her hareket satır olarak
/// yazılıyor; bakiye = Delta toplamı.
///
/// Kullanıcı sayısı ve hareket adedi bu ölçekte küçük olduğu için toplamı
/// her seferinde hesaplamak sorun değil; ölçek büyürse User üzerinde
/// önbelleklenmiş bir bakiye eklenebilir (defter yine kaynak olur).
///
/// Video kredisi, araç kullanım hakkından AYRI bir cüzdandır (4 Eyl 2026'da
/// kararlaştırıldı): araç çalıştırmaları kuruş, video üretimi dolar
/// mertebesinde; aynı birimde toplanırsa ikisinin de anlamı bozulur.
/// </summary>
public class VideoCreditTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    /// <summary>Pozitif = yükleme, negatif = harcama. 1 kredi = 8 saniyelik bir sahne.</summary>
    public int Delta { get; set; }

    /// <summary>Makine tarafından okunan sebep kodu — bkz. <see cref="KrediSebepleri"/>.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>İlgili kayıt: üretim işi kimliği, ödeme siparişi vb. Denetim için.</summary>
    public string? RefId { get; set; }

    /// <summary>Kullanıcıya gösterilecek kısa açıklama.</summary>
    public string? Aciklama { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}

/// <summary>Defterdeki sebep kodları. Sorgular bu sabitlere dayanıyor, elle yazmayın.</summary>
public static class KrediSebepleri
{
    /// <summary>Satın alınan kredi paketi.</summary>
    public const string SatinAlma = "satin-alma";

    /// <summary>Hak edilen ücretsiz önizleme (ücretsiz planda ömür boyu 1, paketlide ayda 1).</summary>
    public const string UcretsizOnizleme = "ucretsiz-onizleme";

    /// <summary>Video üretimi için harcama.</summary>
    public const string VideoUretim = "video-uretim";

    /// <summary>Başarısız üretim sonrası iade.</summary>
    public const string Iade = "iade";

    /// <summary>Yönetici tarafından elle yükleme.</summary>
    public const string YoneticiYukleme = "yonetici-yukleme";
}
