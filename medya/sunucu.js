/**
 * MEDYA SERVİSİ — Veo kliplerini birleştirir ve son kareyi çıkarır
 * ─────────────────────────────────────────────────────────────────────────────
 * NEDEN VAR: Veo dikey videoda `extend` desteklemiyor (6 Eyl 2026'da canlıda
 * doğrulandı: "Aspect ratio of the input video must be 16:9"). Çok sahneli bir
 * video ancak ayrı ayrı üretilip BİRLEŞTİRİLEREK elde edilebiliyor.
 *
 * Kullanıcıya "dört mp4 indir, CapCut'ta birleştir" demek KOBİ için kabul
 * edilebilir bir deneyim değil — Özden'in net kararı. O yüzden montaj burada,
 * sunucuda yapılıyor.
 *
 * UÇLAR:
 *   POST /son-kare   → bir klibin son karesi (JPEG). Sonraki klibe başlangıç
 *                      görseli olarak verilince karakter tutarlılığı korunur;
 *                      elle "extend" etkisi yaratır.
 *   POST /birlestir  → N klibi tek dosyaya çevirir, indirme adresi döndürür.
 *   POST /video-uret → SAHNELERDEN TAM VİDEO. Hemen bir iş kimliği döner,
 *                      üretim arka planda sürer. Her sahnede `zincirle: false`
 *                      denerek o sahnenin önceki karenin devamı DEĞİL, bir
 *                      kesme olduğu belirtilebilir.
 *   GET  /is/<id>    → o işin durumu / sonucu.
 *
 * NEDEN VEO ÇAĞRILARI BURADA, n8n'DE DEĞİL:
 * n8n'in Code düğümleri credential kullanamıyor. Veo'yu orada çağırmak Gemini
 * anahtarını n8n ortamına da koymayı gerektirirdi — anahtar iki yerde durur.
 * Burada zaten var, ve üretim + kare zincirleme + birleştirme aynı süreçte
 * olduğu için video dosyaları ağda gidip gelmiyor.
 *
 * PERFORMANS: Tüm klipler Veo'dan aynı codec/çözünürlük/kare hızıyla geliyor,
 * bu yüzden birleştirme `-c copy` ile yapılıyor — yeniden kodlama YOK, saniyeler
 * sürüyor, CPU'yu yormuyor.
 *
 * GÜVENLİK:
 *   - Servis dışarıya açılmıyor (Traefik etiketi yok, port yayınlanmıyor).
 *     Yalnızca Docker ağından erişilebilir.
 *   - Video adresleri ALLOWLIST ile sınırlı. Aksi halde bu uç, iç ağdaki her
 *     adrese istek attırılabilen bir SSRF aracına dönüşürdü.
 *   - Gemini anahtarı istek gövdesinde TAŞINMIYOR; servis kendi ortamından
 *     okuyor. Böylece anahtar n8n çalıştırma kayıtlarına düşmüyor.
 */

const http = require('node:http')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')

const PORT     = Number(process.env.PORT || 8080)
const CIKTI    = process.env.CIKTI_DIZINI || '/veri/cikti'
const GECICI   = process.env.GECICI_DIZINI || '/veri/gecici'
const API_KEY  = process.env.GEMINI_API_KEY || ''

/** Yalnızca bu konaklardan video indirilir. SSRF'e karşı tek savunma. */
const IZINLI_KONAKLAR = new Set(['generativelanguage.googleapis.com'])

/*
 * SAKLAMA SÜRESİ — 8 Eyl 2026'da 48 saatten 30 güne çıkarıldı.
 *
 * NEDEN: 48 saat, videoyu üretip sekmeyi kapatan bir KOBİ için çok kısaydı.
 * Geçmiş Çıktılar'da kayıt görünüyor ama dosya çoktan silinmiş oluyordu.
 * Tanıtım haftasında bir müşteriye "videonuz duruyor" deyip boş sayfa açmak
 * kabul edilemez.
 *
 * Süre uzayınca disk tek başına süreye bırakılamaz; MAKS_DEPO_BAYT ikinci bir
 * tavan koyuyor. Süre dolmamış olsa bile depo bu sınırı aşarsa en eski
 * dosyalar silinir. İki kural birlikte çalışır: hangisi önce devreye girerse.
 */
const SAKLAMA_SAATI  = Number(process.env.SAKLAMA_SAATI || 720) // 30 gün
const MAKS_DEPO_BAYT = Number(process.env.MAKS_DEPO_BAYT || 5 * 1024 * 1024 * 1024) // 5 GB

const MAKS_KLIP    = 12
const MAKS_BAYT    = 200 * 1024 * 1024 // toplam indirme tavanı

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function gunlukle(...p) {
  console.log(new Date().toISOString(), ...p)
}

function adresGecerliMi(adres) {
  try {
    const u = new URL(adres)
    return u.protocol === 'https:' && IZINLI_KONAKLAR.has(u.hostname)
  } catch {
    return false
  }
}

/** ffmpeg/ffprobe'u çalıştırır, çıkışı bekler. Hata halinde stderr'i taşır. */
function calistir(komut, argumanlar) {
  return new Promise((resolve, reject) => {
    const p = spawn(komut, argumanlar)
    let hata = ''
    p.stderr.on('data', (d) => { hata += d.toString() })
    p.on('error', reject)
    p.on('close', (kod) => {
      if (kod === 0) return resolve()
      reject(new Error(`${komut} çıkış kodu ${kod}: ${hata.slice(-600)}`))
    })
  })
}

/**
 * Videoyu indirir. Gemini dosya adresleri anahtar istiyor; anahtar ortamdan
 * geliyor, istekle taşınmıyor.
 */
async function indir(adres, hedef) {
  if (!adresGecerliMi(adres)) {
    throw new Error(`İzin verilmeyen adres: ${adres}`)
  }
  const cevap = await fetch(adres, {
    headers: API_KEY ? { 'x-goog-api-key': API_KEY } : {},
    redirect: 'follow',
  })
  if (!cevap.ok) {
    throw new Error(`İndirme başarısız (${cevap.status}) — ${adres}`)
  }
  const bayt = Buffer.from(await cevap.arrayBuffer())
  if (bayt.length === 0) throw new Error(`Boş dosya indi: ${adres}`)
  await fsp.writeFile(hedef, bayt)
  return bayt.length
}

