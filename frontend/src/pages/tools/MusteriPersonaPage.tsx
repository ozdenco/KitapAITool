import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  name: string
  age: number
  job: string
  location: string
  quote: string
  motivations: string[]
  objections: string[]
  platforms: string[]
  contentPrefs: string[]
  summary: string
}

interface PersonaResponse {
  personas: Persona[]
  ctaText: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans',
  'Sağlık / Klinik',
  'Eğitim / Kurs',
  'İnşaat / Mühendislik',
  'Hukuk / Danışmanlık',
  'Perakende / Mağaza',
  'Yiyecek / İçecek',
  'Güzellik / Estetik',
  'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım',
  'Diğer',
]

const YAS_ARALIKLARI = ['18–30', '25–40', '30–50', '40–60', 'Tüm yaşlar']

const FIYAT_SEGMENTLERI = [
  'Ekonomik (fiyat odaklı)',
  'Orta segment',
  'Premium / Üst segment',
]

const PAIN_OPTIONS = [
  'Zaman tasarrufu',
  'Para tasarrufu',
  'Güven / kalite',
  'Hız / pratiklik',
  'Uzman desteği',
  'Büyüme / ölçeklenme',
]

const AVATAR_COLORS = [
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#E6F1FB', color: '#0C447C' },
  { bg: '#FAEEDA', color: '#633806' },
]

// ─── Prompt builder (matches old HTML exactly) ────────────────────────────────

