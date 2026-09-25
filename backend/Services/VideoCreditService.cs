using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

/// <summary>
/// Video kredisi cüzdanı.
///
/// 1 kredi = 1 klip (8 sn, Veo 3.1 Lite 720p). Ham maliyet ~$0.40, yani araç
/// çalıştırmalarından iki mertebe pahalı — bu yüzden araç kullanım hakkından
/// AYRI bir cüzdan (4 Eyl 2026'da kararlaştırıldı).
///
/// ÜCRETSİZ ÖNİZLEME, ayrı bir kavram değil; hak edildiğinde deftere +1
/// kredilik bir YÜKLEME olarak yazılıyor. Böylece harcama tarafı tek tip
/// kalıyor (her zaman bakiyeden düşer) ve "bu kullanıcı ücretsiz hakkını ne
/// zaman kullandı?" sorusu defterden cevaplanabiliyor.
///   • Ücretsiz plan  → hesap başına ÖMÜR BOYU 1
///   • Paketli plan   → AYDA 1 (+ satın alınan krediler)
/// Sınırsız bırakılmamasının sebebi: 100 ücretsiz kullanıcı × 2 deneme ≈
/// $80/ay, karşılığı sıfır gelir.
/// </summary>
public class VideoCreditService(AppDbContext db, ILogger<VideoCreditService> logger)
{
    /// <summary>Hak edilen ücretsiz önizleme başına verilen kredi.</summary>
    private const int UcretsizOnizlemeKredisi = 1;

    /// <summary>Kullanıcının harcanabilir kredi bakiyesi.</summary>
    public async Task<int> BakiyeAsync(Guid userId, CancellationToken ct = default)
    {
        return await db.VideoCreditTransactions
            .Where(t => t.UserId == userId)
            .SumAsync(t => (int?)t.Delta, ct) ?? 0;
    }

    /// <summary>
    /// Hak edilmiş ama henüz verilmemiş ücretsiz önizlemeyi deftere yazar.
    ///
    /// Bakiye sorgulanmadan ÖNCE çağrılmalı; aksi halde hakkı olan kullanıcı
    /// "krediniz yok" uyarısı görür.
    /// </summary>
    /// <returns>Verildiyse true.</returns>
    public async Task<bool> UcretsizHakkiVerAsync(Guid userId, CancellationToken ct = default)
    {
        var sinirsizMi = await SinirsizMiAsync(userId, ct);
        if (sinirsizMi) return false;   // admin/kurumsal — krediye tabi değil

        var paketliMi = await PaketliMiAsync(userId, ct);

        var sorgu = db.VideoCreditTransactions
            .Where(t => t.UserId == userId && t.Reason == KrediSebepleri.UcretsizOnizleme);

        if (paketliMi)
        {
            // Paketli: ayda bir
            var ayBasi = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            if (await sorgu.AnyAsync(t => t.CreatedAt >= ayBasi, ct)) return false;
        }
        else
        {
            // Ücretsiz plan: ömür boyu bir
            if (await sorgu.AnyAsync(ct)) return false;
        }

        db.VideoCreditTransactions.Add(new VideoCreditTransaction
        {
            UserId    = userId,
            Delta     = UcretsizOnizlemeKredisi,
            Reason    = KrediSebepleri.UcretsizOnizleme,
            Aciklama  = paketliMi ? "Bu ayki ücretsiz önizlemeniz" : "Ücretsiz deneme kredisi",
        });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("[Kredi] {UserId} ücretsiz önizleme kredisi aldı (paketli={Paketli})",
            userId, paketliMi);
        return true;
    }