async function gecicidizinAc() {
  const d = path.join(GECICI, crypto.randomUUID())
  await fsp.mkdir(d, { recursive: true })
  return d
}

async function govdeOku(istek) {
  const parcalar = []
  let boyut = 0
  for await (const p of istek) {
    boyut += p.length
    if (boyut > 1_000_000) throw new Error('İstek gövdesi çok büyük')
    parcalar.push(p)
  }
  return JSON.parse(Buffer.concat(parcalar).toString('utf8') || '{}')
}

function json(cevap, kod, govde) {
  const metin = JSON.stringify(govde)
  cevap.writeHead(kod, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(metin),
  })
  cevap.end(metin)
}

// ─── Uçlar ───────────────────────────────────────────────────────────────────

/**
 * POST /son-kare  { videoUrl }
 * → { jpegBase64, mimeType }
 *
 * Veo referans görsel kabul ediyor; bir klibin son karesini sonraki klibe
 * vererek karakter ve mekân tutarlılığı korunuyor.
 */
async function sonKare(govde) {
  const gecici = await gecicidizinAc()
  try {
    const girdi = path.join(gecici, 'klip.mp4')
    await indir(govde.videoUrl, girdi)

    const kare = path.join(gecici, 'son.jpg')
    // sseof: sondan geriye konumlan. -q:v 2 = yüksek kalite JPEG.
    await calistir('ffmpeg', [
      '-v', 'error', '-sseof', '-0.5', '-i', girdi,
      '-frames:v', '1', '-q:v', '2', '-y', kare,
    ])

    const bayt = await fsp.readFile(kare)
    return { jpegBase64: bayt.toString('base64'), mimeType: 'image/jpeg', bayt: bayt.length }
  } finally {
    await fsp.rm(gecici, { recursive: true, force: true })
  }
}

/**
 * POST /birlestir  { videoUrls: [...], dosyaAdi? }
 * → { url, dosya, bayt, klipSayisi }
 *
 * Yeniden kodlama YOK — tüm klipler Veo'dan aynı biçimde geldiği için
 * concat demuxer + `-c copy` yeterli.
 */
async function birlestir(govde) {
  const adresler = Array.isArray(govde.videoUrls) ? govde.videoUrls : []
  if (adresler.length < 2) throw new Error('En az iki klip gerekli')
  if (adresler.length > MAKS_KLIP) throw new Error(`En fazla ${MAKS_KLIP} klip`)

  const gecici = await gecicidizinAc()
  try {
    let toplam = 0
    const yollar = []
    for (const [i, adres] of adresler.entries()) {
      const yol = path.join(gecici, `k${String(i).padStart(2, '0')}.mp4`)
      toplam += await indir(adres, yol)
      if (toplam > MAKS_BAYT) throw new Error('Toplam boyut sınırı aşıldı')
      yollar.push(yol)
    }

    // concat demuxer listesi — tek tırnak kaçışı ffmpeg biçimine göre
    const liste = path.join(gecici, 'liste.txt')
    await fsp.writeFile(
      liste,
      yollar.map((y) => `file '${y.replace(/'/g, "'\\''")}'`).join('\n'),
    )

    await fsp.mkdir(CIKTI, { recursive: true })
    const ad = `${crypto.randomUUID()}.mp4`
    const hedef = path.join(CIKTI, ad)

    /*
     * Önce -c copy ile birleştir (yeniden kodlama yok, hızlı). Hook metni
     * varsa ikinci bir geçişte basılıyor; o geçiş yeniden kodlama gerektiriyor
     * ama yalnızca hook istendiğinde ödeniyor.
     */
    /*
     * `sesler` dizisi geldiyse (boş bile olsa) ses kanalını çağıran yönetiyor:
     * Veo'nun sesi silinmeli. Replik yoksa bile Veo'nun uydurduğu İngilizce
     * konuşma videoda kalmamalı (11 Eyl 2026). Dizi hiç gelmediyse eski
     * davranış — ses aynen kalır.
     */
    // Artık yalnızca ZİL karıştırılıyor; Veo sesi olduğu gibi kalıyor
    const sesVar   = Array.isArray(govde.sesler) && govde.sesler.some((x) => x && (x.efekt || x.replik))
    const metinVar = Boolean(govde.hookMetni || govde.ctaMetni || sesVar)
    const birlesik = metinVar ? path.join(gecici, 'birlesik.mp4') : hedef

    await calistir('ffmpeg', [
      '-v', 'error', '-f', 'concat', '-safe', '0', '-i', liste,
      '-c', 'copy',
      // Bazı oynatıcılar moov atomunu başta ister (web'de anında oynatma)
      '-movflags', '+faststart',
      '-y', birlesik,
    ])

    if (metinVar) {
      // Önce ses (görüntü kopyalanıyor, ucuz), sonra metin (tek yeniden kodlama)
      const sesli = await zilKaristir(birlesik, govde.sesler, gecici)
      const metinli = await metinBas(
        sesli, govde.hookMetni, govde.ctaMetni, govde.sesler, gecici)
      await fsp.copyFile(metinli, hedef)
    }

    const bilgi = await fsp.stat(hedef)
    gunlukle(`birleştirildi: ${adresler.length} klip → ${ad} (${bilgi.size} bayt)`)
    return { url: `/medya/${ad}`, dosya: ad, bayt: bilgi.size, klipSayisi: adresler.length }
  } finally {
    await fsp.rm(gecici, { recursive: true, force: true })
  }
}


// ─── Seslendirme (TTS) ───────────────────────────────────────────────────────

/**
 * SESLENDİRME NEDEN BURADA:
 * Veo'ya belirli bir Türkçe cümle söyletmek ses güvenlik filtresini tetikliyor
 * ve üretimi tamamen engelliyor (10-11 Eyl 2026, 4 kez). Replik artık prompta
 * konmuyor; Veo kendi anlamsız konuşmasını üretiyor, biz o ses kanalını atıp
 * yerine bu katmanın ürettiği Türkçe sesi koyuyoruz.
 *
 * Yan fayda: telaffuz, hangi repliği kimin söylediği ve tempo kontrolümüzde.
 */

const TTS_MODEL = process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview'

/** Karakter → ses eşlemesi. Gemini'nin hazır seslerinden. */
const SESLER = {
  isletme_sahibi: 'Charon',   // olgun, sakin
  reklamci:       'Puck',     // genç, enerjik
  cirak:          'Fenrir',   // genç, düz
  anlatici:       'Kore',     // nötr anlatıcı
}
const VARSAYILAN_SES = 'Kore'

