import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiGorunurlukResult {
  genel_skor: number
  seviye: string
  ozet: string
  kategoriler: { baslik: string; skor: number; durum: 'red' | 'amber' | 'green'; oneri: string }[]
  oncelikli_adimlar: string[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Lojistik / Taşımacılık', 'E-ticaret / Perakende', 'Restoran / Kafe / Yiyecek',
  'Güzellik / Kuaför / Estetik', 'Sağlık / Klinik / Eczane', 'İnşaat / Gayrimenkul',
  'Muhasebe / Finans / Danışmanlık', 'Eğitim / Kurs / Koçluk', 'Teknoloji / Yazılım',
  'Turizm / Otel / Seyahat', 'Hukuk / Avukatlık', 'Üretim / İmalat',
  'Temizlik / Hizmet', 'Diğer',
]

const SOSYAL_KANALLAR = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Twitter/X', 'Hiçbiri']
const DIZINLER = ['Ticaret Odası', 'KOSGEB', 'Sahibinden / Hepsiburada', 'Sektör / iş dizini', 'Wikipedia / Vikipedi', 'Hiçbiri']

// ─── Helper components ────────────────────────────────────────────────────────

function RadioGroup({ name, value, onChange, options }: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-center gap-2 px-[11px] py-[9px] border-[0.5px] rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
            value === o.value
              ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
              : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="w-auto" />
          {o.label}
        </label>
      ))}
    </div>
  )
}

