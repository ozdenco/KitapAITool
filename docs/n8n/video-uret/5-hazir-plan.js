/**
 * HAZIR PLAN — onaylanmış sahneleri medya servisine hazırlar
 * n8n düğümü: "Hazır Plan" (Code) · Mode: Run Once for All Items
 * ─────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR: Video üretimi para yakıyor (klip başına $0.40). Kullanıcı önce
 * sahne planını ÜCRETSİZ görüyor, uydurma bir iddia veya yanlış dil varsa
 * orada fark ediyor; ancak onayladıktan sonra üretim başlıyor.
 *
 * Bu düğüm onay adımında çalışır: plan yeniden ÜRETİLMEZ, kullanıcının
 * gördüğü sahneler aynen medya servisine gider. Yeniden üretilseydi model
 * başka bir plan çıkarabilir ve kullanıcı onaylamadığı bir video için
 * ödeme yapmış olurdu.
 */

const body = $('Webhook').first().json.body || $('Webhook').first().json;

/*
 * Hook metni videoya SONRADAN basılıyor (medya servisi, ffmpeg drawtext).
 * Veo'ya yazdırmak Türkçe karakterleri bozuyor ("DİİGİTAL MARKETING"),
 * dış ses olarak okutmak ise hiç üretilmedi (10 Eyl 2026).
 */
const hookMetni = String(body.hook || '').trim();
/** Kapanış çağrısı — videonun son saniyelerinde ekrana basılıyor. */
const ctaMetni  = String(body.cta  || '').trim();
const gelen = Array.isArray(body.sahneler) ? body.sahneler : [];

if (gelen.length === 0) {
  return [{ json: { hata: 'Onaylanmış sahne bulunamadı.' } }];
}
if (gelen.length > 4) {
  return [{ json: { hata: 'En fazla 4 sahne üretilebilir.' } }];
}

/*
 * YANLIŞ ZİLİ TEMİZLE — giriş yoksa zil yok. Plan adımındaki giriş tespiti
 * "pointing toward the doorway"ı giriş sandı (11 Eyl 2026); kimsenin girmediği
 * sahnede zil çalacak ve medya servisi repliği 2,5 sn geciktirecekti. Onaylanmış
 * eski planlar da bu yüzden burada bir kez daha süzülüyor. Yalnızca SİLER, eklemez.
 */
const GIRIS =
  /\b(?:walks?|steps?|comes?|bursts?|rushes?|hurries|strolls?)\s+(?:in|into|through)\b|\benters?\b/i;
// Üst paneldeki (sokak/video) yürüyüş kapıdan giriş değil — 11 Eyl 2026 park senaryosu
// Konum ('in/into the upper frame') sayılır; yön ('toward the top screen') sayılmaz
const UST_PANEL = /(?<!\b(?:toward|towards|at|to|onto)\s+the\s+)\b(?:upper|top)\s+(?:half|third|section|panel|part|frame|screen)\b/i;
const efektSuz = (s) => {
  const e = String(s?.efekt || '').trim();
  const odadaGiris = String(s?.prompt || '').split(/[.;]/)
    .some((c) => GIRIS.test(c) && !UST_PANEL.test(c));
  return e === 'zil' && !odadaGiris ? '' : e;
};

/*
 * ESKİ PLAN EMNİYET KEMERİ (12 Eyl 2026): Veo'nun sesi artık SİLİNMİYOR.
 * Repliği prompt'unda taşımayan eski bir plan üretime girerse Veo kendi
 * uydurduğu konuşmayı seslendirir ve o ses videoda kalır. Burada repliği
 * prompt'a ekliyoruz. Konuşanın İngilizce tarifi bu adımda elimizde olmadığı
 * için kişiyi adıyla gösteremiyoruz — ağız yanlış kişide olabilir, ama en
 * azından doğru Türkçe cümle söylenir. Doğrusu planı yeniden oluşturmaktır.
 */
/*
 * RAKAM UYUMU (12 Eyl 2026): plan adımında prompt'un tırnak içi yazıya çevriliyor
 * ("1- Kira" → "Bir, Kira"), altyazıda rakam kalıyor. Karşılaştırma ham replikle
 * yapılırsa ASLA eşleşmez ve cümle İKİNCİ kez eklenir — BES planında 2. sahnenin
 * repliği iki kez söylenecekti. Karşılaştırma da eklenen cümle de aynı dönüşümden geçer.
 */