/*
 * SES HAVUZU — rol adına değil, karakterin CİNSİYET + YAŞINA göre.
 *
 * Eskiden yalnızca yukarıdaki 4 rol için ses vardı; başka bir senaryodaki
 * "müşteri", "kurye" varsayılan KADIN anlatıcı sesine düşüyordu (11 Eyl 2026).
 * Plan artık her karakter için cinsiyet ve yaş veriyor (sesProfili).
 *
 * Havuzdaki her ses 11 Eyl 2026'da API'de tek tek denendi. Aynı videoda iki
 * karakter aynı sesi almasın diye havuzdan sıradaki boş ses seçiliyor. Eski
 * üç rol aynı sesleri almaya devam ediyor: işletme sahibi (erkek-orta) →
 * Charon, reklamcı (erkek-genç) → Puck, çırak (erkek-genç, Puck dolu) → Fenrir.
 */
const SES_HAVUZU = {
  'erkek-genc':  ['Puck', 'Fenrir', 'Enceladus'],
  'erkek-orta':  ['Charon', 'Orus', 'Iapetus'],
  'erkek-olgun': ['Algenib', 'Orus', 'Charon'],
  'kadin-genc':  ['Leda', 'Zephyr', 'Aoede'],
  'kadin-orta':  ['Kore', 'Despina', 'Callirrhoe'],
  'kadin-olgun': ['Gacrux', 'Sulafat', 'Kore'],
}

/** "Kadın-Genç" → "kadin-genc": modelin Türkçe yazımını havuz anahtarına çevirir. */
function profilAnahtari(profil) {
  return String(profil || '').toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's')
    .replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/\s+/g, '')
}

/**
 * Konuşana ses atar. Aynı konuşan video boyunca aynı sesi korur; farklı
 * konuşanlar mümkünse farklı ses alır. Profil yoksa (eski planlar) rol eşlemesi.
 * @param {Map<string,string>} atanan  bu işte konuşan → ses
 */
function sesSec(konusan, sesProfili, atanan) {
  const anahtar = String(konusan || '').toLowerCase() || '_'
  if (atanan.has(anahtar)) return atanan.get(anahtar)
  const adaylar = SES_HAVUZU[profilAnahtari(sesProfili)]
    || (SESLER[anahtar] ? [SESLER[anahtar]] : [VARSAYILAN_SES])
  const kullanilan = new Set(atanan.values())
  const ses = adaylar.find((a) => !kullanilan.has(a)) || adaylar[0]
  atanan.set(anahtar, ses)
  return ses
}

/** Gemini TTS ham PCM döndürüyor (24 kHz, 16-bit, mono) — WAV başlığı ekle. */
function wavSar(pcm, hz = 24000) {
  const b = Buffer.alloc(44)
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22); b.writeUInt32LE(hz, 24); b.writeUInt32LE(hz * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([b, pcm])
}

/**
 * Bir repliği seslendirir, WAV dosyası olarak yazar.
 * @returns {Promise<string|null>} dosya yolu, replik boşsa null
 */
/*
 * SESLENDİRME METNİ — yalnızca TTS'e giden metin; ekrandaki altyazı değişmez.
 * "1- Aynalar, 2- Kemer…" gibi numaralı saymalar TTS'te "bir tire / bir eksi"
 * diye okunabiliyor (11 Eyl 2026, kasko senaryosu). Rakam + ayraç yazıya
 * çevriliyor: "1- Aynalar" → "Bir, Aynalar".
 */
const SAYI_YAZI = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz', 'On']
function seslendirmeMetni(metin) {
  return String(metin).replace(/(^|[\s,;:(])(10|[1-9])\s*[-–.)]\s+/g,
    (_, on, sayi) => `${on}${SAYI_YAZI[Number(sayi)]}, `)
}

async function replikSeslendir(replik, sesAdi, hedefYol, ton) {
  const metin = String(replik || '').trim()
  if (!metin) return null

  const ses = sesAdi || VARSAYILAN_SES
  const okunacak = seslendirmeMetni(metin)
  const cevap = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`,
    { method: 'POST',
      headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        /*
         * TON: plan her replik için "heyecanlı ve neşeli" gibi bir ton veriyor.
         * Tonsuz okuma düz çıkıyordu; "ay burnuna bak!" repliği bile sakin
         * duyuluyordu (11 Eyl 2026).
         */
        contents: [{ parts: [{ text: `Doğal ve akıcı bir Türkçeyle, ${String(ton || '').trim() || 'sahneye uygun'} bir tonla söyle: ${okunacak}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: ses } } },
        },
      }) })

  if (!cevap.ok) {
    throw new Error(`TTS başarısız (${cevap.status}): ${(await cevap.text()).slice(0, 200)}`)
  }
  const j = await cevap.json()
  const b64 = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data
  if (!b64) throw new Error('TTS ses döndürmedi')

  /*
   * SESSİZLİĞİ KIRP — Gemini TTS repliğin başına ve sonuna sessizlik koyuyor.
   * Ölçüme o da girince 3 saniyelik replik 6 saniyelik klibe düşüyordu ve
   * klibin yarısı boş kalıyordu (11 Eyl 2026: iki sahnede 3'er sn ölü an).
   * Baştaki boşluğu artık SES_ONCESI ile biz veriyoruz.
   */
  const ham = hedefYol.replace(/\.wav$/, '-ham.wav')
  await fsp.writeFile(ham, wavSar(Buffer.from(b64, 'base64')))
  const kirp = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05'
  try {
    await calistir('ffmpeg', ['-v', 'error', '-i', ham,
      '-af', `${kirp},areverse,${kirp},areverse`, '-y', hedefYol])
  } catch (e) {
    gunlukle('TTS sessizliği kırpılamadı, ham ses kullanılıyor:', e.message)
    await fsp.copyFile(ham, hedefYol)
  }
  return hedefYol
}


/**
 * DÜKKÂN ZİLİ — ffmpeg ile sentezleniyor.
 *
 * Zili eskiden Veo üretiyordu. Artık Veo'nun ses kanalını silip Türkçe
 * seslendirme koyduğumuz için o zil de siliniyordu (11 Eyl 2026). Ses dosyası
 * lisansıyla uğraşmamak için iki tonlu kısa bir çan sesi burada üretiliyor.
 */