function CheckGroup({ values, onChange, options }: {
  values: string[]
  onChange: (v: string[]) => void
  options: string[]
}) {
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
      {options.map((o) => (
        <label
          key={o}
          className={`flex items-center gap-2 px-[11px] py-[9px] border-[0.5px] rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
            values.includes(o)
              ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
              : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
          }`}
        >
          <input type="checkbox" checked={values.includes(o)} onChange={() => toggle(o)} className="w-auto" />
          {o}
        </label>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-[#F1EFE8] pt-4 mt-1">
      {children}
    </p>
  )
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: Record<string, string | string[]>): string {
  return `Sen yapay zeka görünürlük uzmanısın. Aşağıdaki anket yanıtlarına göre bu işletmenin AI Görünürlük Skorunu hesapla.

İŞLETME BİLGİLERİ:
- İşletme: ${f.biz}
- Sektör: ${f.sector}
- Şehir: ${f.city || 'Türkiye'}
- Web Sitesi: ${f.web || 'yok'}

WEB SİTESİ İÇERİĞİ:
- Hizmet/ürün sayfası: ${f.q_services}
- Referanslar/projeler: ${f.q_refs}
- İletişim bilgisi: ${f.q_contact}

GOOGLE & YORUM PLATFORMLARI:
- Google Business Profile: ${f.q_gbp}
- Google yorum sayısı: ${f.q_reviews}
- Şikayetvar.com durumu: ${f.q_sikayet}

SOSYAL MEDYA & LİNKEDİN:
- LinkedIn güncelleme sıklığı: ${f.q_linkedin}
- Aktif sosyal medya kanalları: ${(f.q_social as string[]).join(', ') || 'Hiçbiri'}

MEDYA & DİZİNLER:
- Medyada yer aldı mı: ${f.q_media}
- Dizinlerde kayıtlı: ${(f.q_dirs as string[]).join(', ') || 'Hiçbiri'}
- Sertifika/ödül: ${f.q_cert}

ANAHTAR KELİME UYUMU:
- Anahtar kelime kullanımı: ${f.q_keywords}
- Site dili: ${f.q_lang}

Ek bilgi: ${f.extra || 'Yok'}

Bu bilgilere göre 0-100 arası AI Görünürlük Skoru hesapla. ChatGPT, Gemini ve Perplexity gibi AI araçlarının bu işletmeyi bulma ihtimalini değerlendir.

SADECE JSON döndür:
{
  "genel_skor": <0-100 tam sayı>,
  "seviye": "<Başlangıç|Gelişmekte|Orta|İyi|Mükemmel>",
  "ozet": "<işletme için 1-2 cümle AI görünürlük özeti>",
  "kategoriler": [
    { "baslik": "<kategori adı>", "skor": <0-100>, "durum": "<red|amber|green>", "oneri": "<somut 1 cümle öneri>" }
  ],
  "oncelikli_adimlar": ["<4-5 somut aksiyon maddesi>"],
  "ctaText": "<işletme için motivasyon cümlesi>"
}
5-6 kategori olsun. Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiGorunurlukPage() {
  const queryClient = useQueryClient()

  // Temel bilgiler
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [web, setWeb] = useState('')

  // Web sitesi
  const [qServices, setQServices] = useState('')
  const [qRefs, setQRefs] = useState('')
  const [qContact, setQContact] = useState('')

  // Google
  const [qGbp, setQGbp] = useState('')
  const [qReviews, setQReviews] = useState('')
  const [qSikayet, setQSikayet] = useState('')

  // Sosyal medya
  const [qLinkedin, setQLinkedin] = useState('')
  const [qSocial, setQSocial] = useState<string[]>([])

  // Medya & dizin
  const [qMedia, setQMedia] = useState('')
  const [qDirs, setQDirs] = useState<string[]>([])
  const [qCert, setQCert] = useState('')

  // Anahtar kelime
  const [qKeywords, setQKeywords] = useState('')
  const [qLang, setQLang] = useState('')
  const [extra, setExtra] = useState('')

  const [result, setResult] = useState<AiGorunurlukResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({
        biz, sector, city, web,
        q_services: qServices, q_refs: qRefs, q_contact: qContact,
        q_gbp: qGbp, q_reviews: qReviews, q_sikayet: qSikayet,
        q_linkedin: qLinkedin, q_social: qSocial,
        q_media: qMedia, q_dirs: qDirs, q_cert: qCert,
        q_keywords: qKeywords, q_lang: qLang, extra,
      })
      const res = await api.post('/tools/ai-gorunurluk/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as AiGorunurlukResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const getData = () => ({
    biz, sector, city, web,
    q_services: qServices, q_refs: qRefs, q_contact: qContact,
    q_gbp: qGbp, q_reviews: qReviews, q_sikayet: qSikayet,
    q_linkedin: qLinkedin, q_social: qSocial,
    q_media: qMedia, q_dirs: qDirs, q_cert: qCert,
    q_keywords: qKeywords, q_lang: qLang, extra,
  })

  const canSubmit = biz.trim() && sector && city.trim() && !mutation.isPending

  const genelColor = result
    ? result.genel_skor >= 70 ? { text: 'text-green-600', ring: 'stroke-green-500' }
    : result.genel_skor >= 40 ? { text: 'text-amber-500', ring: 'stroke-amber-400' }
    : { text: 'text-red-500', ring: 'stroke-red-400' }
    : null

  const durumColor = (d: string) => {
    if (d === 'green') return { text: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500', border: 'border-green-200' }
    if (d === 'amber') return { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400', border: 'border-amber-200' }
    return { text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-400', border: 'border-red-200' }
  }

  return (
    <ToolShell
      toolId="ai-gorunurluk"
      title="AI Görünürlük Skoru"
      icon="✨"
      description="Yapay zeka uygulamaları işletmenizi araştırdığında sizi bulabilir mi? Soruları yanıtlayın, AI'ın sizi nasıl gördüğünü öğrenin."
      hasResult={!!result}
      formHasInput={!!biz.trim()}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                  {header}

                {/* ── İşletme Bilgileri ── */}
                <SectionLabel>İşletme Bilgileri</SectionLabel>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="İşletme Adı *" placeholder="Örn: Logvance Lojistik" value={biz} onChange={(e) => setBiz(e.target.value)} />
                  <Select
                    label="Sektör *"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Şehir *" placeholder="Örn: İzmir" value={city} onChange={(e) => setCity(e.target.value)} />
                  <Input label="Web Sitesi URL (isteğe bağlı)" placeholder="https://firmaniz.com" value={web} onChange={(e) => setWeb(e.target.value)} />
                </div>

                {/* ── Web Sitesi İçeriği ── */}
                <SectionLabel>Web Sitesi İçeriği</SectionLabel>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Sitede hizmet/ürün sayfası var mı? Hizmetler açıkça yazılmış mı?</p>
                  <RadioGroup name="q_services" value={qServices} onChange={setQServices}
                    options={[{ value: 'evet', label: 'Evet' }, { value: 'kismi', label: 'Kısmen' }, { value: 'hayir', label: 'Hayır' }]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Referanslar veya geçmiş projeler sitede yayınlandı mı?</p>
                  <RadioGroup name="q_refs" value={qRefs} onChange={setQRefs}
                    options={[{ value: 'evet', label: 'Evet' }, { value: 'kismi', label: 'Kısmen' }, { value: 'hayir', label: 'Hayır' }]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Sitede eksiksiz iletişim bilgisi var mı? (adres, telefon, e-posta)</p>
                  <RadioGroup name="q_contact" value={qContact} onChange={setQContact}
                    options={[{ value: 'evet', label: 'Evet' }, { value: 'kismi', label: 'Kısmen' }, { value: 'hayir', label: 'Hayır' }]} />
                </div>

                {/* ── Google & Yorum ── */}
                <SectionLabel>Google & Yorum Platformları</SectionLabel>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Google Business Profile (Google Haritalar) kaydınız var mı?</p>
                  <RadioGroup name="q_gbp" value={qGbp} onChange={setQGbp}
                    options={[{ value: 'evet', label: 'Evet' }, { value: 'hayir', label: 'Hayır' }]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Google'daki yorum sayınız ve ortalama puanınız nedir?</p>
                  <RadioGroup name="q_reviews" value={qReviews} onChange={setQReviews}
                    options={[
                      { value: '50+', label: '50+ yorum' },
                      { value: '10-50', label: '10–50 yorum' },
                      { value: '1-10', label: '1–10 yorum' },
                      { value: 'yok', label: 'Hiç yok' },
                    ]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Şikayetvar'da şikayetiniz var mı?</p>
                  <RadioGroup name="q_sikayet" value={qSikayet} onChange={setQSikayet}
                    options={[
                      { value: 'yok', label: 'Şikayet yok' },
                      { value: 'cevaplanmis', label: 'Var, cevaplanmış' },
                      { value: 'cevaplanmamis', label: 'Var, cevaplanmamış' },
                    ]} />
                </div>

                {/* ── Sosyal Medya ── */}
                <SectionLabel>Sosyal Medya & LinkedIn</SectionLabel>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">LinkedIn şirket sayfanız ne sıklıkla güncelleniyor?</p>
                  <RadioGroup name="q_linkedin" value={qLinkedin} onChange={setQLinkedin}
                    options={[
                      { value: 'haftalik', label: 'Haftada 1+' },
                      { value: 'ayda2-4', label: 'Ayda 2–4 kez' },
                      { value: 'seyrek', label: 'Ayda 1 veya daha seyrek' },
                      { value: 'yok', label: 'Sayfa yok / hiç paylaşım yok' },
                    ]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Aktif olduğunuz sosyal medya kanalları <span className="font-normal text-gray-400">(birden fazla seçilebilir)</span></p>
                  <CheckGroup values={qSocial} onChange={setQSocial} options={SOSYAL_KANALLAR} />
                </div>

                {/* ── Medya & Dizin ── */}
                <SectionLabel>Medya, Dizin & Resmi Kayıtlar</SectionLabel>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">İşletmeniz herhangi bir haber sitesinde ya da sektör yayınında yer aldı mı?</p>
                  <RadioGroup name="q_media" value={qMedia} onChange={setQMedia}
                    options={[{ value: 'evet', label: 'Evet' }, { value: 'hayir', label: 'Hayır' }]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">İşletmeniz aşağıdaki kaynaklarda kayıtlı / listelenmiş mi? <span className="font-normal text-gray-400">(birden fazla seçilebilir)</span></p>
                  <CheckGroup values={qDirs} onChange={setQDirs} options={DIZINLER} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">ISO belgesi, sektörel sertifika veya ödülünüz var mı?</p>
                  <RadioGroup name="q_cert" value={qCert} onChange={setQCert}
                    options={[{ value: 'evet', label: 'Evet' }, { value: 'hayir', label: 'Hayır' }]} />
                </div>

                {/* ── Anahtar Kelime ── */}
                <SectionLabel>Anahtar Kelime Uyumu</SectionLabel>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Web sitenizde sektörünüze özgü anahtar kelimeler geçiyor mu?</p>
                  <RadioGroup name="q_keywords" value={qKeywords} onChange={setQKeywords}
                    options={[
                      { value: 'evet', label: 'Evet, yeterince' },
                      { value: 'kismi', label: 'Kısmen' },
                      { value: 'hayir', label: 'Pek yok' },
                    ]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">Site içeriği Türkçe mi, İngilizce mi, her ikisi de mi?</p>
                  <RadioGroup name="q_lang" value={qLang} onChange={setQLang}
                    options={[
                      { value: 'tr+en', label: 'Her ikisi' },
                      { value: 'tr', label: 'Sadece Türkçe' },
                      { value: 'en', label: 'Sadece İngilizce' },
                      { value: 'yok', label: 'Site yok' },
                    ]} />
                </div>

                <Textarea
                  label="Eklemek istediğiniz ek bilgi (isteğe bağlı)"
                  placeholder="Özellikle güçlü olduğunuz ya da zayıf hissettiğiniz alanlar, hedefleriniz veya rakiplerinizle ilgili bilgi ekleyebilirsiniz."
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="ai-gorunurluk-formu.json"
                  getData={getData}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.city === 'string') setCity(d.city)
                    if (typeof d.web === 'string') setWeb(d.web)
                    if (typeof d.q_services === 'string') setQServices(d.q_services)
                    if (typeof d.q_refs === 'string') setQRefs(d.q_refs)
                    if (typeof d.q_contact === 'string') setQContact(d.q_contact)
                    if (typeof d.q_gbp === 'string') setQGbp(d.q_gbp)
                    if (typeof d.q_reviews === 'string') setQReviews(d.q_reviews)
                    if (typeof d.q_sikayet === 'string') setQSikayet(d.q_sikayet)
                    if (typeof d.q_linkedin === 'string') setQLinkedin(d.q_linkedin)
                    if (Array.isArray(d.q_social)) setQSocial(d.q_social as string[])
                    if (typeof d.q_media === 'string') setQMedia(d.q_media)
                    if (Array.isArray(d.q_dirs)) setQDirs(d.q_dirs as string[])
                    if (typeof d.q_cert === 'string') setQCert(d.q_cert)
                    if (typeof d.q_keywords === 'string') setQKeywords(d.q_keywords)
                    if (typeof d.q_lang === 'string') setQLang(d.q_lang)
                    if (typeof d.extra === 'string') setExtra(d.extra)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  ✨ AI Görünürlük Skorunu Hesapla
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Veriler analiz ediliyor, skor hesaplanıyor — 15–40 saniye sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && genelColor && (
            <div className="flex flex-col gap-4">
              {/* Genel skor */}
              <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-6 flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      className={genelColor.ring}
                      strokeWidth="8"
                      strokeDasharray={`${(result.genel_skor / 100) * 251} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${genelColor.text}`}>{result.genel_skor}</span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                </div>
                <div>
                  <p className={`text-lg font-bold ${genelColor.text}`}>{result.seviye}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{result.ozet}</p>
                </div>
              </div>

              {/* Kategoriler */}
              {result.kategoriler.map((k, i) => {
                const clr = durumColor(k.durum)
                return (
                  <div key={i} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${clr.border}`}>
                    <div className={`px-5 py-3 flex items-center justify-between ${clr.bg} border-b ${clr.border}`}>
                      <span className={`font-semibold text-sm ${clr.text}`}>{k.baslik}</span>
                      <span className={`text-sm font-bold ${clr.text}`}>{k.skor}/100</span>
                    </div>
                    <div className="px-5 pt-3 pb-4">
                      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${clr.bar}`} style={{ width: `${k.skor}%` }} />
                      </div>
                      <p className="text-sm text-gray-600">→ {k.oneri}</p>
                    </div>
                  </div>
                )
              })}

              {/* Öncelikli adımlar */}
              {result.oncelikli_adimlar.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">🚀 Öncelikli Aksiyonlar</h3>
                  <ul className="flex flex-col gap-2">
                    {result.oncelikli_adimlar.map((a, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-[#1D9E75] font-bold shrink-0">{i + 1}.</span>{a}
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

              <button onClick={() => setResult(null)} className="text-sm text-gray-400 underline text-center no-print">
                Yeni analiz yap
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
