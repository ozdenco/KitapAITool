/**
 * SAHNELERİ AYIKLA — Gemini cevabını medya servisinin beklediği biçime çevirir
 * n8n düğümü: "Sahneleri Ayıkla" (Code) · Mode: Run Once for All Items
 *
 * Gemini'nin JSON döndürmesini istedik ama sapmalara karşı aynı savunma
 * katmanı burada da var: düşünce parçalarını ayıkla, markdown sarmalayıcıyı
 * kaldır, sondaki fazla virgülü onar.
 */

const cevap = $input.first().json;
const ctx = $('Veo Prompt İste').first().json;

const aday = cevap?.candidates?.[0];
if (!aday) {
  const sebep = cevap?.promptFeedback?.blockReason || cevap?.error?.message || 'bilinmiyor';
  return [{ json: { hata: 'Gemini yanıt vermedi: ' + sebep } }];
}

/*
 * finishReason'a BAKMAK ŞART (9 Eyl 2026'da eklendi).
 *
 * Yanıt jeton sınırına takılıp kesildiğinde geriye yarım bir JSON kalıyor ve
 * kullanıcı "Sahne planı çözümlenemedi: Unterminated string" gibi hiçbir şey
 * anlatmayan bir hata görüyordu. Asıl sebep — cevabın kesilmesi — hiçbir
 * yerde yazmıyordu ve teşhis saatler aldı.
 *
 * gemini-3.8-flash düşünen bir model; düşünme jetonları da maxOutputTokens'a
 * sayılıyor, o yüzden bu sınıra takılmak sanıldığından kolay.
 */
if (aday.finishReason === 'MAX_TOKENS') {
  return [{ json: {
    hata: 'Sahne planı çok uzun geldi ve yanıt kesildi. Daha az sahne deneyin '
        + 'veya senaryoyu kısaltın.',
  } }];
}
if (aday.finishReason && aday.finishReason !== 'STOP') {
  return [{ json: { hata: 'Gemini isteği durdurdu: ' + aday.finishReason } }];
}

let metin = (aday.content?.parts || [])
  .filter((p) => !p?.thought)
  .map((p) => p?.text || '')
  .join('')
  .trim()
  .replace(/```(?:json)?/gi, '');

const bas = metin.indexOf('{');
const son = metin.lastIndexOf('}');
if (bas !== -1 && son !== -1) metin = metin.slice(bas, son + 1);

/*
 * KAÇIŞSIZ TIRNAK ONARIMI (9 Eyl 2026)
 *
 * Prompt, replikleri tırnak içinde istiyor. Model bunları JSON değerinin
 * İÇİNE kaçış koymadan yazınca string erken kapanıyor:
 *
 *   "prompt": "... says in Turkish: "Aklıma bak...""
 *                                   ↑ burada patlıyor
 *
 * Canlıda "Unterminated string in JSON at position 249" olarak görüldü ve
 * sahne planı tamamen kayboldu. Prompt artık tek tırnak istiyor; bu da
 * model yine de uymazsa devreye giren ikinci savunma.
 *
 * Yöntem: metni karakter karakter tara. Bir string'in içindeyken tırnak
 * görürsek, sonrasındaki ilk boşluksuz karakter `,` `:` `}` `]` değilse bu
 * gerçek bir kapanış değildir — kaçır.
 */
function tirnaklariOnar(ham) {
  let sonuc = '';
  let stringIcinde = false;
  for (let i = 0; i < ham.length; i++) {
    const k = ham[i];
    if (k === '\\') { sonuc += k + (ham[i + 1] || ''); i++; continue; }
    if (k === '"') {
      if (!stringIcinde) { stringIcinde = true; sonuc += k; continue; }
      let j = i + 1;
      while (j < ham.length && /\s/.test(ham[j])) j++;
      if (j >= ham.length || [',', ':', '}', ']'].includes(ham[j])) {
        stringIcinde = false; sonuc += k;         // gerçek kapanış
      } else {
        sonuc += '\\"';                            // içeride kalan tırnak
      }
      continue;
    }
    sonuc += k;
  }
  return sonuc;
}

/*
 * TEK TIRNAKLI DEĞER ONARIMI (11 Eyl 2026)
 *
 * Model bir değeri JSON'un çift tırnağı yerine tek tırnakla açabiliyor:
 *
 *   "replik": 'Bu strateji KOBİ'ler için...',
 *             ↑ "Unexpected token '''" — plan tamamen kayboldu
 *
 * (Sebep promptumuzdaki yanlış bir örnekti; düzeltildi. Bu ikinci savunma.)
 *
 * Yöntem: string dışındayken `:` sonrasında `'` görülürse tek tırnaklı değer
 * başlar. Bitiş, ardından `,` `}` `]` gelen `'`tır — böylece "KOBİ'ler"
 * içindeki kesme işareti değeri erken kapatmaz. İçerideki çift tırnaklar
 * kaçırılıp değer çift tırnakla yeniden yazılır.
 */