async function zilUret(hedefYol) {
  await calistir('ffmpeg', [
    '-v', 'error',
    '-f', 'lavfi', '-i', 'sine=frequency=1320:duration=0.9',
    '-f', 'lavfi', '-i', 'sine=frequency=990:duration=1.1',
    '-filter_complex',
    '[0:a]afade=t=out:st=0.05:d=0.85,volume=0.35[a];' +
    '[1:a]adelay=180|180,afade=t=out:st=0.25:d=0.85,volume=0.30[b];' +
    '[a][b]amix=inputs=2:normalize=0,aresample=24000[out]',
    '-map', '[out]', '-ac', '1', '-y', hedefYol,
  ])
  return hedefYol
}

/** Ses dosyasının süresi (sn). Klip süresini buna göre seçiyoruz. */
async function sesSuresi(yol) {
  return videoSuresi(yol)   // ffprobe format=duration her ikisinde de çalışıyor
}

/**
 * Repliğin kaç saniye süreceğinin TAHMİNİ. TTS'i bıraktığımız için ölçemiyoruz;
 * Türkçe konuşma hızı kabaca kelime başına 0,42 sn (ölçülen repliklerden:
 * 8 kelime ≈ 3,6 sn, 10 kelime ≈ 4,1 sn) artı nefes payı.
 */
function replikSuresiTahmin(replik) {
  const kelime = String(replik || '').trim().split(/\s+/).filter(Boolean).length
  return kelime ? kelime * 0.42 + 0.8 : 0
}

/** Replik sahne başından bu kadar sonra başlıyor — kesmenin hemen üstünde konuşmak yapay duruyor. */
const SES_ONCESI = 0.2
/*
 * GİRİŞ SAHNESİ ZAMAN ÇİZELGESİ: zil 0. saniyede, yeni gelenin repliği 2,5.
 * saniyede başlıyor. 0,5 sn'deyken replik, Veo çırağı daha cam kapının
 * dışında çizerken başlıyordu; cümlenin ilk yarısı ağzı oynayan reklamcının
 * üstüne düştü ve izleyen "bunu reklamcı söylüyor" dedi (11 Eyl 2026: çırak
 * ~2,2 sn'de içeri girdi). Prompt da giriş sahnesini aynı çizelgeyle yazdırıyor.
 * Bedeli: giriş sahnesi çoğu zaman 6 yerine 8 sn klip (~₺7).
 */
const ZIL_PAYI = 2.5
/** Replik bittikten sonra klipte kalan süre — tepkiye nefes payı. */
const SON_PAY = 0.5
/*
 * TEPKİ PAYI — son sahnede ve konuşmadan SONRA eylem gelen sahnede ("talks,
 * then slumps forward"). 11 Eyl 2026: son sahne 4 sn'ye düştü, doruk
 * cümlesinden sonra tepkiye 0,8 sn kaldı ve video donmuş kareyle bitti
 * ("3 sn boş, tepkisiz"); 2. sahnede stajyer "sonra masaya yığılır"ı hiç
 * oynayamadı. Bedeli: gerekirse klip 6 sn'ye çıkar.
 */
const TEPKI_PAYI = 1.5
const SONRAKI_EYLEM = /\bthen\b|\bfinally\b|\bafterwards?\b/i

/**
 * Sesin sığacağı en kısa Veo klibini seçer. Veo yalnızca 4, 6 veya 8 saniye
 * kabul ediyor; ölü saniye hem para hem tempo kaybı.
 *
 * `gerekliSn` = repliğin başlama gecikmesi (SES_ONCESI veya ZIL_PAYI) + replik.
 * 11 Eyl 2026'da gecikme hesaba katılmıyordu: zilli 3. sahnede replik videonun
 * bitişine 0,1 sn kala bitti, tepkiye hiç süre kalmadı.
 */
function klipSuresiSec(gerekliSn, sonPay = SON_PAY) {
  if (!gerekliSn || gerekliSn <= 0) return 8
  for (const sn of [4, 6, 8]) {
    if (gerekliSn + sonPay <= sn) return sn
  }
  return 8
}


/**
 * VEO'NUN KENDİ SESİ KORUNUYOR — üstüne yalnızca kapı zili karıştırılıyor.
 *
 * 12 Eyl 2026'da mimari değişti: replik artık PROMPT'un içinde, Veo cümleyi
 * kendisi söylüyor ve ağız hareketleri sesle senkron oluyor. Eskiden Veo'nun
 * sesini silip TTS koyuyorduk; kelimeler doğruydu ama dudaklar tutmuyordu
 * ("seslendirme çok daha kötü oldu, veo daha başarılıydı" — Özden).
 *
 * TTS katmanı (replikSeslendir, sesSec) kodda duruyor ama çağrılmıyor: geri
 * dönmek gerekirse hazır.
 */
async function zilKaristir(kaynak, sesler, gecici) {
  const zilli = (sesler || []).filter((x) => x && x.efekt)
  if (zilli.length === 0) return kaynak

  const girdiler = ['-i', kaynak]
  const gecikmeler = []
  let imlec = 0
  let n = 0
  for (const ses of sesler || []) {
    if (ses && ses.efekt) {
      girdiler.push('-i', ses.efekt)
      n += 1
      const ms = Math.round(imlec * 1000)
      // Zil sahnenin başında; Veo'nun konuşmasını bastırmasın diye kısık
      gecikmeler.push(`[${n}:a]adelay=${ms}|${ms},volume=0.5[z${n}]`)
    }
    imlec += (ses && ses.sn) || 0
  }

  const karis = gecikmeler.map((_, i) => `[z${i + 1}]`).join('')
  const suzgec = `${gecikmeler.join(';')};[0:a]${karis}amix=inputs=${n + 1}:dropout_transition=0:normalize=0,apad[ses]`

  const hedef = path.join(gecici, 'zilli.mp4')
  await calistir('ffmpeg', [
    '-v', 'error', ...girdiler,
    '-filter_complex', suzgec,
    '-map', '0:v', '-map', '[ses]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart',
    '-y', hedef,
  ])
  gunlukle(`zil karıştırıldı: ${n} adet (Veo sesi korundu)`)
  return hedef
}

// ─── Hook metnini videoya basma ──────────────────────────────────────────────

/** Yazı tipi — Dockerfile'da ttf-dejavu ile kuruluyor (Türkçe karakter içerir). */
const YAZI_TIPI = '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'

