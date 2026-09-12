/**
 * YANIT — medya servisinin iş kimliğini kullanıcıya döndürür
 * n8n düğümü: "Yanıt" (Code)
 *
 * Video üretimi 2-5 dakika sürüyor; burada beklemiyoruz. Kullanıcı iş
 * kimliğini alıyor, frontend durum ucunu yokluyor.
 */

/*
 * PLANI HANGİ DALDAN OKUYACAĞIZ?
 *
 * Bu düğüme İKİ ayrı yoldan geliniyor:
 *   • Onaylanmış plan  → Webhook → Hazır Plan → Medya Video Üret → Yanıt
 *   • (eski tek adımlı) → Veo Prompt İste → Sahneleri Ayıkla → ... → Yanıt
 *
 * Eskiden burada doğrudan $('Sahneleri Ayıkla') okunuyordu. Onay dalında o
 * düğüm HİÇ ÇALIŞMADIĞI için n8n "Node 'Sahneleri Ayıkla' hasn't been
 * executed" hatası fırlatıyor ve workflow 500 dönüyordu (8 Eyl 2026).
 *
 * Kritik ayrıntı: video O SIRADA ZATEN ÜRETİLMİŞ oluyordu — Veo parası
 * harcanıyor, kullanıcı "araç kullanılamıyor" hatası görüyor ve videoya
 * ulaşamıyordu. Yanıt üretimi asla üretimi geçersiz kılmamalı.
 *
 * Çözüm: çalışmış olan dalı dene, olmazsa diğerini, ikisi de yoksa boş geç.
 * Plan açıklaması yalnızca "şu an ne üretiliyor" metni için; yokluğu
 * yanıtı bozmamalı.
 */
function planOku() {
  for (const ad of ['Hazır Plan', 'Sahneleri Ayıkla']) {
    try {
      const j = $(ad).first().json;
      if (j && Array.isArray(j.sahneler)) return j;
    } catch (e) { /* bu dal çalışmadı, diğerine bak */ }
  }
  return { sahneler: [] };
}

const medya = $input.first().json;
const plan  = planOku();

if (!medya?.isId) {
  return [{ json: {
    _parseError: true,
    error: medya?.error || 'Video üretimi başlatılamadı.',
  } }];
}

return [{ json: {
  _ok: true,
  isId: medya.isId,
  sahneSayisi: medya.sahneSayisi,
  tahminiSaniye: medya.tahminiSaniye,
  // Kullanıcıya "şu an ne üretiliyor" derken Türkçe göstermek için
  sahneler: (plan.sahneler || []).map((s, i) => ({ sira: i + 1, aciklama: s.aciklama })),
} }];
