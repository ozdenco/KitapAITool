/**
 * PLAN YANITI — sahne planını onaya sunar, ÜRETİM YAPMAZ
 * n8n düğümü: "Plan Yanıtı" (Code)
 *
 * Bu adım ücretsizdir: yalnızca bir Gemini çağrısı yapıldı. Kullanıcı
 * sahneleri okuyup onaylarsa ikinci bir istek üretim başlatacak.
 *
 * İngilizce prompt da döndürülüyor — kullanıcı orada uydurulmuş bir ürün
 * iddiasını veya eksik Türkçe repliği görebilsin diye.
 */

const p = $input.first().json;

if (p?.hata) {
  return [{ json: { _parseError: true, error: p.hata } }];
}

return [{ json: {
  _ok: true,
  asama: 'plan',
  sahneSayisi: p.sahneSayisi,
  sahneler: (p.sahneler || []).map((s, i) => ({
    sira: i + 1,
    aciklama: s.aciklama,
    prompt: s.prompt,
    zincirle: s.zincirle,
    /*
     * BU ÜÇ ALAN ŞART (11 Eyl 2026). Eskiden burada düşüyordu: frontend onaylanan
     * planı üretime AYNEN geri yolluyor, replik yoksa seslendirme yapılamıyor ve
     * videoda Veo'nun uydurduğu İngilizce konuşma kalıyordu.
     */
    replik: s.replik || '',
    konusan: s.konusan || '',
    efekt: s.efekt || '',
    // Rol adı ekranda gösteriliyor; ses profili üretime aynen geri dönmeli
    ton: s.ton || '',
    konusanEtiket: s.konusanEtiket || '',
    sesProfili: s.sesProfili || '',
  })),
} }];