    /// <summary>
    /// Krediyi harcar. Bakiye yetmiyorsa hiçbir şey yazmaz ve false döner.
    ///
    /// Harcama, üretim İSTEĞİ n8n tarafından kabul edildikten sonra yapılmalı;
    /// başlamayan bir iş için kredi düşmek kullanıcıyı haksız yere cezalandırır.
    /// İş sonradan başarısız olursa <see cref="IadeEtAsync"/> geri yükler.
    /// </summary>
    public async Task<bool> HarcaAsync(
        Guid userId, int adet, string? refId, CancellationToken ct = default)
    {
        if (adet <= 0) return true;
        if (await SinirsizMiAsync(userId, ct)) return true;   // admin/kurumsal

        var bakiye = await BakiyeAsync(userId, ct);
        if (bakiye < adet)
        {
            logger.LogWarning("[Kredi] {UserId} yetersiz bakiye: {Bakiye} < {Adet}", userId, bakiye, adet);
            return false;
        }

        db.VideoCreditTransactions.Add(new VideoCreditTransaction
        {
            UserId   = userId,
            Delta    = -adet,
            Reason   = KrediSebepleri.VideoUretim,
            RefId    = refId,
            Aciklama = $"{adet} sahnelik video üretimi",
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Başarısız üretimin kredisini geri yükler.
    /// Aynı iş için iki kez iade yapılmaz — <paramref name="refId"/> kontrol edilir.
    /// </summary>
    public async Task IadeEtAsync(Guid userId, string refId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refId)) return;

        var zatenIade = await db.VideoCreditTransactions
            .AnyAsync(t => t.UserId == userId
                        && t.RefId == refId
                        && t.Reason == KrediSebepleri.Iade, ct);
        if (zatenIade) return;

        var harcanan = await db.VideoCreditTransactions
            .Where(t => t.UserId == userId
                     && t.RefId == refId
                     && t.Reason == KrediSebepleri.VideoUretim)
            .SumAsync(t => (int?)t.Delta, ct) ?? 0;

        if (harcanan >= 0) return;   // harcama yok, iade edilecek bir şey de yok

        db.VideoCreditTransactions.Add(new VideoCreditTransaction
        {
            UserId   = userId,
            Delta    = -harcanan,             // negatifin tersi → pozitif
            Reason   = KrediSebepleri.Iade,
            RefId    = refId,
            Aciklama = "Video üretilemedi, kredi iade edildi",
        });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("[Kredi] {UserId} için {Adet} kredi iade edildi (iş {RefId})",
            userId, -harcanan, refId);
    }

    /// <summary>Yönetici veya satın alma sonrası kredi yükler.</summary>
    public async Task YukleAsync(
        Guid userId, int adet, string reason, string? refId = null,
        string? aciklama = null, CancellationToken ct = default)
    {
        if (adet <= 0) return;

        db.VideoCreditTransactions.Add(new VideoCreditTransaction
        {
            UserId   = userId,
            Delta    = adet,
            Reason   = reason,
            RefId    = refId,
            Aciklama = aciklama ?? $"{adet} kredi yüklendi",
        });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Son hareketler — kullanıcıya cüzdan geçmişi göstermek için.</summary>
    public async Task<List<VideoCreditTransaction>> HareketlerAsync(
        Guid userId, int adet = 20, CancellationToken ct = default)
    {
        return await db.VideoCreditTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(adet)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Admin ve sınırsız planlar krediye tabi değil — test ve demo yaparken
    /// cüzdan doldurmakla uğraşılmasın.
    /// </summary>
    public async Task<bool> SinirsizMiAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return false;
        if (user.IsAdmin) return true;

        var abonelik = await db.Subscriptions.AsNoTracking()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        // Plan limiti null → sınırsız (kurumsal)
        return abonelik?.Plan is { UsagePerToolPerMonth: null };
    }

    private async Task<bool> PaketliMiAsync(Guid userId, CancellationToken ct)
    {
        var abonelik = await db.Subscriptions.AsNoTracking()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (abonelik is null) return false;
        if (abonelik.ExpiresAt is { } bitis && bitis < DateTime.UtcNow) return false;

        // "Ücretsiz" plan paketli sayılmaz
        return abonelik.Plan is not null && abonelik.Plan.PriceMonthly > 0;
    }
}