/** Metnin ekranda kalacağı süre (sn). Hook ilk anda okunup geçmeli. */
const HOOK_SANIYE = 4.5

/*
 * Sondaki donmuş kare süresi (sn). CTA artık son replik biter bitmez, tepki
 * canlı akarken beliriyor; donmuş kısım yalnızca okumayı tamamlatıyor.
 * 3,5 sn donmuş kare "boş, tepkisiz" bulundu (11 Eyl 2026).
 */
const CTA_SANIYE = 2.5

/** Satır başına en fazla karakter — 720 px genişlikte okunur kalması için. */
const SATIR_KARAKTER = 34

/**
 * Uzun metni satırlara böler. drawtext kendiliğinden sarmıyor; sarmazsak
 * metin kadrajın dışına taşıyor.
 */
function metniSar(metin, maks = SATIR_KARAKTER) {
  const kelimeler = String(metin).trim().split(/\s+/)
  const satirlar = []
  let satir = ''
  for (const k of kelimeler) {
    if (!satir) { satir = k; continue }
    if ((satir + ' ' + k).length <= maks) satir += ' ' + k
    else { satirlar.push(satir); satir = k }
  }
  if (satir) satirlar.push(satir)
  return satirlar.slice(0, 4)   // 4 satırdan uzun hook zaten okunmaz
}

/** Videonun toplam süresi (sn) — CTA penceresini hesaplamak için. */
async function videoSuresi(yol) {
  const { execFile } = require('node:child_process')
  return new Promise((cozumle) => {
    execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
                         '-of', 'default=nw=1:nk=1', yol],
      (hata, cikti) => cozumle(hata ? 24 : (parseFloat(cikti) || 24)))
  })
}

/**
 * Hook ve CTA metinlerini videoya yazar — kaynak formattaki "ekrana düşen
 * yorum" karşılığı.
 *
 * NEDEN VEO'YA YAZDIRMIYORUZ: Veo metin üretiminde Türkçe karakterleri
 * bozuyor (10 Eyl 2026'da "DİİGİTAL MARKETING" çıktı). Dış ses olarak
 * okutmayı da denedik; Veo anlatımı hiç üretmedi.
 *
 * Metin `textfile=` ile veriliyor: drawtext'in kendi kaçış kuralları
 * (`:` `'` `%` `\`) Türkçe cümlelerde kolayca patlıyor, dosyadan okurken
 * bu sorun yok.
 *
 * ⚠️ Bu adım YENİDEN KODLAMA gerektiriyor (-c copy ile metin basılamaz).
 * Sunucu CPU'su kısıtlı olduğu için 'veryfast' kullanılıyor ve süre
 * loglanıyor; pahalılaşırsa ilk klibe basmaya geçilebilir.
 */
async function metinBas(kaynak, hookMetni, ctaMetni, sesler, gecici) {
  const katmanlar = []

  /** Ortak drawtext süzgeci — yalnızca metin, konum ve zaman penceresi değişir. */
  async function katman(ad, metin, y, pencere) {
    const satirlar = metniSar(metin)
    if (satirlar.length === 0) return
    const dosya = path.join(gecici, `${ad}.txt`)
    await fsp.writeFile(dosya, satirlar.join('\n'), 'utf8')
    katmanlar.push([
      `drawtext=textfile='${dosya}'`,
      `fontfile='${YAZI_TIPI}'`,
      'fontcolor=white',
      'fontsize=30',
      'line_spacing=10',
      'box=1',
      'boxcolor=black@0.62',
      'boxborderw=20',
      'x=(w-text_w)/2',
      y,
      `enable='${pencere}'`,
    ].join(':'))
  }

  // Hook: başta, split-screen sınırının hemen üstünde
  await katman('hook', hookMetni, 'y=h*0.34-text_h', `between(t,0,${HOOK_SANIYE})`)

  /*
   * ALTYAZILAR — her replik kendi sahnesinin penceresinde.
   * Sahne süreleri artık sabit 8 sn değil (TTS uzunluğuna göre 4/6/8), bu
   * yüzden pencereler `sesler` listesindeki gerçek sürelerden hesaplanıyor.
   */
  /*
   * Pencereler PLANLANAN sürelerden hesaplanıyor; gerçek video kısa kalırsa
   * son altyazı CTA kartına taşıyor ve ikisi üst üste biniyordu (11 Eyl 2026).
   * Gerçek süreyle sınırlıyoruz.
   */
  const sure = await videoSuresi(kaynak)
  let imlec = 0
  /** Son repliğin bittiği an — CTA bundan hemen sonra geliyor. */
  let sonReplikBitis = 0
  for (const [i, ses] of (sesler || []).entries()) {
    const bas = imlec
    const son = Math.min(imlec + ses.sn, sure)
    imlec += ses.sn
    if (bas >= sure) break
    if (!ses.replik) continue
    // Altyazı repliğin başladığı anda çıkıyor: giriş sahnesinde yeni gelen
    // içeri girmeden onun cümlesi ekranda görünmesin
    const altyaziBas = Math.min(bas + (ses.gecikme || 0), son)
    // Replik bitince altyazı da kalkar (0,3 sn okuma payıyla) — sahne sonuna
    // kadar kalırsa CTA ile üst üste biniyor
    const altyaziSon = ses.sesSn ? Math.min(altyaziBas + ses.sesSn + 0.3, son) : son
    sonReplikBitis = Math.max(sonReplikBitis, altyaziSon)
    await katman(`altyazi${i}`, ses.replik, 'y=h*0.82',
      `between(t,${altyaziBas.toFixed(2)},${altyaziSon.toFixed(2)})`)
  }

  /*
   * CTA: SONDA. Videonun toplam süresini ffprobe ile ölçüyoruz — sahne sayısı
   * değişebildiği için sabit bir saniye varsayamayız.
   */
  /*
   * CTA ARTIK AYRI BİR KAPANIŞ KARTI: son kare CTA_SANIYE boyunca dondurulup
   * CTA onun üstüne basılıyor. Eskiden son 4 saniyeye basılıyordu; son sahne de
   * ~4 sn olunca CTA espri repliğinin altyazısının tam üstüne bindi ve ikisi de
   * okunmadı (11 Eyl 2026). Donmuş tepki karesi bilinen bir kapanış kalıbı ve
   * Veo kredisi harcamıyor.
   */
  let ctaUzatma = 0
  if (ctaMetni) {
    ctaUzatma = CTA_SANIYE
    // Son replik bitince — tepki hâlâ canlı akarken — gelir. Konumu HOOK'LA
    // AYNI (bölünmüş ekranın grafik tarafı, sınırın hemen üstü): yüzleri ve
    // altyazı alanını kapatmıyor, oynatıcı çubuğunun altında da kalmıyor.
    // Açılış ve kapanış aynı yerde — Özden'in önerisi, 11 Eyl 2026.
    const ctaBas = sonReplikBitis > 0 ? Math.min(sonReplikBitis + 0.4, sure) : sure
    await katman('cta', ctaMetni, 'y=h*0.34-text_h', `gte(t,${ctaBas.toFixed(2)})`)
  }

  if (katmanlar.length === 0) return kaynak

  const hedef = path.join(gecici, 'metinli.mp4')
  const basla = Date.now()
  await calistir('ffmpeg', [
    '-v', 'error', '-i', kaynak,
    // Tek geçiş: hook ve CTA aynı süzgeç zincirinde — iki kez kodlamıyoruz.
    // tpad önde: dondurulan kare de metin süzgeçlerinden geçsin.
    '-vf', [
      ...(ctaUzatma ? [`tpad=stop_mode=clone:stop_duration=${ctaUzatma}`] : []),
      ...katmanlar,
    ].join(','),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    // Kart süresince ses de uzamalı; yoksa bazı oynatıcılar sesin bittiği yerde duruyor
    ...(ctaUzatma
      ? ['-af', `apad=pad_dur=${ctaUzatma}`, '-c:a', 'aac', '-b:a', '128k']
      : ['-c:a', 'copy']),
    '-movflags', '+faststart',
    '-y', hedef,
  ])
  gunlukle(`metin basıldı: ${katmanlar.length} katman (${Math.round((Date.now() - basla) / 1000)} sn)`)
  return hedef
}