function tekTirnakOnar(ham) {
  let sonuc = '';
  let stringIcinde = false;
  let sonAnlamli = '';
  for (let i = 0; i < ham.length; i++) {
    const k = ham[i];
    if (stringIcinde) {
      sonuc += k;
      if (k === '\\') { sonuc += ham[i + 1] || ''; i++; continue; }
      if (k === '"') stringIcinde = false;
      continue;
    }
    if (k === '"') { stringIcinde = true; sonuc += k; sonAnlamli = k; continue; }
    if (k === "'" && sonAnlamli === ':') {
      let deger = '';
      let j = i + 1;
      for (; j < ham.length; j++) {
        if (ham[j] === "'") {
          let t = j + 1;
          while (t < ham.length && /\s/.test(ham[t])) t++;
          if (t >= ham.length || [',', '}', ']'].includes(ham[t])) break;
        }
        deger += ham[j];
      }
      sonuc += JSON.stringify(deger);
      i = j;               // kapanış tırnağının üstü
      sonAnlamli = '"';
      continue;
    }
    sonuc += k;
    if (!/\s/.test(k)) sonAnlamli = k;
  }
  return sonuc;
}

let cozulen;
const virgulOnar = (m) => m.replace(/,\s*([\]}])/g, '$1');   // sondaki fazla virgül
const denemeler = [
  (m) => m,
  (m) => virgulOnar(m),
  (m) => tirnaklariOnar(m),
  (m) => virgulOnar(tirnaklariOnar(m)),
  (m) => tekTirnakOnar(m),
  (m) => virgulOnar(tirnaklariOnar(tekTirnakOnar(m))),
];

let ilkHata = null;
for (const donustur of denemeler) {
  try {
    cozulen = JSON.parse(donustur(metin));
    break;
  } catch (e) {
    if (!ilkHata) ilkHata = e;
  }
}

if (!cozulen) {
  // Ham metnin başı hatayla birlikte dönüyor — bir sonraki teşhis tahminle
  // değil kanıtla başlasın diye.
  return [{ json: {
    hata: 'Sahne planı çözümlenemedi: ' + ilkHata.message,
    _hamMetin: metin.slice(0, 400),
    _bitisNedeni: aday.finishReason || 'bilinmiyor',
  } }];
}

const ham = Array.isArray(cozulen?.sahneler) ? cozulen.sahneler : [];
if (ham.length === 0) {
  return [{ json: { hata: 'Gemini hiç sahne üretmedi.' } }];
}

/*
 * Medya servisi yalnızca { prompt, zincirle } okuyor. `aciklama` alanını
 * yine de taşıyoruz — kullanıcıya "hangi sahne üretiliyor" derken Türkçe
 * göstereceğiz.
 */
/*
 * PROMPT BİRLEŞTİRME — tekrarı modelin elinden alıyoruz.
 *
 * Model mekânı ve karakterleri her sahnede elle yazınca sahneden sahneye
 * kısaltıp başka kelimelerle yeniden yazıyordu (10-11 Eyl 2026: üç sahnede üç
 * farklı mekân tarifi). Veo her sahneyi ayrı gördüğü için oda ve yüzler
 * değişiyordu. Artık model `ortam` ve `karakterler`i BİR KEZ yazıyor; burada
 * her sahneye birebir aynı metin yapıştırılıyor.
 */
/*
 * Ekran/grafik içeren mekânda Veo anlamsız yazı ve rakam çiziyor (11 Eyl
 * 2026: grafikte "Hegh 96-16"). Olumsuz talimata zayıf uyduğu için önce ne
 * çizeceğini söylüyoruz — soyut şekiller — sonra yasağı. Modele bırakmıyoruz.
 */
/*
 * Ortam KİŞİ SAYISI taşımamalı: her sahneye yapıştırılıyor. "…, where two
 * people sit side by side" 3 kişilik sahneye de gidince Veo birini silip
 * yenisini onun koltuğuna oturttu (11 Eyl 2026: işletme sahibi kayboldu,
 * çırak yerine geçti). Kişiler sahne promptunda; ortamdan ayıklıyoruz.
 */
const KISI_CUMLECIGI =
  /,?\s*(?:where|in which)\s+[^.;]*?\b(?:people|persons|men|women|man|woman|colleagues)\b[^.;]*/gi;
