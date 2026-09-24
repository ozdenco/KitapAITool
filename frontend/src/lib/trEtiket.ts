/**
 * ASCII yazılmış Türkçe etiketleri düzeltir.
 *
 * NEDEN: Görünürlük Skoru prompt'u bir dönem seçenekleri ASCII olarak
 * istiyordu ("[Baslangic|Gelismekte|...]", "[Kritik|Iyilestir|Guclu]") ve
 * model bunları birebir döndürüyordu; ekranda "Gelismekte", "Guclu" diye
 * görünüyordu (28 Ağu 2026'da PDF çıktısında fark edildi).
 *
 * Prompt düzeltildi, ama ESKİ KAYITLAR bozuk metni taşıyor. Bu yüzden
 * düzeltme gösterim sırasında da uygulanıyor. Ayrıca model ara sıra
 * ASCII'ye kayarsa yine yakalanır.
 */
const TR_ETIKET: Record<string, string> = {
  Baslangic: 'Başlangıç',
  Gelismekte: 'Gelişmekte',
  Iyi: 'İyi',
  Mukemmel: 'Mükemmel',
  Iyilestir: 'İyileştir',
  Guclu: 'Güçlü',
}

/** Bilinen ASCII karşılığı varsa Türkçesini, yoksa değeri olduğu gibi döndürür. */
export function trEtiket(deger?: string): string {
  if (!deger) return ''
  return TR_ETIKET[deger.trim()] ?? deger
}