/** GET /dosya/<ad> — nginx buraya proxy yapıyor. */
async function dosyaVer(cevap, ad) {
  // Yol geçişi (path traversal) engeli: yalnızca düz uuid.mp4 kabul
  if (!/^[0-9a-f-]{36}\.mp4$/i.test(ad)) {
    return json(cevap, 400, { error: 'Geçersiz dosya adı' })
  }
  const yol = path.join(CIKTI, ad)
  let bilgi
  try {
    bilgi = await fsp.stat(yol)
  } catch {
    return json(cevap, 404, { error: 'Dosya bulunamadı veya süresi doldu' })
  }
  cevap.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Content-Length': bilgi.size,
    'Cache-Control': 'private, max-age=3600',
  })
  fs.createReadStream(yol).pipe(cevap)
}

// ─── Veo üretimi ─────────────────────────────────────────────────────────────

const VEO_TABAN   = 'https://generativelanguage.googleapis.com/v1beta'
const VEO_MODEL   = process.env.VEO_MODEL || 'veo-3.1-lite-generate-preview'
const MAKS_SAHNE  = Number(process.env.MAKS_SAHNE || 4)
const YOKLAMA_MS  = 10_000
const MAKS_YOKLAMA = 60           // 10 dk üst sınır (klip başına)

/** Devam eden ve biten işler. Süreç yeniden başlarsa kaybolur — kabul edilebilir,
 *  iş zaten en fazla 10 dakika sürüyor ve sonuç dosyası diskte kalıcı. */
const isler = new Map()

async function veoIstek(yol, secenekler = {}) {
  const cevap = await fetch(`${VEO_TABAN}/${yol}`, {
    ...secenekler,
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...(secenekler.headers || {}),
    },
  })
  const govde = await cevap.json().catch(() => ({}))
  if (!cevap.ok) {
    const mesaj = govde?.error?.message || `HTTP ${cevap.status}`
    throw new Error(`Veo: ${mesaj}`)
  }
  return govde
}

/**
 * Tek klip üretir ve indirme adresini döndürür.
 *
 * baslangicGorseli verilirse image-to-video olarak çağrılır — böylece önceki
 * klibin son karesinden devam eder ve karakter tutarlılığı korunur.
 * Bu alanın kabul edildiği DOĞRULANMADI; reddedilirse metin-tabanlı üretime
 * düşülüyor (klipler yine birleşir, yalnızca süreklilik zayıflar).
 */
async function klipUret(prompt, baslangicGorseli, saniye) {
  const ornek = { prompt }
  if (baslangicGorseli) {
    ornek.image = { bytesBase64Encoded: baslangicGorseli, mimeType: 'image/jpeg' }
  }

  let baslat
  try {
    baslat = await veoIstek(`models/${VEO_MODEL}:predictLongRunning`, {
      method: 'POST',
      body: JSON.stringify({
        instances: [ornek],
        parameters: {
          aspectRatio: '9:16',
          resolution: '720p',
          // Süre TTS sesinin uzunluğuna göre seçiliyor; ölü saniye = boşa ödeme
          ...(saniye ? { durationSeconds: saniye } : {}),
        },
      }),
    })
  } catch (e) {
    if (!baslangicGorseli) throw e
    // Görsel girdisi reddedildi — süreklilik olmadan devam et
    gunlukle('başlangıç görseli reddedildi, metin-tabanlı üretime düşülüyor:', e.message)
    return klipUret(prompt, null, saniye)
  }

  const islemAdi = baslat?.name
  if (!islemAdi) throw new Error('Veo işlem adı dönmedi')

  for (let i = 0; i < MAKS_YOKLAMA; i++) {
    await new Promise((r) => setTimeout(r, YOKLAMA_MS))
    const durum = await veoIstek(islemAdi)
    if (durum?.error) throw new Error(`Veo üretim hatası: ${durum.error.message}`)
    if (durum?.done) {
      const yanit = durum?.response?.generateVideoResponse
      const uri = yanit?.generatedSamples?.[0]?.video?.uri
      if (uri) return uri

      /*
       * "done" ama örnek yok — Veo üretimi ENGELLEMİŞ demektir.
       *
       * En sık sebebi içerik filtresi (RAI): başlangıç karesinde tanınabilir
       * insan yüzü varken image-to-video çağrısı zaman zaman reddediliyor.
       * Olasılıklı davranıyor — aynı zincirleme başka çalıştırmalarda geçti.
       *
       * Eskiden burada sadece "video adresi yok" deniyor ve TÜM iş çöpe
       * gidiyordu: 1. sahne üretilmiş, parası ödenmiş, ama kullanıcı hiçbir
       * şey alamıyordu (10 Eyl 2026). Artık gerekçe loglanıyor ve başlangıç
       * karesi varsa metin-tabanlı üretime düşülüyor — süreklilik zayıflar
       * ama video teslim edilir.
       */
      const gerekce = yanit?.raiMediaFilteredReasons?.join(' | ')
        || (yanit?.raiMediaFilteredCount ? 'içerik filtresi' : '')
        || JSON.stringify(yanit || durum).slice(0, 300)

      gunlukle('Veo örnek döndürmedi:', gerekce)

      if (baslangicGorseli) {
        gunlukle('başlangıç karesi olmadan yeniden deneniyor')
        return klipUret(prompt, null, saniye)
      }
      throw new Error(`Veo videoyu üretmedi: ${gerekce}`)
    }
  }
  throw new Error('Veo zaman aşımı (10 dk)')
}

