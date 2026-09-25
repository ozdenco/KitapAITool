import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { dinamikYukle } from '@/lib/dinamikYukle'
import { parseAiJson, extractAiContent } from '@/lib/parseAiJson'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { MiniChatbotTest } from '@/components/tools/MiniChatbotTest'
import { SiteyeEkleKarti } from '@/components/tools/SiteyeEkleKarti'
import { DosyaHatasi, KABUL_EDILEN_TIPLER, MAKS_METIN_KARAKTER } from '@/lib/fileTextConstants'
import { useProfilOnDolgu } from '@/hooks/useIsletmeProfili'
import { markaKurallari } from '@/lib/markaKurallari'
import { SEKTORLER } from '@/lib/sektorler'
import { AramaliSecici } from '@/components/ui/AramaliSecici'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OzelMesaj {
  tip: string
  metin: string
}

interface SssKart {
  soru: string
  cevap: string
  /** Mini test penceresindeki eşleştirme için AI'dan gelen arama kelimeleri (eski kayıtlarda yok) */
  anahtar_kelimeler?: string[]
}

interface ChatbotResult {
  ozel_mesajlar: OzelMesaj[]
  sss_kartlari: SssKart[]
  ipuclari?: string[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const YONLENDIRME_HEDEFLERI = [
  { value: 'Randevu Al', label: 'Randevu Al' },
  { value: 'Fiyat Teklifi', label: 'Fiyat Teklifi' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Telefon', label: 'Telefon' },
  { value: 'Web Sitesi', label: 'Web Sitesi' },
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

/**
 * Yönlendirme hedefini ("WhatsApp'a yönlendir") tek bir arama kelimesine
 * indirger. Anahtar kelime listesine cümle değil terim girmeli.
 */
function sadeKelime(metin: string): string {
  return metin.trim().split(/\s+/)[0]?.toLocaleLowerCase('tr') ?? 'iletişim'
}

function buildPrompt(f: {
  biz: string; sector: string; services: string; hours: string
  faqs: string[]; redirectGoal: string; redirectLink: string
  fileText?: string
}): string {
  const faqList = f.faqs.filter(Boolean).map((q, i) => `${i + 1}. ${q}`).join('\n')

  // Kullanıcı bir belge yüklediyse (ör. işe alım prosedürü, izin kullanım
  // talimatı) SSS'ler yalnızca formdaki alanlara değil bu belgeye de dayanır.
  const dosyaBolumu = f.fileText
    ? `\nEk bilgi kaynağı (kullanıcının yüklediği belgeden çıkarıldı):\n"""\n${f.fileText}\n"""\n` +
      `Bu belgedeki HER konu başlığı için ayrı bir SSS kartı üret — belgede geçen ` +
      `tüm kural, hak, süre, istisna ve prosedürleri kapsa. Belgeyle çelişme.\n` +
      `Sorular ziyaretçinin gerçekte soracağı şekilde yazılmalı ve BİRBİRİNDEN ` +
      `FARKLI anahtar kelimeler içermeli (ör. "reddedebilir", "bölünebilir", ` +
      `"devreder", "paraya"). Aynı kelimelerle başlayan benzer sorular üretme.\n`
    : ''

  return `[ÖNEMLİ: Düşünce sürecini (think bloğunu) KISA tut — plan yapma, soruları önceden listeleme, sayım kontrolü yapma. Doğrudan JSON üretmeye başla. Belge geniş olsa bile analiz yazma; kartları yazarken düşün.]

Sen chatbot tasarımı uzmanısın. Müşteri iletişimi için hazır chatbot metinleri ve SSS yanıtları oluşturuyorsun.

İşletme: ${f.biz}
Sektör: ${f.sector}
Sunulan hizmetler: ${f.services}
Mesai saatleri: ${f.hours || 'belirtilmemiş'}
Yönlendirme hedefi: ${f.redirectGoal}
Yönlendirme linki/numarası: ${f.redirectLink || 'belirtilmemiş'}

Sıkça sorulan sorular:
${faqList || 'sektöre göre tipik SSS'}
${dosyaBolumu}
${f.biz} için hazır chatbot mesajları ve SSS kartları oluştur.

SADECE JSON döndür:
{
  "ozel_mesajlar": [
    { "tip": "Karşılama Mesajı", "metin": "<merhaba mesajı, emoji kullanabilirsin>" },
    { "tip": "Mesai Dışı Mesaj", "metin": "<şu an hizmet veremiyoruz mesajı>" },
    { "tip": "Kapanış Mesajı", "metin": "<ziyaretçi teşekkür edip ayrılırken verilen kısa veda mesajı>" },
    { "tip": "${f.redirectGoal} Yönlendirmesi", "metin": "<${f.redirectGoal} için yönlendirme mesajı>" }
  ],
  "sss_kartlari": [
    { "soru": "<müşterinin sorduğu soru>", "anahtar_kelimeler": ["<4-8 arama kelimesi>"], "cevap": "<bot cevabı, kısa ve net>" }
  ],
  "ipuclari": ["<chatbot kurulum ve kullanım için 3-4 pratik ipucu>"],
  "ctaText": "<${f.biz} için teşvik cümlesi>"
}
SSS'de sorulan soruların tamamını yanıtla. Türkçe, samimi ve net olsun.

TEMEL BİLGİ KARTLARI — sss_kartlari'nın EN BAŞINA şunları koy, cevaplarını
yukarıdaki form bilgilerinden yaz:
${f.hours.trim()
  ? `1. Çalışma saatleri ve hangi günler açık olduğu → cevap: "${f.hours}"\n` +
    `   anahtar kelimeler: ["çalışma saatleri", "kaçta açılıyor", "kaçta kapanıyor", "hangi günler", "cumartesi", "pazar", "açık mısınız"]\n`
  : ''}${f.hours.trim() ? '2' : '1'}. Hangi hizmetleri sunduğu → cevap "${f.services}" bilgisinden
   anahtar kelimeler: ["hizmetleriniz", "ürünleriniz", "ürünler", "ne satıyorsunuz", "ne yapıyorsunuz", "neler sunuyorsunuz", "hizmet"]
${f.hours.trim() ? '3' : '2'}. ${f.redirectGoal} için nasıl ulaşılacağı → ${f.redirectLink || 'belirtilen iletişim kanalı'}
   anahtar kelimeler: ["iletişim", "nasıl ulaşırım", "telefon", "randevu", "${sadeKelime(f.redirectGoal)}"]

Bu kartlar ziyaretçinin en çok sorduğu şeyler; belge yüklenmiş olsa bile
ATLANMAZ ve belge kartlarından ÖNCE gelir.

ANAHTAR KELİMELER (test sohbetinin doğru kartı bulması buna bağlı): her kart için
kullanıcının o konuyu sorarken yazabileceği 4-8 kelime ver. EŞANLAMLILARI ve
günlük dildeki karşılıklarını MUTLAKA ekle — kullanıcı sorusunu kartın
başlığındaki kelimelerle yazmaz. Örnek: "Raporlu günler izin yerine geçer mi?"
kartı için ["rapor", "hastalık", "istirahat", "sağlık raporu", "hasta"];
"Pazar ve resmi tatiller" kartı için ["hafta sonu", "haftasonu", "pazar",
"cumartesi", "resmi tatil", "bayram"]. Soru cümlesindeki kelimeleri aynen
tekrarlamak yetmez.

ÇIPLAK KÖK DEĞİL, ZİYARETÇİNİN YAZDIĞI EKLİ BİÇİM: "ürün" yerine
"ürünleriniz", "hizmet" yerine "hizmetleriniz", "fiyat" yerine
"fiyatlarınız" gibi biçimleri de listeye koy; "ne satıyorsunuz",
"neler yapıyorsunuz" gibi günlük kalıpları da ekle. Sebebi ölçüldü:
çıplak kök birçok kartta birden geçtiği için ayırt edici olmuyor ve
"ürünleriniz hakkında bilgi verir misiniz" gibi GENEL sorular cevapsız
kalıyor; ekli biçim tek kartta geçtiği için soruyu doğru karta taşıyor.
${f.fileText
  /*
   * 23 Eyl 2026: burada "en az 20, mümkünse 30 kart" yazıyordu. 21 konulu bir
   * mevzuat belgesi yüklendiğinde model bütün token bütçesini DÜŞÜNMEYE
   * harcadı — 30 kartı önceden planladı, tek tek listeledi, anahtar kelime
   * çakışmalarını kontrol etti, sayım yaptı — ve </think> kapandığında
   * bütçe bitmişti. Yanıtın tamamı think bloğuydu, JSON hiç üretilmedi.
   * Kullanıcı "Yapay zeka yanıtı işlenemedi" gördü, 15 kredi boşa gitti.
   *
   * Sayı hedefi yerine KAPSAM hedefi veriliyor: belgedeki her konu bir kart.
   * Böylece model sayım/planlama yapmak zorunda kalmıyor.
   */
  ? 'sss_kartlari belgedeki her konu başlığını kapsasın; konu sayısı kaç ise o kadar kart üret. Sayı hedefi tutturmak için konu uydurma, sayım kontrolü de yapma.'
  : 'sss_kartlari en az 8 kart içersin.'}
${markaKurallari()}`
}

// ─── Belge kalıcılığı ─────────────────────────────────────────────────────────

const BELGE_STORAGE_KEY = 'kkb-chatbot-belge'

interface KayitliBelge {
  ad: string
  metin: string
}

/** Daha önce yüklenen belgeyi okur; bozuk/eksik kayıt sessizce yok sayılır. */
function belgeyiOku(): KayitliBelge | null {
  try {
    const raw = localStorage.getItem(BELGE_STORAGE_KEY)
    if (!raw) return null
    const k = JSON.parse(raw) as Record<string, unknown>
    return typeof k.ad === 'string' && typeof k.metin === 'string'
      ? { ad: k.ad, metin: k.metin }
      : null
  } catch (error) {
    console.error('Kayıtlı belge okunamadı:', error)
    return null
  }
}

function belgeyiYaz(belge: KayitliBelge | null): void {
  try {
    if (belge) localStorage.setItem(BELGE_STORAGE_KEY, JSON.stringify(belge))
    else localStorage.removeItem(BELGE_STORAGE_KEY)
  } catch (error) {
    // Kota dolabilir (büyük belge) — özellik çalışmaya devam etmeli
    console.error('Belge kaydedilemedi:', error)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatbotSenaryoPage() {
  const queryClient = useQueryClient()
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [services, setServices] = useState('')
  const [hours, setHours] = useState('')
  const [faqs, setFaqs] = useState<string[]>(['', '', '', '', ''])
  const [redirectGoal, setRedirectGoal] = useState('')
  const [redirectLink, setRedirectLink] = useState('')
  const [result, setResult] = useState<ChatbotResult | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)

  // ── Ek bilgi belgesi (opsiyonel) ─────────────────────────────────────────
  // Tamamen tarayıcıda işlenir; dosya asla backend'e/n8n'e gönderilmez,
  // yalnızca çıkarılan metin prompt'a eklenir. Çıkarılan metin tarayıcıda
  // saklanır ki kullanıcı her form doldurduğunda dosyayı yeniden seçmesin.
  const kayitliBelge = useState(() => belgeyiOku())[0]
  const [fileName, setFileName]     = useState<string | null>(kayitliBelge?.ad ?? null)
  const [fileText, setFileText]     = useState<string | undefined>(kayitliBelge?.metin)
  const [fileError, setFileError]   = useState<string | null>(null)
  const [fileParsing, setFileParsing] = useState(false)
  const [fileTruncated, setFileTruncated] = useState(false)
  /** Belgeden çıkarılan ham karakter sayısı — kullanıcı ne kadarının kullanıldığını görsün */
  const [fileKarakter, setFileKarakter] = useState<number | null>(null)

  // İşletme profilinden ön dolgu — boş alanlar doldurulur, kullanıcının
  // yazdığına dokunulmaz (bkz. useProfilOnDolgu).
  useProfilOnDolgu({
    businessName: [biz, setBiz],
    sector: [sector, setSector],
    productService: [services, setServices],
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File | undefined) => {
    setFileError(null)
    setFileTruncated(false)
    if (!file) return

    setFileParsing(true)
    try {
      // pdfjs-dist (~250KB) yalnızca kullanıcı gerçekten dosya seçtiğinde
      // indirilsin diye burada dinamik import ediliyor — bkz. fileTextConstants.ts
      const { extractFileText } = await dinamikYukle(() => import('@/lib/extractFileText'))
      const { metin, kirpildiMi, hamKarakterSayisi } = await extractFileText(file)
      setFileName(file.name)
      setFileText(metin)
      setFileTruncated(kirpildiMi)
      setFileKarakter(hamKarakterSayisi)
      belgeyiYaz({ ad: file.name, metin })   // sonraki ziyarette hatırlansın
    } catch (error) {
      setFileName(null)
      setFileText(undefined)
      setFileError(error instanceof DosyaHatasi ? error.message : 'Dosya işlenemedi.')
    } finally {
      setFileParsing(false)
    }
  }

  const clearFile = () => {
    setFileName(null)
    setFileText(undefined)
    setFileError(null)
    setFileTruncated(false)
    setFileKarakter(null)
    belgeyiYaz(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const updateFaq = (i: number, value: string) =>
    setFaqs((prev) => prev.map((f, idx) => idx === i ? value : f))

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, services, hours, faqs, redirectGoal, redirectLink, fileText })
      const res = await api.post('/tools/chatbot-senaryo/run', {
        prompt,
        isletmeAdi: biz,
          /* Geçmiş Çıktılar'da "bu çıktı hangi bilgilerle üretildi" kartı için. */
        formBilgileri: {
          'İşletme': biz, 'Sektör': sector, 'Sunulan hizmetler': services,
          'Mesai saatleri': hours || 'belirtilmedi',
          'Yönlendirme hedefi': redirectGoal, 'Yönlendirme linki': redirectLink,
          'SSS sayısı': String(faqs.filter(Boolean).length),
          'Yüklenen belge': fileName ?? 'yok',
        },
      })
      const content = extractAiContent(res.data)
      // Backend kaydettiği ToolResult Id'sini header ile döndürür; gömme kodu bunu kullanır
      const resultId = (res.headers?.['x-result-id'] as string | undefined) ?? null
      return { senaryo: parseAiJson<ChatbotResult>(content), resultId }
    },
    onSuccess: ({ senaryo, resultId }) => {
      setResult(senaryo)
      setResultId(resultId)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  // Bekleme sirasinda gecen sureyi gosterir (sabit mesaj donmus hissi veriyordu)
  const elapsedSec = useElapsedSeconds(mutation.isPending)

  const canSubmit = biz.trim() && sector && services.trim() && faqs.filter(Boolean).length >= 3 && redirectGoal && !mutation.isPending && !fileParsing

  return (
    <ToolShell
      toolId="chatbot-senaryo"
      title="Chatbot Senaryosu Hazırlayıcı"
      icon="🤖"
      description="İşletme bilgilerini ve sıkça sorulan soruları girin; hazır chatbot akış senaryosu ve mesaj metinleri oluşturalım."
      hasResult={!!result}
      formHasInput={!!biz.trim()}
      isPending={mutation.isPending}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                  {header}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="İşletme adı *"
                    placeholder="Örn: Demir Otomotiv"
                    value={biz}
                    onChange={(e) => setBiz(e.target.value)}
                  />
                  <AramaliSecici
                    label="Sektör *"
                    value={sector}
                    onChange={setSector}
                    secenekler={SEKTORLER}
                  />
                </div>

                <Textarea
                  label="Sunulan hizmetler *"
                  placeholder="Örn: Araç bakımı, yağ değişimi, lastik servisi, fren bakımı ve kaporta onarım hizmetleri."
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  rows={3}
                />

                <Input
                  label="Mesai saatleri"
                  placeholder="Örn: Hft 08:00-18:00, Cmt 09:00-14:00"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">
                    Sıkça sorulan sorular * <span className="font-normal text-[#9A9792]">(ilk 3 zorunlu)</span>
                  </p>
                  <div className="flex flex-col gap-2">
                    {faqs.map((faq, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-[#9A9792] w-5 shrink-0">{i + 1}.</span>
                        <input
                          type="text"
                          value={faq}
                          onChange={(e) => updateFaq(i, e.target.value)}
                          placeholder={
                            i === 0 ? 'Örn: Fiyatlarınız nedir?' :
                            i === 1 ? 'Örn: Randevu nasıl alabilirim?' :
                            i === 2 ? 'Örn: Nerede bulunuyorsunuz?' : 'Opsiyonel...'
                          }
                          className="flex-1 px-3 py-2 text-sm border border-[#D3D1C7] rounded-lg bg-white text-[#1C1B19] placeholder:text-[#9A9792] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/10"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Ek bilgi belgesi (opsiyonel) ── */}
                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">
                    Ek bilgi belgesi <span className="font-normal text-[#9A9792]">(opsiyonel — .pdf veya .txt)</span>
                  </p>
                  <p className="text-xs text-[#9A9792] mb-2 leading-relaxed">
                    İşe alım prosedürü, izin kullanım talimatı gibi bir belge yükleyin;
                    SSS cevapları bu belgeye göre de zenginleştirilsin.
                  </p>

                  {!fileName ? (
                    <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-[#D3D1C7] rounded-lg bg-white text-sm text-[#6B6963] cursor-pointer hover:border-[#1D9E75] hover:text-[#085041] transition-colors">
                      <span>📎</span>
                      <span>{fileParsing ? 'Dosya işleniyor…' : 'Dosya seç (maks. 3 MB)'}</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={KABUL_EDILEN_TIPLER.join(',')}
                        disabled={fileParsing}
                        onChange={(e) => void handleFileSelect(e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-[#9FE1CB] rounded-lg bg-[#F0FAF6] text-sm text-[#085041]">
                      <span>✅</span>
                      <span className="flex-1 truncate">
                        {fileName}
                        {kayitliBelge?.ad === fileName && (
                          <span className="ml-2 text-[11px] text-[#1D9E75]">· kayıtlı</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-xs text-[#6B6963] hover:text-red-500 transition-colors shrink-0"
                      >
                        Kaldır
                      </button>
                    </div>
                  )}

                  {/*
                    Kullanıcı belgesinin ne kadarının kullanıldığını GÖRMELİ.
                    Önce yalnızca kısaltma uyarısı vardı; "ne kadarı kesildi"
                    bilinmediği için kullanıcı belgeyi küçültmeye ya da
                    sıkıştırmaya çalışıyordu (25 Eyl 2026). Sayı vermek bu
                    yanlış yola sapmayı önlüyor: sınır sayfa/boyut değil,
                    METİN UZUNLUĞU.
                  */}
                  {fileKarakter !== null && !fileTruncated && (
                    <p className="text-xs text-[#6B6963] mt-1.5">
                      Belgeden {fileKarakter.toLocaleString('tr-TR')} karakter okundu; tamamı kullanılacak.
                    </p>
                  )}
                  {fileTruncated && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      ⚠️ Belge {fileKarakter?.toLocaleString('tr-TR')} karakter; ilk{' '}
                      {MAKS_METIN_KARAKTER.toLocaleString('tr-TR')} karakteri kullanılacak.
                      Kalanı için belgeyi ikiye bölüp aracı iki kez çalıştırabilirsiniz.
                      (Yazı boyutunu küçültmek ya da PDF&apos;i sıkıştırmak bir şey değiştirmez —
                      sınır metin uzunluğuna bakar.)
                    </p>
                  )}
                  {fileError && (
                    <p className="text-xs text-red-500 mt-1.5">{fileError}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Yönlendirme hedefi *"
                    value={redirectGoal}
                    onChange={(e) => setRedirectGoal(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...YONLENDIRME_HEDEFLERI.map((h) => ({ value: h.value, label: h.label }))]}
                  />
                  <Input
                    label="Yönlendirme linki / numarası"
                    placeholder="Örn: 0532 000 00 00 veya site.com/randevu"
                    value={redirectLink}
                    onChange={(e) => setRedirectLink(e.target.value)}
                  />
                </div>

                <FormPersistButtons
                  filename="chatbot-senaryo-formu.json"
                  getData={() => ({ biz, sector, services, hours, faqs, redirectGoal, redirectLink })}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.services === 'string') setServices(d.services)
                    if (typeof d.hours === 'string') setHours(d.hours)
                    if (Array.isArray(d.faqs)) setFaqs(d.faqs as string[])
                    if (typeof d.redirectGoal === 'string') setRedirectGoal(d.redirectGoal)
                    if (typeof d.redirectLink === 'string') setRedirectLink(d.redirectLink)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🤖 Chatbot Senaryosu Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Chatbot senaryosu hazırlanıyor — {elapsedSec} sn geçti</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Özel mesajlar */}
              {result.ozel_mesajlar && result.ozel_mesajlar.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">💬 Özel Mesajlar</h3>
                  <div className="flex flex-col gap-3">
                    {result.ozel_mesajlar.map((m, i) => (
                      <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                          <span className="text-xs font-semibold text-[#085041]">{m.tip}</span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{m.metin}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SSS kartları */}
              {result.sss_kartlari && result.sss_kartlari.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">❓ SSS Akış Kartları</h3>
                  <div className="flex flex-col gap-3">
                    {result.sss_kartlari.map((item, i) => (
                      <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800">
                          👤 {item.soru}
                        </div>
                        <div className="bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                          🤖 {item.cevap}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* İpuçları */}
              {result.ipuclari && result.ipuclari.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">💡 Kurulum & Kullanım İpuçları</h3>
                  <ul className="flex flex-col gap-2">
                    {result.ipuclari.map((ip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-[#1D9E75] shrink-0">✓</span>{ip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.ctaText && (
                <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
                  <p className="text-sm text-[#1D9E75] font-medium">{result.ctaText}</p>
                </div>
              )}

              {/* Senaryoyu canlı denemek için — AI çağrısı yapmaz */}
              <MiniChatbotTest
                bizName={biz}
                ozelMesajlar={result.ozel_mesajlar ?? []}
                sssKartlari={result.sss_kartlari ?? []}
              />

              {/* Kendi sitesine gömme kodu */}
              {resultId && <SiteyeEkleKarti resultId={resultId} bizName={biz} />}

              <button onClick={() => setResult(null)} className="text-sm text-gray-400 underline text-center no-print">
                Yeni senaryo oluştur
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