function buildPrompt(fields: {
  biz: string
  sector: string
  city: string
  service: string
  age: string
  price: string
  current: string
  pains: string[]
}): string {
  return `Sen bir pazarlama stratejisti ve müşteri araştırma uzmanısın. Aşağıdaki işletme bilgilerine göre 3 farklı müşteri persona kartı oluştur.

İşletme Bilgileri:
- İşletme / hizmet: ${fields.biz}
- Sektör: ${fields.sector}
- Şehir: ${fields.city || 'Türkiye geneli'}
- Hizmet/Ürün: ${fields.service}
- Hedef yaş: ${fields.age || 'Belirtilmemiş'}
- Fiyat segmenti: ${fields.price || 'Belirtilmemiş'}
- Mevcut müşteri özellikleri: ${fields.current || 'Belirtilmemiş'}
- Müşteri öncelikleri: ${fields.pains.length ? fields.pains.join(', ') : 'Belirtilmemiş'}

Her persona için gerçekçi, birbirinden belirgin şekilde farklı 3 profil oluştur.

SADECE JSON döndür, başka hiçbir şey yazma:
{
  "personas": [
    {
      "name": "<Türkçe isim>",
      "age": <sayı>,
      "job": "<meslek / pozisyon>",
      "location": "<şehir>",
      "quote": "<bu kişinin o hizmete bakışını gösteren 1 cümlelik alıntı, birinci şahıs>",
      "motivations": ["<3-4 kısa motivasyon>"],
      "objections": ["<2-3 kısa itiraz>"],
      "platforms": ["<2-3 platform>"],
      "contentPrefs": ["<2-3 içerik/kanal tercihi>"],
      "summary": "<bu persona için 1 cümle strateji önerisi>"
    }
  ],
  "ctaText": "<işletmeye özel 1 cümle>"
}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MusteriPersonaPage() {
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [service, setService] = useState('')
  const [age, setAge] = useState('')
  const [price, setPrice] = useState('')
  const [current, setCurrent] = useState('')
  const [pains, setPains] = useState<string[]>([])
  const [result, setResult] = useState<PersonaResponse | null>(null)
  const [parseError, setParseError] = useState(false)

  const togglePain = (value: string) =>
    setPains((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    )

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, city, service, age, price, current, pains })
      const res = await api.post('/tools/musteri-persona/run', { prompt })
      // n8n returns { content: [{ type: "text", text: "{...json...}" }] }
      const content = res.data?.content?.[0]?.text ?? res.data
      if (typeof content === 'string') {
        const parsed = JSON.parse(content) as PersonaResponse
        return parsed
      }
      return content as PersonaResponse
    },
    onSuccess: (data) => {
      setParseError(false)
      setResult(data)
    },
    onError: () => setParseError(true),
  })

  const canSubmit = biz.trim() && sector && service.trim() && !mutation.isPending

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">👥</span>
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Persona Oluşturucu</h1>
        </div>
        <p className="text-gray-500 text-sm">
          İşletmeniz hakkında birkaç bilgi girin, hedef müşterilerinizi temsil eden 3 farklı persona kartı oluşturalım.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-5">
          <Input
            label="İşletme / hizmet adı *"
            placeholder="Örn: Yıldız Muhasebe Ofisi"
            value={biz}
            onChange={(e) => setBiz(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Sektör *"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              options={[
                { value: '', label: 'Seçin...' },
                ...SEKTORLER.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Input
              label="Şehir / Bölge"
              placeholder="Örn: İzmir"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <Textarea
            label="Sunduğunuz hizmet veya ürün *"
            placeholder="Örn: KOBİ'lere muhasebe, vergi danışmanlığı ve mali müşavirlik hizmetleri sunuyoruz."
            value={service}
            onChange={(e) => setService(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Hedef müşteri yaş aralığı"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              options={[
                { value: '', label: 'Seçin...' },
                ...YAS_ARALIKLARI.map((y) => ({ value: y, label: y })),
              ]}
            />
            <Select
              label="Fiyat segmenti"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              options={[
                { value: '', label: 'Seçin...' },
                ...FIYAT_SEGMENTLERI.map((f) => ({ value: f, label: f })),
              ]}
            />
          </div>

          <Textarea
            label="Mevcut müşterilerinizin ortak özellikleri (varsa)"
            placeholder="Örn: Çoğunlukla 5–20 kişilik işletmeler, teknoloji konusunda bilgisi az ve zaman sıkıntısı çeken girişimciler."
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />

          {/* Pain points checkboxes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Müşterilerinizin en sık amaçları / sorunları neler?
            </p>
            <div className="flex flex-wrap gap-2">
              {PAIN_OPTIONS.map((option) => {
                const checked = pains.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => togglePain(option)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      checked
                        ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                    }`}
                  >
                    {checked ? '✓ ' : ''}{option}
                  </button>
                )
              })}
            </div>
          </div>

          <FormPersistButtons
            filename="musteri-persona-formu.json"
            getData={() => ({ biz, sector, city, service, age, price, current, pains })}
            onLoad={(d) => {
              if (typeof d.biz === 'string') setBiz(d.biz)
              if (typeof d.sector === 'string') setSector(d.sector)
              if (typeof d.city === 'string') setCity(d.city)
              if (typeof d.service === 'string') setService(d.service)
              if (typeof d.age === 'string') setAge(d.age)
              if (typeof d.price === 'string') setPrice(d.price)
              if (typeof d.current === 'string') setCurrent(d.current)
              if (Array.isArray(d.pains)) setPains(d.pains as string[])
            }}
          />

          {(mutation.isError || parseError) && (
            <p className="text-sm text-red-500">
              Bir hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            loading={mutation.isPending}
            className="mt-1 w-full"
          >
            👥 Personaları Oluştur
          </Button>

          {mutation.isPending && (
            <p className="text-center text-sm text-gray-400 animate-pulse">
              Yapay zeka düşünüyor — bu işlem 1-2 dakika sürebilir...
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {result && result.personas && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-gray-900">Müşteri Persona Kartları</h2>

          {result.personas.map((persona, idx) => {
            const colors = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Persona header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{ backgroundColor: colors.bg, color: colors.color }}
                    >
                      {persona.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{persona.name}</h3>
                      <p className="text-sm text-gray-500">
                        {persona.age} yaş · {persona.job} · {persona.location}
                      </p>
                    </div>
                  </div>
                  <blockquote className="text-sm text-gray-600 italic border-l-2 border-[#1D9E75]/40 pl-4">
                    "{persona.quote}"
                  </blockquote>
                </div>

                {/* Persona details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  <div className="p-5">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Motivasyonlar
                    </h4>
                    <ul className="flex flex-col gap-1.5">
                      {persona.motivations.map((m, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-[#1D9E75] shrink-0">✓</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-5">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      İtirazlar
                    </h4>
                    <ul className="flex flex-col gap-1.5">
                      {persona.objections.map((o, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="text-red-400 shrink-0">✗</span> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 mt-4">
                    {persona.platforms.map((p, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                        {p}
                      </span>
                    ))}
                    {persona.contentPrefs.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#1D9E75]/10 text-xs text-[#1D9E75]">
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">
                    💡 {persona.summary}
                  </p>
                </div>
              </div>
            )
          })}

          {result.ctaText && (
            <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
              <p className="text-sm text-[#1D9E75] font-medium">{result.ctaText}</p>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="text-sm text-gray-400 underline text-center"
          >
            Yeni analiz yap
          </button>
        </div>
      )}
    </div>
  )
}
