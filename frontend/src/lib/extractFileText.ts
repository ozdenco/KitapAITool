import * as pdfjsLib from 'pdfjs-dist'
import {
  KABUL_EDILEN_TIPLER,
  MAKS_DOSYA_BOYUTU,
  MAKS_METIN_KARAKTER,
  DosyaHatasi,
  type CikarilanMetin,
} from '@/lib/fileTextConstants'

/*
 * Vite worker'ı ayrı bir chunk olarak paketler, çalışma zamanında URL'den yükler.
 *
 * `?mime2` sorgusu ÖNBELLEK ZEHİRLENMESİNİ temizlemek için: 24 Eyl 2026'ya
 * kadar nginx .mjs'i application/octet-stream olarak sunuyordu ve bu uzantı
 * hiçbir cache kuralına düşmediği için tarayıcılar yanıtı SEZGİSEL olarak
 * saklayabiliyordu. Sunucu düzeltildikten sonra bile, dosya adı (içerik özeti)
 * değişmediğinden eski kullanıcı kendi önbelleğindeki yanlış MIME'lı yanıtı
 * kullanmaya devam ediyor ve modül worker'ı yine başlamıyor. Sorgu dizesi
 * değişince adres yeni sayılıyor; kimsenin sert yenileme yapması gerekmiyor.
 *
 * pdf.js sorguyu yok sayar; yalnızca indirme adresidir.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString() + '?mime2'

// ─── Doğrulama ────────────────────────────────────────────────────────────────

function dosyaTipiniDogrula(file: File): void {
  const uzanti = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
  if (!KABUL_EDILEN_TIPLER.includes(uzanti as (typeof KABUL_EDILEN_TIPLER)[number])) {
    throw new DosyaHatasi(`Desteklenmeyen dosya türü. Yalnızca ${KABUL_EDILEN_TIPLER.join(', ')} kabul edilir.`)
  }
  if (file.size > MAKS_DOSYA_BOYUTU) {
    throw new DosyaHatasi(`Dosya çok büyük (maks. ${MAKS_DOSYA_BOYUTU / 1024 / 1024} MB).`)
  }
}

// ─── Metin temizleme ────────────────────────────────────────────────────────

/**
 * Ham çıkarılan metindeki gürültüyü azaltır — token maliyetini düşürmek için:
 *  - fazla boşluk/satır sonu sıkıştırılır
 *  - yalnızca sayfa numarasından ibaret satırlar atılır ("12", "Sayfa 3/10")
 *  - art arda tekrar eden satırlar (üstbilgi/altbilgi) bir kereye indirilir
 */
function metniTemizle(ham: string): string {
  const SAYFA_NO_REGEX = /^(sayfa\s*)?\d+(\s*\/\s*\d+)?$/i

  const satirlar = ham
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !SAYFA_NO_REGEX.test(s))

  const tekillestirilmis: string[] = []
  for (const satir of satirlar) {
    const oncekiyleAyni = tekillestirilmis[tekillestirilmis.length - 1] === satir
    if (!oncekiyleAyni) tekillestirilmis.push(satir)
  }

  return tekillestirilmis.join('\n').replace(/[ \t]{2,}/g, ' ').trim()
}