/** Bir klibin son karesini base64 JPEG olarak verir — zincirleme için. */
async function sonKareBase64(videoUrl) {
  const sonuc = await sonKare({ videoUrl })
  return sonuc.jpegBase64
}

async function isiCalistir(isId, sahneler, hookMetni, ctaMetni) {
  const is = isler.get(isId)
  const adresler = []
  /** Sahne başına { yol, sn, replik } — ses bindirme ve altyazı bunu kullanıyor. */
  const sesler = []
  /** Bu işte konuşan → ses. Aynı karakter tüm sahnelerde aynı sesi korur. */
  const atananSesler = new Map()
  let onsekiKare = null
  const sesDizini = await gecicidizinAc()

  try {
    for (const [i, sahne] of sahneler.entries()) {
      is.ilerleme = `sahne ${i + 1}/${sahneler.length} üretiliyor`
      gunlukle(`[${isId}] ${is.ilerleme}`)

      /*
       * ÖNCE SES, SONRA GÖRÜNTÜ.
       * TTS sesinin gerçek uzunluğunu ölçüp klip süresini ona göre seçiyoruz.
       * Ters sırada yapsaydık her klip 8 saniye olurdu ve kısa repliklerde
       * yarısı ölü kalırdı — hem tempo hem para kaybı (11 Eyl 2026).
       */
      // Zil ÖNCE: repliğin başlama anı, dolayısıyla klip süresi ona bağlı
      let efektYolu = null
      if (sahne.efekt === 'zil') {
        try { efektYolu = await zilUret(path.join(sesDizini, `z${i}.wav`)) }
        catch (e) { gunlukle(`[${isId}] zil üretilemedi:`, e.message) }
      }
      /*
       * Prompt giriş zaman çizelgesiyle yazıldıysa ("From the third second, X
       * talks") replik 2,5 sn'de başlamalı — zil olmasa bile. 11 Eyl 2026: yan
       * masada başını kaldıran usta için çizelge yazıldı ama zil yoktu; replik
       * 0,2 sn'de başlayıp başka birinin ağzına düşecekti.
       */
      const zamanCizelgeli = /\bfrom the third second\b/i.test(String(sahne.prompt || ''))
      const gecikme = (efektYolu || zamanCizelgeli) ? ZIL_PAYI : SES_ONCESI

      /*
       * VEO KONUŞUYOR (12 Eyl 2026): replik prompt'un içinde gidiyor, ses ve
       * dudak senkronu Veo'dan geliyor. Klip süresini repliğin uzunluğundan
       * tahmin ediyoruz — ölçecek bir ses dosyası yok.
       */
      const sesSn = replikSuresiTahmin(sahne.replik)
      const klipSn = sahne.replik ? klipSuresiSec(gecikme + sesSn, tepkiPayi) : 8
      if (sahne.replik) {
        gunlukle(`[${isId}] sahne ${i + 1}: replik ~${sesSn.toFixed(1)} sn (tahmin) → ${klipSn} sn klip · ses Veo`)
      }
      sesler.push({ yol: null, sn: klipSn, gecikme, sesSn, replik: sahne.replik || '', efekt: efektYolu })

      is.ilerleme = `sahne ${i + 1}/${sahneler.length} üretiliyor`
      // Bu sahne zincirlenmeyecekse önceki kare kullanılmıyor
      const uri = await klipUret(
        sahne.prompt, sahne.zincirle === false ? null : onsekiKare, klipSn)
      adresler.push(uri)

      /*
       * Son kare YALNIZCA bir sonraki sahne zincirlenecekse hazırlanıyor.
       *
       * Zincirleme sürekli hareket için doğru (aynı özne devam ediyor), ama
       * KESME için yanlış: sahne yeni bir özneye geçiyorsa (ör. kamera yere
       * inip kedileri gösteriyorsa) önceki karenin kompozisyonu Veo'yu
       * kısıtlar. O yüzden sahne başına açılıp kapanabiliyor.
       */
      const sonraki = sahneler[i + 1]
      if (sonraki && sonraki.zincirle !== false) {
        is.ilerleme = `sahne ${i + 1} son karesi alınıyor`
        try {
          onsekiKare = await sonKareBase64(uri)
        } catch (e) {
          gunlukle(`[${isId}] son kare alınamadı, zincir kırıldı:`, e.message)
          onsekiKare = null
        }
      }
    }

    if (adresler.length === 1) {
      // Tek klip — birleştirmeye gerek yok, doğrudan indirip servis et
      is.ilerleme = 'klip kaydediliyor'
      await fsp.mkdir(CIKTI, { recursive: true })
      const ad = `${crypto.randomUUID()}.mp4`
      const hedef = path.join(CIKTI, ad)

      /*
       * Ham klip ASLA doğrudan verilmiyor: Veo'nun sesi her durumda silinmeli.
       * Eskiden hook/replik yoksa ham dosya iniyordu ve Veo'nun uydurduğu
       * İngilizce konuşma videoda kalıyordu (11 Eyl 2026).
       */
      const gecici = await gecicidizinAc()
      try {
        const ham = path.join(gecici, 'ham.mp4')
        await indir(adresler[0], ham)
        const sesli = await zilKaristir(ham, sesler, gecici)
        const metinli = await metinBas(sesli, hookMetni, ctaMetni, sesler, gecici)
        await fsp.copyFile(metinli, hedef)
      } finally {
        await fsp.rm(gecici, { recursive: true, force: true })
      }

      const bilgi = await fsp.stat(hedef)
      is.sonuc = { url: `/medya/${ad}`, dosya: ad, bayt: bilgi.size, klipSayisi: 1 }
    } else {
      is.ilerleme = 'klipler birleştiriliyor'
      is.sonuc = await birlestir({ videoUrls: adresler, hookMetni, ctaMetni, sesler })
    }

    is.durum = 'bitti'
    is.ilerleme = 'tamamlandı'
    gunlukle(`[${isId}] bitti → ${is.sonuc.url}`)
  } catch (e) {
    is.durum = 'hata'
    is.hata = e.message
    gunlukle(`[${isId}] HATA:`, e.message)
  } finally {
    await fsp.rm(sesDizini, { recursive: true, force: true })
  }
}