/*
 * Mikrofondan HİÇ söz edilmesin — "no microphones anywhere" bile. Veo olumsuz
 * talimata zayıf uyuyor ve kelime mikrofonu çağrıştırıyor; mikrofon ses
 * filtresini tetikleyip üretimi durdurmuştu (10 Eyl 2026). Senaryoda "mikrofon
 * başında" yazınca model bu ifadeyi mekâna ekledi (11 Eyl 2026).
 */
const MIKROFON =
  /,?\s*(?:with\s+)?(?:no|without)\s+(?:visible\s+|any\s+)?(?:podcast\s+)?microphones?[^,.;]*/gi;
/*
 * STÜDYO ARTIĞI KULAKLIK (12 Eyl 2026): senaryo "mikrofon başında" deyince
 * model mikrofonu mekâna değil, KARAKTERİN ÜSTÜNE yazdı — "over-ear headphones
 * resting on his neck" üç sahnede birden tekrarlandı. Mikrofon süzgeci bunu
 * yakalamıyordu; sigorta ofisinde boynunda stüdyo kulaklığı olan danışman
 * kurguyu bozuyor.
 */
const KULAKLIK =
  /,?\s*(?:and\s+|with\s+)?(?:wearing\s+)?(?:a\s+|an\s+)?(?:pair\s+of\s+)?(?:over-ear\s+|on-ear\s+|studio\s+|wireless\s+|large\s+)*head(?:phones?|sets?)[^,.;]*/gi;

const ortamHam = String(cozulen?.ortam || '').trim().replace(KISI_CUMLECIGI, '').replace(MIKROFON, '').replace(KULAKLIK, '');
/*
 * KADRAJ — 11 Eyl 2026: son karede üç kişiden biri arkada sıkıştı, biri kenardan
 * kesildi; Özden "bu kadar yakın çekime gerek var mı" dedi. İki sebep:
 *  1. Bölünmüş ekran dikey kareyi yarıya bölünce oda neredeyse kareye iniyor.
 *     Grafik artık üst ÜÇTE BİR, oda alt üçte iki.
 *  2. Model plan ölçeğini "close-up / medium shot" yazıyor ya da hiç yazmıyor.
 *     Dar ölçekler geniş plana çevriliyor; her sahneye kişi sayısına göre
 *     kadraj cümlesini aşağıda promptKur ekliyor.
 */
const genisPlan = (t) => t
  .replace(/\b(?:extreme\s+|medium\s+)?close[- ]?ups?\b|\bmedium(?:\s+frontal)?\s+shot\b|\btight\s+(?:shot|framing)\b/gi, 'wide shot');
const bolunmus = /split[- ]?screen|\b(?:upper|top|lower|bottom)\s+(?:half|section)\b/i.test(ortamHam);
/** "upper half" → "upper third": ortamda VE sahne metninde aynı oran (11 Eyl 2026: ikisi çelişti). */
const oranDuzelt = (t) => t
  .replace(/\b(upper|top)\s+(?:half|section)\b/gi, '$1 third')
  .replace(/\b(lower|bottom)\s+(?:half|section)\b/gi, '$1 two-thirds');
let ortamOran = oranDuzelt(genisPlan(ortamHam));
if (bolunmus && !/third/i.test(ortamOran)) {
  ortamOran = ortamOran.replace(/[.\s]*$/, '.')
    // "graphics" DEĞİL "upper panel": üst panel bir video da olabilir (araba, mutfak).
    // Eski cümle "graphics" dediği için aşağıdaki grafik tespitini KENDİSİ tetikliyordu
    // ve gerçek araba videosuna "düz renkli şekiller" talimatı eklendi (11 Eyl 2026).
    + ' The upper panel takes only the top third of the frame; the room fills the lower two-thirds.';
}
/*
 * Veo arayüz çizdiği her yere sahte yazı koyuyor ("Aucoomnet", "Messager" —
 * 11 Eyl 2026). "Yazı olmasın" yasağına zayıf uyduğu için önce NE çizeceğini
 * olumlu söylüyoruz: harfsiz şekiller, ikonlar, tikler.
 */
// "split-screen"deki "screen" grafik değil: üst paneli mutfak olan bir sahneye harfsiz
// grafik cümlesi eklendi (11 Eyl 2026). Fiil olan "displays" de tetiklemiyor.
const GRAFIK = /\bcharts?\b|\bgraph(?:s|ics?)\b|\bdashboards?\b|\banalytics\b|\bmonitors?\b|\binterface\b|\bbubbles?\b|\bnotifications?\b|(?<!split[- ]?)\bscreens?\b/i;
// Tespit MODELİN YAZDIĞI özgün metne bakar — kodun eklediği cümlelere değil
const ortam = GRAFIK.test(ortamHam)
  && !/no (readable )?text|no letters/i.test(ortamOran)
  ? ortamOran.replace(/[.\s]*$/, '.')
    // Neyi kapsadığı açık: ekran/grafik/monitör İÇERİĞİ. "The graphics are…" belirsizdi;
    // üst paneldeki gerçek çekim (araba, sokak) de düz şekillere dönebilirdi (11 Eyl 2026).
    + ' Any screen, chart or monitor content shows only plain coloured shapes, icons and check marks — every bubble, card and label is blank, with no letters or numbers at all; filmed footage stays photorealistic.'
  : ortamOran;