function kirp(metin: string): CikarilanMetin {
  const hamKarakterSayisi = metin.length
  if (metin.length <= MAKS_METIN_KARAKTER) {
    return { metin, kirpildiMi: false, hamKarakterSayisi }
  }
  return {
    metin: metin.slice(0, MAKS_METIN_KARAKTER) + '\n[…metin uzunluk sınırı nedeniyle kısaltıldı]',
    kirpildiMi: true,
    hamKarakterSayisi,
  }
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/** streamTextContent'in verdiği parçanın ihtiyacımız olan kısmı (tip tanımı `ReadableStream` döndürüyor) */
interface MetinParcasi {
  items: Array<{ str?: string }>
}

/**
 * Bir sayfanın metnini okur.
 *
 * `sayfa.getTextContent()` KULLANILMIYOR — pdf.js onu içeride
 * `for await (const parca of akis)` ile yazıyor, yani ReadableStream üzerinde
 * ASYNC YİNELEME yapıyor. WebKit bunu desteklemiyor: Safari'de
 * `akis[Symbol.asyncIterator]` undefined kalıyor ve
 * `TypeError: undefined is not a function (near '...t of e...')` fırlıyor.
 *
 * 24 Eyl 2026'da Safari 26.6.2'de ölçüldü: getDocument çalışıyor, hata tam
 * olarak getTextContent'in içinde. pdf.js'in legacy derlemesi de aynı yerde
 * düşüyor — yani derleme seçimiyle ilgisi yok, eksik olan tarayıcı özelliği.
 * Akışı elle okumak async yinelemeyi tamamen devre dışı bırakıyor; aynı
 * Safari'de 3 sayfa / 5956 karakter başarıyla okundu.
 */
async function sayfaMetniniOku(sayfa: pdfjsLib.PDFPageProxy): Promise<string> {
  const okuyucu = sayfa.streamTextContent().getReader()
  const parcalar: string[] = []
  try {
    for (;;) {
      const { value, done } = await okuyucu.read()
      if (done) break
      const parca = value as MetinParcasi
      parcalar.push(parca.items.map((item) => item.str ?? '').join(' '))
    }
  } finally {
    okuyucu.releaseLock()
  }
  return parcalar.join(' ')
}

async function pdfMetniniCikar(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const sayfaMetinleri: string[] = []
  for (let sayfaNo = 1; sayfaNo <= pdf.numPages; sayfaNo++) {
    const sayfa = await pdf.getPage(sayfaNo)
    sayfaMetinleri.push(await sayfaMetniniOku(sayfa))
  }
  return sayfaMetinleri.join('\n')
}

/**
 * pdf.js hatasını kullanıcının ne yapacağını bildiği bir cümleye çevirir.
 *
 * 24 Eyl 2026: burada tek bir catch-all vardı ("Dosya okunamadı. Dosyanın
 * bozuk olmadığından emin olun.") ve dosya bozuk DEĞİLDİ. Gerçek sebep nginx'in
 * .mjs'i application/octet-stream sunması, dolayısıyla modül worker'ının hiç
 * başlamamasıydı — mesaj kullanıcıyı da beni de yanlış yere baktırdı. Parola
 * korumalı PDF, geçersiz dosya ve worker arızası birbirinden tamamen farklı
 * şeyler; aynı cümleyi göstermek teşhisi imkânsızlaştırıyor.
 *
 * Teknik ek parantez içinde bilerek bırakılıyor: kullanıcı bunu aynen
 * iletebiliyor ve sorun tek turda çözülüyor.
 */
function pdfHatasiniAcikla(error: unknown): string {
  const ad = (error as { name?: string } | null)?.name ?? ''
  const mesaj = (error as { message?: string } | null)?.message ?? ''

  if (ad === 'PasswordException') {
    return 'Bu PDF parola korumalı. Parolayı kaldırıp tekrar yükleyin.'
  }
  if (ad === 'InvalidPDFException') {
    return 'Dosya geçerli bir PDF değil ya da içeriği bozulmuş.'
  }
  if (/worker|dynamically imported|importScripts/i.test(mesaj)) {
    return 'PDF okuyucu bileşeni yüklenemedi. Sayfayı sert yenileyip ' +
      '(Ctrl+Shift+R / Cmd+Shift+R) tekrar deneyin.'
  }
  const ek = [ad, mesaj.slice(0, 100)].filter(Boolean).join(': ')
  return `PDF okunamadı${ek ? ` (${ek})` : ''}. Sorun sürerse bu mesajı olduğu gibi iletin.`
}

// ─── Genel giriş noktası ────────────────────────────────────────────────────

/**
 * Bir dosyadan (PDF veya TXT) metin çıkarır, gürültüyü temizler ve token
 * bütçesine göre kırpar. Tamamen tarayıcıda çalışır — dosya hiçbir zaman
 * backend'e veya n8n'e gönderilmez, yalnızca çıkan metin AI prompt'una eklenir.
 *
 * Sayfa bileşenleri bu fonksiyonu `await import('@/lib/extractFileText')`
 * ile DİNAMİK çağırmalı — bkz. fileTextConstants.ts başındaki not.
 */
export async function extractFileText(file: File): Promise<CikarilanMetin> {
  dosyaTipiniDogrula(file)

  let ham: string
  try {
    ham = file.name.toLowerCase().endsWith('.pdf')
      ? await pdfMetniniCikar(file)
      : await file.text()
  } catch (error) {
    console.error('Dosya metni çıkarılamadı:', error)
    throw new DosyaHatasi(pdfHatasiniAcikla(error))
  }

  const temiz = metniTemizle(ham)
  if (temiz.length === 0) {
    throw new DosyaHatasi('Dosyadan metin çıkarılamadı (taranmış görsel PDF olabilir).')
  }

  return kirp(temiz)
}