const SAYI_YAZI = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz', 'On'];
const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const ucBasamak = (n) => {
  const y = Math.floor(n / 100); const o = Math.floor((n % 100) / 10); const b = n % 10;
  return [y ? (y === 1 ? 'yüz' : `${BIRLER[y]} yüz`) : '', ONLAR[o], BIRLER[b]].filter(Boolean).join(' ');
};
const sayiSozcuk = (n) => {
  if (n === 0) return 'sıfır';
  const bin = Math.floor(n / 1000); const kalan = n % 1000;
  return [bin ? (bin === 1 ? 'bin' : `${ucBasamak(bin)} bin`) : '', kalan ? ucBasamak(kalan) : '']
    .filter(Boolean).join(' ');
};
/*
 * TUTARLAR DA YAZIYLA (12 Eyl 2026): Allianz kampanyalarının replikleri tutar
 * dolu — "2.000 dedik", "%10 puan", "400 TL", "iPhone 17 Pro Max". Yalnızca
 * liste işaretlerini çevirmek yetmiyordu; Veo bu rakamları İngilizce okuyabilir.
 */
const sayiYaziya = (metin) => String(metin)
  .replace(/(^|[\s,;:(])(10|[1-9])\s*[-–.)]\s+/g, (_, on, sayi) => `${on}${SAYI_YAZI[Number(sayi)]}, `)
  .replace(/%\s*(\d{1,3}(?:\.\d{3})*)/g, (_, s) => `yüzde ${sayiSozcuk(Number(s.replace(/\./g, '')))}`)
  .replace(/\d{1,3}(?:\.\d{3})+|\d+/g, (m) => {
    const n = Number(m.replace(/\./g, ''));
    return Number.isFinite(n) && n < 1000000 ? sayiSozcuk(n) : m;
  });

const replikliPrompt = (s, prompt) => {
  const replik = sayiYaziya(String(s?.replik || '').trim());
  if (!replik) return prompt;
  const ilkParca = replik.slice(0, 14).toLocaleLowerCase('tr');
  if (prompt.toLocaleLowerCase('tr').includes(ilkParca)) return prompt;
  const ton = String(s?.ton || '').trim();
  return `${prompt} The speaking character says in Turkish${ton ? `, ${ton}` : ''}: "${replik}" No one else speaks.`;
};

const sahneler = gelen
  .map((s, i) => ({
    // Eski planlarda baştaki "Vertical 9:16." Veo'da "916" yazısı olarak çıkıyordu
    // (11 Eyl 2026) — onaylanmış eski planlar da burada temizleniyor. Format API ayarıyla gidiyor.
    prompt: replikliPrompt(s, String(s?.prompt || '').replace(/\s*\b(?:vertical\s+)?9\s*:\s*16\b\.?/gi, '').trim()),
    // İlk sahne asla zincirlenemez — öncesinde kare yok
    zincirle: i === 0 ? false : s?.zincirle === true,
    aciklama: String(s?.aciklama || '').trim(),
    // Replik prompt'un içinde de var (Veo söylüyor); burada altyazı için taşınıyor
    replik: String(s?.replik || '').trim(),
    konusan: String(s?.konusan || '').trim(),
    // Zil, Veo'nun kendi sesi korunarak üstüne karıştırılıyor (medya servisi)
    efekt: efektSuz(s),
    // Ton prompt'a yazıldı; ekranda da gösteriliyor
    ton: String(s?.ton || '').trim(),
    konusanEtiket: String(s?.konusanEtiket || '').trim(),
    sesProfili: String(s?.sesProfili || '').trim(),
  }))
  .filter((s) => s.prompt.length >= 20);

if (sahneler.length === 0) {
  return [{ json: { hata: 'Sahne promptları geçersiz.' } }];
}

return [{
  json: {
    sahneler,
    sahneSayisi: sahneler.length,
    medyaGovdeStr: JSON.stringify({ sahneler, hookMetni, ctaMetni }),
  },
}];