/*
 * KONUM mu YÖN mü? "In the upper third, {x}…", "{x} walks into the upper frame"
 * kişinin ÜST PANELDE olduğunu söyler. "{x} points toward the top screen",
 * "looks at the upper panel" ise odadaki birinin BAKTIĞI yönü söyler — o kişi
 * odada kalır. 11 Eyl 2026 evcil hayvan planı: üst ekranı işaret eden müşteri
 * üst panele yazıldı ve iki kişilik sahneye tek kişilik kadraj eklendi.
 */
const UST_PANEL = /(?<!\b(?:toward|towards|at|to|onto)\s+the\s+)\b(?:upper|top)\s+(?:half|third|section|panel|part|frame|screen)\b/i;
const ALT_PANEL = /(?<!\b(?:toward|towards|at|to|onto)\s+the\s+)\b(?:lower|bottom)\s+(?:half|third|two-thirds|section|panel|part|frame)\b/i;

/*
 * İKİ PANELDE AYNI HAYVAN — üstteki videoda köpek, alttaki odada köpek olunca
 * Veo ikisini de aynı cins/renk çizdi ve izleyen "aynı köpek iki kez var" dedi
 * (11 Eyl 2026). Model ayırt etmediyse kod ayırt ediyor.
 */
const HAYVAN_GRUPLARI = [
  ['dog', 'dogs', 'puppy', 'puppies'], ['cat', 'cats', 'kitten', 'kittens'],
  ['bird', 'birds', 'parrot', 'parrots'], ['rabbit', 'rabbits', 'hamster', 'hamsters'],
];
const ortamCumlecikleri = ortam.split(/[.;]/);
const panelde = (kosul) => ortamCumlecikleri.filter(kosul).join(' ').toLowerCase();
const ustMetin = panelde((c) => UST_PANEL.test(c) && !ALT_PANEL.test(c));
const altMetin = panelde((c) => ALT_PANEL.test(c) && !UST_PANEL.test(c));
const ikiPaneldeAyniHayvan = HAYVAN_GRUPLARI.some((grup) => {
  const gecer = (metin) => grup.some((k) => new RegExp(`\\b${k}\\b`).test(metin));
  return gecer(ustMetin) && gecer(altMetin);
});
const ortamSon = ikiPaneldeAyniHayvan && !/different breed/i.test(ortam)
  ? ortam.replace(/[.\s]*$/, '.')
    + ' The animal in the room is a clearly different animal from the one in the video above: a different breed, a different colour and a different size.'
  : ortam;

const karakterler = (cozulen && typeof cozulen.karakterler === 'object' && cozulen.karakterler) || {};

const YER_TUTUCU = /\{([a-z_]+)\}/gi;
const karakterBul = (ad) => karakterler[ad] || karakterler[String(ad).toLowerCase()];

/*
 * Karakter girdisi eski planlarda düz metin, yenilerde
 * { tarif, cinsiyet, yas, etiket }. İkisi de okunuyor.
 *
 * NEDEN cinsiyet + yas: sesler eskiden yalnızca 4 role (işletme sahibi,
 * reklamcı, çırak, anlatıcı) bağlıydı; başka bir senaryodaki "müşteri"
 * varsayılan KADIN anlatıcı sesine düşüyordu (11 Eyl 2026). Medya servisi
 * sesi artık bu profilden seçiyor.
 */
const tarifBul = (ad) => {
  const k = karakterBul(ad);
  return typeof k === 'string' ? k : k?.tarif;
};
const etiketBul = (ad) => {
  const k = ad ? karakterBul(ad) : null;
  return (k && typeof k === 'object' && String(k.etiket || '').trim()) || '';
};
const sesProfiliBul = (ad) => {
  const k = ad ? karakterBul(ad) : null;
  if (!k || typeof k !== 'object') return '';
  const cinsiyet = String(k.cinsiyet || '').trim();
  const yas = String(k.yas || '').trim();
  return cinsiyet && yas ? `${cinsiyet}-${yas}` : '';
};

