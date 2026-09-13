/**
 * DURUM YANITI — medya servisinin iş durumunu frontend'e uygun hale getirir
 * n8n düğümü: "Durum Yanıtı" (Code)
 *
 * Medya servisi Türkçe durum döndürüyor (calisiyor/bitti/hata). Frontend'in
 * beklediği sözleşmeye çeviriyoruz; video adresini de tam URL yapıyoruz.
 */

const d = $input.first().json;

/*
 * HATA METNİ STRING OLMALI (13 Eyl 2026). "İş Durumu" düğümü
 * onError:continueRegularOutput ile çalışıyor; medya servisi işi tanımazsa
 * (servis yeniden başladı ya da eski bir iş numarası yoklanıyor) n8n buraya
 * koca bir AxiosError NESNESİ koyuyor ve biz onu olduğu gibi geçiriyorduk.
 * Frontend bu alanı doğrudan ekrana basıyor (⚠️ {videoHata}) ve string
 * bekliyor; nesne gelince hata kutusu çöküyor, kullanıcı "İş bulunamadı"
 * yerine bozuk bir ekran görüyor. Medya servisinin kendi Türkçe mesajını
 * nesnenin içinden çıkarıp geçiriyoruz.
 */
const hataMetni = (h) => {
  if (!h) return '';
  if (typeof h === 'string') return h.trim();
  // Gerçek yanıtta iç JSON kaçırılmış geliyor: {\"error\":\"İş bulunamadı\"}
  // Önce kaçışı çöz, sonra medya servisinin kendi mesajını al.
  const ham = String(h.message || h.error || '').replace(/\\+"/g, '"');
  const ic = ham.match(/"error"\s*:\s*"([^"]+)"/);
  if (ic) return ic[1];
  if (/\b404\b/.test(ham)) return 'İş bulunamadı — üretim kaydı silinmiş olabilir.';
  return 'Video durumu alınamadı, lütfen tekrar deneyin.';
};

if (!d || d.error) {
  return [{ json: { status: 'error', error: hataMetni(d?.error) || 'İş bulunamadı' } }];
}

if (d.durum === 'hata') {
  return [{ json: { status: 'error', error: hataMetni(d.hata) || 'Video üretilemedi', gecenSaniye: d.gecenSaniye } }];
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
