/**
 * VIDEO KAYNAĞI — link türünü belirler
 * n8n düğümü: "Video Kaynağı" (Code)
 * ─────────────────────────────────────────────────────────────────────────────
 * Gemini video girişini iki yolla kabul ediyor:
 *   - fileData   → YouTube linkini DOĞRUDAN okur, indirme gerekmez
 *   - inlineData → base64 video baytı; diğer tüm kaynaklar için
 *
 * TikTok/Instagram linkini Gemini açamıyor, o yüzden önce indirilmesi gerekiyor.
 * Bu düğüm hangi yolun kullanılacağına karar veriyor.
 */

const body = $('Webhook').first().json.body || $('Webhook').first().json;
const videoUrl = String(body.videoUrl || body.video_url || '').trim();

if (!videoUrl) {
  return [{ json: { hata: 'Video linki boş.' } }];
}

/*
 * SİTE OKUNAMADI + HİZMET BİLGİSİ YOK → SENARYO ÜRETİLMEZ (11 Eyl 2026).
 *
 * Allianz gibi büyük siteler sunucumuzdan gelen isteğe bot korumasıyla cevap
 * veriyor (Cloudflare "Just a moment..." sayfası, HTTP 403). Model o zaman
 * firmanın hiçbir hizmetini bilmeden senaryo yazıyordu ("Dayanak: ürün iddiası
 * yok") ve kullanıcı sitenin okunamadığını hiç görmüyordu. Özden'in kararı:
 * bu durumda senaryo üretilmez; kullanıcıya iki hizmet alanından birini
 * doldurması söylenir.
 *
 * Kontrol BURADA — Apify (Instagram/TikTok indirme, ücretli) çalışmadan önce.
 */
const siteAdresi = String(body.bizUrl || '').trim();
let siteMetni = '';
try {
  const scrape = $('Firma Scrape').first().json || {};
  siteMetni = String(scrape.data || scrape.body || '')
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
} catch (e) { siteMetni = ''; }

const ENGEL = /just a moment|access denied|forbidden|captcha|attention required|are you a robot|unusual traffic|request blocked|erişim engellendi/i;
const siteOkunamadi = Boolean(siteAdresi)
  && (siteMetni.length < 300 || ENGEL.test(siteMetni.slice(0, 600)));
const hizmetBilgisiVar = Boolean(String(body.hizmetler || '').trim() || String(body.note || '').trim());

if (siteOkunamadi && !hizmetBilgisiVar) {
  const alanAdi = siteAdresi.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];
  return [{ json: { hata:
    `Web sitenizden (${alanAdi}) hizmet bilgisi okunamadı — site otomatik erişime kapalı `
    + 'ya da içeriği boş görünüyor. Bu yüzden senaryo üretilmedi. '
    + '"Bu video hangi hizmet veya ürününüz için?" ya da "Sunduğunuz hizmet / ürün" '
    + 'alanlarından birini doldurup yeniden deneyin.' } }];
}

/*
 * Üç kaynak, üç yol:
 *   youtube   → Gemini linki doğrudan okur, indirme yok, maliyet sıfır
 *   instagram → apify/instagram-scraper (directUrls) ≈ $0.0027/reel
 *   tiktok    → clockworks/tiktok-video-scraper       ≈ $0.005/video
 * Son ikisi indirilip base64 olarak Gemini'ye gidiyor.
 */
const youtubeMu   = /(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/i.test(videoUrl);
const instagramMi = /instagram\.com\/(?:reel|reels|p|tv)\//i.test(videoUrl);

const platform = youtubeMu ? 'youtube' : instagramMi ? 'instagram' : 'tiktok';

// siteOkunamadi prompt düğümlerine gidiyor: engelleme sayfasının metni firma bilgisi sanılmasın
return [{ json: { ...body, videoUrl, platform, siteOkunamadi } }];