/*
 * Tarifi olmayan karakter → DUR. Sessizce "cirak" yazıp devam etseydik Veo o
 * kişiyi her sahnede rastgele çizerdi ve kullanıcı bunu kredi harcadıktan
 * sonra görürdü. Planı yeniden üretmek ücretsiz; boşa giden klip değil.
 */
const tanimsiz = [...new Set(
  ham.slice(0, ctx.sahneSayisi || 3)
    .flatMap((s) => [...String(s?.prompt || '').matchAll(YER_TUTUCU)].map((m) => m[1]))
)].filter((ad) => !tarifBul(ad));

if (tanimsiz.length > 0) {
  return [{ json: {
    hata: 'Sahne planında tarifi olmayan karakter var (' + tanimsiz.join(', ')
        + '). "Sahne planını gör" düğmesiyle planı yeniden üretin — ücretsiz.',
  } }];
}

/** Tarifin sonundaki nokta cümleyi bölüyordu: "…grey sweater. talks …" */
const tarifTemizle = (t) => String(t || '').trim()
  .replace(KULAKLIK, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/[,\s]+$/, '')
  .replace(/[.\s]+$/, '');

/*
 * KISA AD — aynı sahnede ikinci geçiş için.
 *
 * Tam tarif bir sahnede iki kez geçince ("{reklamci} talks … watching
 * {reklamci}") Veo bunu iki ayrı kişi sanabiliyor — tuzluğu iki kez çizdiği
 * gibi (11 Eyl 2026 planında görüldü). İlk geçiş tam tarif, sonrakiler kısa ad:
 *   "a clean-shaven man in his late 20s with …" → "the clean-shaven man in his late 20s"
 * İki karakterin kısa adı aynı çıkarsa ayırt edici değildir; o zaman tam tarif.
 */
function kisaAdUret(tarif) {
  return tarif.split(/,| with | wearing /)[0].trim().replace(/^(a|an)\s+/i, 'the ');
}
/*
 * İki karakterin kısa adı aynı çıkarsa ("the present-day man in his 30s") kıyafet
 * eklenir: "… in the simple navy blue button-up shirt". Eskiden tam tarife
 * dönülüyordu; aynı sahnede tam tarif iki kez geçince Veo fazladan kişi
 * çizebiliyor (11 Eyl 2026, sigorta planı).
 */
const sayac = (nesne) => Object.values(nesne).reduce((s, k) => ({ ...s, [k]: (s[k] || 0) + 1 }), {});
const kiyafetli = (tarif) => {
  const k = tarif.match(/\bwearing\s+(?:an?\s+)?([^,.;]+)/i);
  return k ? `${kisaAdUret(tarif)} in the ${k[1].trim()}` : null;
};
const temelAdlar = Object.fromEntries(
  Object.keys(karakterler).map((ad) => [ad.toLowerCase(), kisaAdUret(tarifTemizle(tarifBul(ad)))]),
);
const temelSayac = sayac(temelAdlar);
const kisaAdlar = Object.fromEntries(Object.entries(temelAdlar).map(([ad, k]) =>
  [ad, temelSayac[k] > 1 ? (kiyafetli(tarifTemizle(tarifBul(ad))) || k) : k]));
const kisaSayac = sayac(kisaAdlar);

