using System.Text;

namespace KolayKobi.Api.Services;

/// <summary>
/// Yapay zeka yanıtlarında aralıklı olarak görülen kodlama bozulmasını onarır.
///
/// SORUN (28 Ağu 2026): Müşteri Persona çıktısında Türkçe harfler Çince
/// karakterlere dönüşmüş olarak geldi — "Ayşe Hanım" → "Ay艧e Han谋m",
/// "İlkokul öğretmeni" → "陌lkokul 枚臒retmeni".
///
/// Desen tutarlı: UTF-8 baytları GBK (kod sayfası 936) olarak çözülmüş.
///   ı = U+0131 → UTF-8 C4 B1 → GBK'de 谋
///   ş = U+015F → UTF-8 C5 9F → GBK'de 艧
///   ö = U+00F6 → UTF-8 C3 B6 → GBK'de 枚
///
/// Bu işlem geri döndürülebilir: metni tekrar GBK baytlarına çevirip
/// UTF-8 olarak okumak orijinali verir.
///
/// KISMİ BOZULMA (19 Eyl 2026): Rakip Analiz çıktısında yalnızca TEK bir harf
/// bozuldu — "hâlâ" → "h芒l芒" (â = C3 A2, GBK'de 芒) — metnin geri kalanındaki
/// ı, ş, ğ, ö, ç doğruydu. Onarım metnin TAMAMINA uygulanınca bu doğru harfler
/// yok oluyordu: GBK'de ı, İ, ş, Ş, ğ, Ğ, ö, Ö, ç, Ç KARŞILIĞI YOK, hepsi '?'
/// oluyor. Sonuç "s?n?rl?; ��r��n a??klamas?" gibi çıkıyor, yani onarım
/// bozulmadan beterdi. Güvenlik kontrolü bunu yakalayıp onarımı reddediyordu,
/// dolayısıyla kullanıcı '芒' görmeye devam ediyordu.
///
/// Bu yüzden onarım artık metnin tamamına değil, YALNIZCA bitişik bozuk
/// parçalara uygulanıyor. Sağlam Türkçe harflere hiç dokunulmuyor.
///
/// KÖK NEDEN BURADA DEĞİL. n8n doğru charset (utf-8) bildiriyor ve arka
/// arkaya yapılan testlerde sorun tekrarlanmadı — 500+ kayıttan yalnızca
/// biri bozuktu. Bozulma yukarıda, MiniMax yanıtının okunmasında oluşuyor.
/// Bu sınıf kullanıcıyı bozuk çıktıdan korur; asıl düzeltme n8n/MiniMax
/// tarafında yapılmalıdır.
/// </summary>
public static class MojibakeOnarici
{
    private const int GbkKodSayfasi = 936;

    /// <summary>Kod sayfası sağlayıcısı bir kez kaydedilir (Program.cs çağırır).</summary>
    public static void Hazirla() =>
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

    /// <summary>
    /// Bozulma varsa onarır, yoksa metni olduğu gibi döndürür.
    /// Hiçbir durumda istisna fırlatmaz — onarım başarısızsa özgün metin döner.
    /// </summary>
    public static string Onar(string? metin)
    {
        if (string.IsNullOrEmpty(metin)) return metin ?? "";
        if (!BozulmaSuphesi(metin)) return metin;

        try
        {
            var gbk = Encoding.GetEncoding(GbkKodSayfasi);
            var sonuc = new StringBuilder(metin.Length);
            var i = 0;

            while (i < metin.Length)
            {
                if (!SupheliKarakter(metin[i]))
                {
                    // Sağlam karakter — Türkçe harfler dahil, olduğu gibi kalır.
                    sonuc.Append(metin[i++]);
                    continue;
                }

                // Bitişik bozuk parçayı bir bütün olarak çevir: tek karakter
                // yerine parça almak, birden çok bayttan oluşan dizileri
                // (ör. "枚臒" → "öğ") doğru çözer.
                var bas = i;
                while (i < metin.Length && SupheliKarakter(metin[i])) i++;

                var parca = metin[bas..i];
                var onarilmis = Encoding.UTF8.GetString(gbk.GetBytes(parca));
                sonuc.Append(ParcaDahaIyiMi(onarilmis) ? onarilmis : parca);
            }

            return sonuc.ToString();
        }
        catch
        {
            return metin;   // kod sayfası yoksa veya çevrilemezse özgün metin
        }
    }

    /// <summary>
    /// Türkçe içerikte CJK karakter beklenmez; varsa bozulma şüphesi doğar.
    /// Hızlı bir ön eleme — metinlerin ezici çoğunluğu buradan geçmeden döner.
    /// </summary>
    private static bool BozulmaSuphesi(string metin)
    {
        foreach (var c in metin)
            if (SupheliKarakter(c)) return true;
        return false;
    }

    /// <summary>
    /// Türkçe içerikte CJK/Hangul/Kana beklenmez; bu karakterler bozulmuş
    /// sayılır. Gerçekten Çince bir kelime geçiyorsa GBK çevrimi geçerli
    /// UTF-8 üretmez, <see cref="ParcaDahaIyiMi"/> onarımı reddeder.
    /// </summary>
    private static bool SupheliKarakter(char c) =>
        (c >= '一' && c <= '鿿') ||
        (c >= '぀' && c <= 'ヿ') ||
        (c >= '가' && c <= '힯');

    /// <summary>
    /// Onarılmış parça kabul edilebilir mi? Üç ölçüt:
    ///  1. Boş olmamalı
    ///  2. Bozuk karakter (U+FFFD) getirmemeli — geçersiz UTF-8 demektir
    ///  3. Geriye hiç şüpheli karakter kalmamalı — kaldıysa çözüm tutmamıştır
    /// </summary>
    private static bool ParcaDahaIyiMi(string onarilmis)
    {
        if (onarilmis.Length == 0) return false;
        if (onarilmis.Contains('�')) return false;

        foreach (var c in onarilmis)
            if (SupheliKarakter(c)) return false;

        return true;
    }
}
