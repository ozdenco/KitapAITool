/**
 * Araç promptlarına eklenen ortak marka kuralları.
 *
 * KAYNAK: Kolay KOBİ Marka Brief'i (27 Ağu 2026).
 *
 * NEDEN GEREKLİ: Araçlar müşterinin kendi adına yayımlayacağı pazarlama
 * metni üretiyor. Model kendiliğinden "sonuç garantisi veriyoruz",
 * "bir gecede" gibi ifadeler kurabilir; bu hem brief'in açıkça yasakladığı
 * bir dil hem de temellendirilemeyen ticari vaat riski taşır.
 *
 * Bu metin her aracın prompt'unun SONUNA eklenir; oradaki araca özel
 * kurallardan sonra gelir ve onları ezmez.
 *
 * 28 Ağu 2026'da KISALTILDI: ilk sürüm 84 kelimeydi ve persona prompt'unu
 * %62 büyütüyordu (2 → 3 token). Ton tavsiyeleri zaten araç promptlarında
 * yer aldığı için çıkarıldı; bağlayıcı olan yasaklı ifade listesi korundu.
 */

const ORTAK = `
YAZIM KURALLARI:
- Abartılı vaat KULLANMA: "garanti", "kesin sonuç", "bir gecede", "sihirli", "%100". Gerçekçi ve koşullu yaz.
- Sade Türkçe, jargonsuz, "siz" dili; somut ve uygulanabilir ol.`

const RAKIP_KURALI = `
- Rakip marka adı zikretme.`

/**
 * @param rakipAdlariSerbest Rakip Analiz aracı gibi, işi gereği rakip
 *   adlarıyla çalışan araçlar için true verin — aksi hâlde araç işlevini
 *   yerine getiremez.
 */
export function markaKurallari(rakipAdlariSerbest = false): string {
  return rakipAdlariSerbest ? ORTAK : ORTAK + RAKIP_KURALI
}