/*
 * RAKAM PROMPT'TA YAZIYLA (12 Eyl 2026): repliği artık Veo okuyor. Prompt'ta
 * "1- Kira ödendi, 2- Faturalar bitti" gibi bir liste kalırsa rakamları
 * İngilizce ("one, two") okuma riski var — Türkçe bir reklamda göze batar.
 * ALTYAZIDA rakam kalıyor (ekranda liste olarak daha okunaklı); yalnızca
 * prompt'un TIRNAK İÇİNDEKİ konuşma metni yazıya çevriliyor. Aynı dönüşüm
 * kendi seslendirmemiz döneminde medya servisinde vardı (seslendirmeMetni).
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

function promptKur(ham) {
  const gorulen = new Set();
  let govde = String(ham || '').trim().replace(MIKROFON, '').replace(KULAKLIK, '');
  // {reklamci} → tam tarif (yukarıda hepsinin tanımlı olduğu doğrulandı)
  govde = govde.replace(YER_TUTUCU, (_, ad) => {
    const anahtar = ad.toLowerCase();
    const tarif = tarifTemizle(tarifBul(ad));
    const kisa = kisaAdlar[anahtar];
    if (gorulen.has(anahtar) && kisa && kisaSayac[kisa] === 1) return kisa;
    gorulen.add(anahtar);
    return tarif;
  });
  // Cümle başına düşen tarif küçük harfle başlıyordu: ". a man …" → ". A man …"
  govde = govde.replace(/(^|[.!?]\s+)([a-z])/g, (_, on, harf) => on + harf.toUpperCase());
  // Model yine de başa "Vertical 9:16." yazdıysa çiftlenmesin
  govde = govde.replace(/^vertical\s*9:16\.?\s*/i, '');
  govde = genisPlan(govde);
  if (bolunmus) govde = oranDuzelt(govde);
  /*
   * Kadraj: kişi sayısına göre — herkes tam görünür, kimse kimseyi kapatmaz.
   * Bölünmüş ekranın ÜST panelinde görünen kişi (ör. mutfaktaki adam) odadaki
   * sıraya sayılmaz; yoksa "dört kişi yan yana" yazılıyor ve Veo onu da masaya
   * oturtmaya çalışıyordu (11 Eyl 2026, sigorta planı).
   */
  const hamMetin = String(ham || '');
  const kisiler = (t) => [...t.matchAll(YER_TUTUCU)].map((m) => m[1].toLowerCase());
  const ustte = new Set(); const altta = new Set();
  for (const parca of hamMetin.split(/[.;]/)) {
    // Yalnızca AÇIKÇA panel adı geçen cümlecikler sınıflanır; "From the third
    // second, {x} talks" gibi nötr cümlecikler kişiyi hiçbir tarafa yazmaz.
    const ust = UST_PANEL.test(parca); const alt = ALT_PANEL.test(parca);
    const hedef = ust && !alt ? ustte : alt && !ust ? altta : null;
    if (hedef) kisiler(parca).forEach((k) => hedef.add(k));
  }
  const yalnizUstte = [...ustte].filter((k) => !altta.has(k)).length;
  const kisi = new Set(kisiler(hamMetin)).size - yalnizUstte;
  const KADRAJ = {
    1: 'Framing: a medium-wide shot, the person centred with space around them.',
    2: 'Framing: a wide shot from a slight distance — both people fully visible from head to waist, with space around them; neither person is hidden behind the other and nobody is cut off by the edge of the frame.',
  };
  const SAYIYLA = ['', 'one', 'two', 'three', 'four', 'five'];
  const altNot = yalnizUstte ? ' in the lower part of the frame' : '';
  /*
   * KADRAJ DİZİLİŞ DAYATMAZ (12 Eyl 2026): "side by side" cümlesi, sahnenin
   * kendi tarifiyle çelişiyordu — kapıda koliyle duran kuryeyle ve masanın
   * KARŞILIKLI iki yanında oturan ("Across the desk", "Opposite her") iki
   * kişiyle. Veo çelişkiyi ikisini yan yana dizerek çözebilirdi. Artık yalnızca
   * görünürlük ve örtüşmeme garanti ediliyor; kimin nerede durduğunu sahne
   * tarifi söylüyor. Kapıdan girenin geride kalması tek konum kuralı.
   */
  const odayaGiris = hamMetin.split(/[.;]/).some((c) => GIRIS.test(c) && !UST_PANEL.test(c));
  const kadraj = odayaGiris && kisi >= 2
    ? `Framing: a wide shot from a distance — all ${SAYIYLA[kisi] || kisi} people${altNot} fully visible from head to waist; the one coming through the door stays further back at the doorway, with space around them; nobody is hidden behind anyone and nobody is cut off by the edge of the frame.`
    : KADRAJ[kisi] || (kisi >= 3
      ? `Framing: a wide shot from a distance — all ${SAYIYLA[kisi] || kisi} people${altNot} fully visible from head to waist, with space around them; nobody is hidden behind anyone and nobody is cut off by the edge of the frame.`
      : '');
  // Tarif edilmeyen figüran Veo'da rastgele biri olarak çıkıyor — kapıyı kapat
  if (!/no other people/i.test(govde)) govde += ' No other people are visible.';
  // Kadraj cümlesi "No other people…"dan hemen önce — o cümle sonda olmasa bile.
  // 11 Eyl 2026: model ardından bir cümle daha yazınca ("In the upper third, the
  // car continues…") eski desen ($ ile yalnızca sonu arıyordu) eşleşmedi ve 1.
  // sahneye kadraj hiç eklenmedi.
  if (kadraj) govde = govde.replace(/\s*No other people are visible\.?/i, ` ${kadraj} No other people are visible.`);
  // Yalnızca tırnak içi: prompt'un geri kalanındaki "in his 20s" ya da
  // "In the first two seconds" gibi ifadelere dokunulmuyor.
  govde = govde.replace(/"([^"]+)"/g, (_, ic) => `"${sayiYaziya(ic)}"`);
  const ortamCumle = ortamSon && !/[.!?]$/.test(ortamSon) ? ortamSon + '.' : ortamSon;
  /*
   * "Vertical 9:16." ARTIK EKLENMİYOR ve metindeki "9:16" siliniyor: Veo bunu
   * ekrana YAZI olarak bastı — 11 Eyl 2026 evcil hayvan videosunda üst panelin
   * köşesinde her sahnede "916" yazıyordu. Dikey format zaten medya servisinden
   * API ayarı olarak gidiyor (aspectRatio: '9:16'), prompt'ta gerekmiyor.
   */
  const oranYazisiz = (t) => String(t || '').replace(/\s*\b9\s*:\s*16\b\.?/g, '').trim();
  return [oranYazisiz(ortamCumle), oranYazisiz(govde)].filter(Boolean).join(' ');
}

