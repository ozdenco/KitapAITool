/**
 * DURUM YANITI — medya servisinin iş durumunu frontend'e uygun hale getirir
 * n8n düğümü: "Durum Yanıtı" (Code)
 *
 * Medya servisi Türkçe durum döndürüyor (calisiyor/bitti/hata). Frontend'in
 * beklediği sözleşmeye çeviriyoruz; video adresini de tam URL yapıyoruz.
 */

const d = $input.first().json;

if (!d || d.error) {
  return [{ json: { status: 'error', error: d?.error || 'İş bulunamadı' } }];
}

if (d.durum === 'hata') {
  return [{ json: { status: 'error', error: d.hata || 'Video üretilemedi', gecenSaniye: d.gecenSaniye } }];
}

if (d.durum === 'bitti') {
  return [{ json: {
    status: 'completed',
    videoUrl: d.sonuc?.url || null,
    klipSayisi: d.sonuc?.klipSayisi,
    bayt: d.sonuc?.bayt,
    gecenSaniye: d.gecenSaniye,
  } }];
}

return [{ json: {
  status: 'processing',
  ilerleme: d.ilerleme,
  sahneSayisi: d.sahneSayisi,
  gecenSaniye: d.gecenSaniye,
} }];