/**
 * POST /video-uret  { sahneler: [{prompt}], zincirle? }
 * → { isId }   (hemen döner, üretim arka planda sürer)
 */
function videoUret(govde) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY tanımlı değil')

  /*
   * Hook metni videoya SONRADAN basılıyor (drawtext). Veo'ya yazdırmak
   * Türkçe karakterleri bozuyor, dış ses olarak okutmak ise hiç çalışmadı
   * (10 Eyl 2026). 300 karakterle sınırlı: daha uzunu ekranda okunmuyor.
   */
  const hookMetni = String(govde.hookMetni || '').trim().slice(0, 300)
  /** Kapanış çağrısı — videonun son saniyelerinde ekranda kalır. */
  const ctaMetni  = String(govde.ctaMetni  || '').trim().slice(0, 300)

  const sahneler = Array.isArray(govde.sahneler) ? govde.sahneler : []
  if (sahneler.length === 0) throw new Error('En az bir sahne gerekli')
  if (sahneler.length > MAKS_SAHNE) throw new Error(`En fazla ${MAKS_SAHNE} sahne`)
  for (const s of sahneler) {
    if (typeof s?.prompt !== 'string' || s.prompt.trim().length < 10) {
      throw new Error('Her sahnenin en az 10 karakterlik bir prompt alanı olmalı')
    }
  }

  const isId = crypto.randomUUID()
  isler.set(isId, {
    durum: 'calisiyor',
    ilerleme: 'başlıyor',
    sahneSayisi: sahneler.length,
    baslangic: Date.now(),
  })

  // Arka planda çalıştır — istek beklemesin
  isiCalistir(isId, sahneler, hookMetni, ctaMetni)

  return { isId, sahneSayisi: sahneler.length, tahminiSaniye: sahneler.length * 90 }
}

function isDurumu(isId) {
  const is = isler.get(isId)
  if (!is) return null
  return {
    isId,
    durum: is.durum,
    ilerleme: is.ilerleme,
    sahneSayisi: is.sahneSayisi,
    gecenSaniye: Math.round((Date.now() - is.baslangic) / 1000),
    ...(is.sonuc ? { sonuc: is.sonuc } : {}),
    ...(is.hata ? { hata: is.hata } : {}),
  }
}

// ─── Eski dosyaları temizle ──────────────────────────────────────────────────

async function temizle() {
  try {
    const simdi = Date.now()
    const sinir = SAKLAMA_SAATI * 3600 * 1000

    // 1) Süresi dolanları at, kalanları yaş/boyutuyla topla
    const kalan = []
    for (const ad of await fsp.readdir(CIKTI).catch(() => [])) {
      const yol = path.join(CIKTI, ad)
      const bilgi = await fsp.stat(yol).catch(() => null)
      if (!bilgi || !bilgi.isFile()) continue

      if (simdi - bilgi.mtimeMs > sinir) {
        await fsp.rm(yol, { force: true })
        gunlukle('süresi doldu, silindi:', ad)
        continue
      }
      kalan.push({ ad, yol, mtime: bilgi.mtimeMs, bayt: bilgi.size })
    }

    // 2) Depo tavanı — süresi dolmamış olsa da en eskiden başlayarak sil
    let toplam = kalan.reduce((t, d) => t + d.bayt, 0)
    if (toplam <= MAKS_DEPO_BAYT) return

    gunlukle(`depo tavanı aşıldı: ${(toplam / 1e9).toFixed(2)} GB`)
    const eskiden = [...kalan].sort((a, b) => a.mtime - b.mtime)
    for (const d of eskiden) {
      if (toplam <= MAKS_DEPO_BAYT) break
      await fsp.rm(d.yol, { force: true })
      toplam -= d.bayt
      gunlukle('depo tavanı, silindi:', d.ad)
    }
  } catch (e) {
    gunlukle('temizlik hatası:', e.message)
  }
}

// ─── Sunucu ──────────────────────────────────────────────────────────────────

const sunucu = http.createServer(async (istek, cevap) => {
  const yol = (istek.url || '').split('?')[0]

  try {
    if (istek.method === 'GET' && yol === '/saglik') {
      return json(cevap, 200, { durum: 'ayakta', anahtar: Boolean(API_KEY) })
    }
    if (istek.method === 'GET' && yol.startsWith('/dosya/')) {
      return await dosyaVer(cevap, decodeURIComponent(yol.slice('/dosya/'.length)))
    }
    if (istek.method === 'POST' && yol === '/son-kare') {
      return json(cevap, 200, await sonKare(await govdeOku(istek)))
    }
    if (istek.method === 'POST' && yol === '/birlestir') {
      return json(cevap, 200, await birlestir(await govdeOku(istek)))
    }
    if (istek.method === 'POST' && yol === '/video-uret') {
      return json(cevap, 202, videoUret(await govdeOku(istek)))
    }
    if (istek.method === 'GET' && yol.startsWith('/is/')) {
      const durum = isDurumu(decodeURIComponent(yol.slice('/is/'.length)))
      return durum
        ? json(cevap, 200, durum)
        : json(cevap, 404, { error: 'İş bulunamadı' })
    }
    return json(cevap, 404, { error: 'Bilinmeyen uç' })
  } catch (e) {
    gunlukle('HATA', yol, e.message)
    return json(cevap, 400, { error: e.message })
  }
})

sunucu.headersTimeout = 300_000
sunucu.requestTimeout = 300_000

sunucu.listen(PORT, () => {
  gunlukle(`medya servisi ${PORT} portunda · anahtar ${API_KEY ? 'var' : 'YOK'}`)
  temizle()
  setInterval(temizle, 6 * 3600 * 1000)
})