/*
 * ZİL KODDA GARANTİ (11 Eyl 2026). Model girişi "kapıdan" değil "kadraja adım
 * atarak" yazınca zil koymadı; videoyu izleyenler "tuzluk neden geldi, ne
 * alaka?" dedi. Zil birinin GELDİĞİNİ — "ilk müşteri mi?" beklentisini —
 * duyuran işaret; espri ona dayanıyor. Sahnede giriş varsa modele bırakmıyoruz.
 */
// "doorway" GİRİŞ DEĞİL: "pointing toward the doorway" zil sanıldı ve kimsenin
// girmediği sahneye zil + 2,5 sn replik gecikmesi düştü (11 Eyl 2026).
// Yalnızca gerçek giriş fiilleri sayılır.
/*
 * PANEL AYRIMI — bölünmüş ekranın ÜST paneli ayrı bir görüntü (sokak, mutfak,
 * video). 11 Eyl 2026 park senaryosu: üst paneldeki sokakta yürüyen esnafa kapı
 * zili eklendi ve esnaf odadaki "üç kişi yan yana" sırasına sayıldı.
 */

const GIRIS =
  /\b(?:walks?|steps?|comes?|bursts?|rushes?|hurries|strolls?)\s+(?:in|into|through)\b|\benters?\b/i;

function efektBelirle(s) {
  const verilen = String(s?.efekt || '').trim();
  if (verilen && verilen !== 'zil') return verilen;
  // Zil yalnızca ODAYA giriş için: üst panelde (sokakta, videoda) yürüyen biri
  // kapıdan girmiyor. Model zil yazmış olsa bile odada giriş yoksa zil yok.
  const odadaGiris = String(s?.prompt || '').split(/[.;]/)
    .some((c) => GIRIS.test(c) && !UST_PANEL.test(c));
  return odadaGiris ? 'zil' : '';
}

/*
 * SÜREKLİLİK — sonraki bir sahnede KAPIDAN GİRMEDEN beliren karakter önceki
 * sahnelerde de görünmeli. 11 Eyl 2026: kıdemli usta yalnızca 3. sahnede "yan
 * masada başını kaldırıyordu", 1–2. sahnelerde yoktu. Sahne önceki karenin
 * devamı olduğu için Veo onu ya yoktan var eder ya da yer açmak için başka
 * birini siler (işletme sahibi daha önce bu yüzden kaybolmuştu). Eksik kaldığı
 * sahnelere sessiz, meşgul bir cümle ekliyoruz. Girişli sahneler hariç: yeni
 * gelenin önceki sahnelerde olmaması doğru.
 */
const sahneKisileri = (p) =>
  new Set([...String(p || '').matchAll(YER_TUTUCU)].map((m) => m[1].toLowerCase()));

const sureklilikli = ham.slice(0, ctx.sahneSayisi || 3).map((s) => ({ ...s }));

/*
 * REPLİK PROMPT'UN İÇİNDE OLMALI (12 Eyl 2026): Veo cümleyi kendisi söylüyor,
 * dudak senkronu böyle geliyor. Model repliği yalnızca "replik" alanına yazıp
 * prompt'a koymayı unutursa sahne sessiz kalır — kod ekliyor.
 */
sureklilikli.forEach((s) => {
  const replik = String(s?.replik || '').trim();
  const konusan = String(s?.konusan || '').trim().toLowerCase();
  if (!replik || !konusan || !tarifBul(konusan)) return;
  const ilkParca = replik.slice(0, 14).toLocaleLowerCase('tr');
  if (String(s.prompt || '').toLocaleLowerCase('tr').includes(ilkParca)) return;
  const ton = String(s?.ton || '').trim();
  s.prompt = `${String(s.prompt || '').trim()} {${konusan}} says in Turkish${ton ? `, ${ton}` : ''}: "${replik}"`;
});
/*
 * DİL AÇIKÇA YAZILMALI (12 Eyl 2026): model bazen "says in Turkish" yerine
 * yalnızca "says:" yazıyor — BES planında üç sahnede de öyleydi. Cümle Türkçe
 * olsa da dili söylemek telaffuzu garantiye alıyor. Repliğin hemen öncesindeki
 * konuşma fiilini bulup araya ekliyoruz; zaten yazılmışsa dokunmuyoruz.
 */
const KONUSMA_FIIL = /\b(?:says?|saying|said|tells?|telling|adds?|replies|replied|exclaims?|announces?|asks?|asking|whispers?|whispering|mutters?|muttering|murmurs?|murmuring|confesses|confessing|admits?|insists?|blurts?|continues?)\b/gi;
sureklilikli.forEach((s) => {
  const replik = String(s?.replik || '').trim();
  if (!replik) return;
  const prompt = String(s.prompt || '');
  const q = prompt.indexOf(`"${replik.slice(0, 10)}`);
  if (q < 0) return;
  const bas = Math.max(0, q - 90);
  const pencere = prompt.slice(bas, q);
  if (/\bin turkish\b/i.test(pencere)) return;
  /*
   * FİİL LİSTESİ YETMİYOR (12 Eyl 2026): "confesses:" ve "murmuring:" listede
   * yoktu, iki sahne dilsiz kaldı. Repliğin hemen öncesi iki nokta üst üste ile
   * bitiyorsa dili oraya yazıyoruz — fiil ne olursa olsun çalışır. Liste
   * yalnızca iki noktasız kuruluşlar için yedek.
   */
  const ikiNokta = pencere.match(/:\s*$/);
  if (ikiNokta) {
    const kes = bas + ikiNokta.index;
    s.prompt = `${prompt.slice(0, kes)} in Turkish${prompt.slice(kes)}`;
    return;
  }
  const fiiller = [...pencere.matchAll(KONUSMA_FIIL)];
  if (fiiller.length === 0) return;
  const son = fiiller[fiiller.length - 1];
  const kes = bas + son.index + son[0].length;
  s.prompt = `${prompt.slice(0, kes)} in Turkish${prompt.slice(kes)}`;
});

sureklilikli.forEach((s, i) => {
  if (i === 0 || GIRIS.test(String(s.prompt || ''))) return;
  for (const ad of sahneKisileri(s.prompt)) {
    for (let j = 0; j < i; j++) {
      const onceki = String(sureklilikli[j].prompt || '');
      if (sahneKisileri(onceki).has(ad)) continue;
      const ek = `{${ad}} sits at the side of the frame, busy and quiet, head down, lips closed.`;
      sureklilikli[j].prompt = /no other people are visible/i.test(onceki)
        ? onceki.replace(/\s*No other people are visible\.?/i, ` ${ek} No other people are visible.`)
        : `${onceki} ${ek}`;
    }
  }
});

const sahneler = sureklilikli
  .map((s, i) => ({
    prompt: promptKur(s?.prompt),
    // İlk sahne asla zincirlenemez — öncesinde kare yok
    zincirle: i === 0 ? false : s?.zincirle === true,
    aciklama: String(s?.aciklama || '').trim(),
    /*
     * Replik artık prompt'un İÇİNDE de duruyor: Veo cümleyi kendisi söylüyor,
     * dudak senkronu oradan geliyor. Burada ayrıca taşınıyor çünkü medya servisi
     * bunu altyazı olarak basıyor (12 Eyl 2026: kendi seslendirmemiz bırakıldı).
     */
    replik: String(s?.replik || '').trim(),
    konusan: String(s?.konusan || '').trim(),
    // Ekranda gösterilen rol adı ("Müşteri") ve ses seçimi için profil ("kadın-orta")
    // Ton prompt'a da yazılıyor: Veo repliği bu duyguyla söylüyor
    ton: String(s?.ton || '').trim(),
    konusanEtiket: etiketBul(s?.konusan),
    sesProfili: sesProfiliBul(s?.konusan),
    // Zil, Veo'nun kendi sesi KORUNARAK üstüne karıştırılıyor (medya servisi)
    efekt: efektBelirle(s),
  }))
  .filter((s) => s.prompt.length >= 20);

if (sahneler.length === 0) {
  return [{ json: { hata: 'Üretilen sahnelerin promptları geçersiz.' } }];
}

return [{
  json: {
    sahneler,
    sahneSayisi: sahneler.length,
    // Medya servisine gidecek gövde
    // Hook metni videoya sonradan basılıyor — bkz. 5-hazir-plan.js notu
    medyaGovdeStr: JSON.stringify({ sahneler, hookMetni: String(ctx.hook || '').trim(),
                                   ctaMetni: String(ctx.cta || '').trim() }),
  },
}];
