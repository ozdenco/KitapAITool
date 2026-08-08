import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreItem {
  status: 'red' | 'amber' | 'green'
  icon: string
  name: string
  desc: string
  badge: string
}

interface ScoreResult {
  score: number
  level: string
  summary: string
  items: ScoreItem[]
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

const PLATFORMLAR = [
  { value: 'Google Business', label: 'Google Business' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'WhatsApp İş', label: 'WhatsApp İş' },
  { value: 'Hiçbiri', label: 'Hiçbiri' },
]

const MUSTERI_HEDEFLERI = ['1–5', '5–20', '20–50', '50+']

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(fields: {
  name: string
  sector: string
  city: string
  web: string
  platforms: string[]
  liExists: string
  liActive: string
  goal: string
}): string {
  const liInfo =
    fields.liExists === 'evet'
      ? `var / Düzenli paylaşım: ${fields.liActive === 'evet' ? 'evet' : fields.liActive === 'hayir' ? 'hayır' : 'belirtilmemiş'}`
      : fields.liExists === 'hayir'
        ? 'yok'
        : 'belirtilmemiş'

  return (
    'Sen dijital pazarlama ve yerel SEO uzmanısın. Aşağıdaki işletme için görünürlük analizi yap.\n\n' +
    'İŞLETME BİLGİLERİ:\n' +
    '- İşletme adı: ' + fields.name + '\n' +
    '- Sektör: ' + fields.sector + '\n' +
    '- Şehir: ' + fields.city + '\n' +
    '- Web sitesi: ' + (fields.web || 'yok') + '\n' +
    '- Mevcut platformlar: ' + (fields.platforms.length ? fields.platforms.join(', ') : 'hiçbiri') + '\n' +
    '- LinkedIn sayfası: ' + liInfo + '\n' +
    '- Aylık müşteri hedefi: ' + (fields.goal || 'belirtilmemiş') + '\n\n' +
    'GÖREV:\n' +
    fields.name + ' için 0-100 arası bir görünürlük skoru ve öncelikli aksiyon listesi hazırla.\n' +
    '- Web sitesi yoksa skoru düşür\n' +
    '- Google Business yoksa kritik eksik say\n' +
    '- Sosyal medya varlığına göre değerlendir\n' +
    '- Sektöre özgü değerlendirme yap (' + fields.sector + ')\n\n' +
    'Tüm metin alanları Türkçe olsun.\n\n' +
    'SADECE JSON dondur:\n' +
    '{\n' +
    '  "score": [0-100 arasi tam sayi],\n' +
    '  "level": "[Baslangic|Gelismekte|Orta|Iyi|Mukemmel]",\n' +
    '  "summary": "[' + fields.name + ' icin 1-2 cumle ozet]",\n' +
    '  "items": [\n' +
    '    {\n' +
    '      "status": "[red|amber|green]",\n' +
    '      "icon": "[tabler icon adi, ornek: ti-world]",\n' +
    '      "name": "[kisa baslik]",\n' +
    '      "desc": "[somut 1-2 cumle aciklama]",\n' +
    '      "badge": "[Kritik|Iyilestir|Guclu]"\n' +
    '    }\n' +
    '  ],\n' +
    '  "ctaText": "[' + fields.name + ' icin kisisel 1 cumle]"\n' +
    '}\n' +
    '6-8 item olsun. Once red, sonra amber, sonra green. Tum metin alanlari Turkce olsun.'
  )
}

// ─── Score visual helpers ─────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return { text: 'text-green-600', ring: 'stroke-green-500' }
  if (score >= 40) return { text: 'text-amber-500', ring: 'stroke-amber-400' }
  return { text: 'text-red-500', ring: 'stroke-red-400' }
}

function statusConfig(status: string) {
  if (status === 'red') return { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' }
  if (status === 'amber') return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GorunurlukSkoruPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [web, setWeb] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [liExists, setLiExists] = useState('')
  const [liActive, setLiActive] = useState('')
  const [goal, setGoal] = useState('')
  const [result, setResult] = useState<ScoreResult | null>(null)

  const togglePlatform = (value: string) =>
    setPlatforms((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    )

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ name, sector, city, web, platforms, liExists, liActive, goal })
      const res = await api.post('/tools/gorunurluk-skoru/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      if (typeof content === 'string') return JSON.parse(content) as ScoreResult
      return content as ScoreResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = name.trim() && sector && city.trim() && !mutation.isPending
  const colors = result ? scoreColor(result.score) : null

  return (
    <ToolShell
      toolId="gorunurluk-skoru"
      title="İşletme Görünürlük Skoru"
      icon="📊"
      description="İşletmenizin Google, sosyal medya ve web'deki varlığını analiz edip 0–100 arası görünürlük puanı ve öncelikli aksiyon listesi hazırlıyoruz."
      hasResult={!!result}
      formHasInput={!!name.trim()}
    >
      {({ isFormOpen }) => (
        <>
          {/* ── Form ───────────────────────────────────────────── */}
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-5">
                <Input
                  label="İşletme adı *"
                  placeholder="Örn: Yıldız Muhasebe Ofisi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    label="Şehir *"
                    placeholder="Örn: İzmir"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <Input
                  label="Web sitesi (varsa)"
                  placeholder="Örn: www.yildizmuhasebe.com"
                  value={web}
                  onChange={(e) => setWeb(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Hangi platformlarda varlığınız var?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMLAR.map(({ value, label }) => {
                      const checked = platforms.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => togglePlatform(value)}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                            checked
                              ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                          }`}
                        >
                          {checked ? '✓ ' : ''}{label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="LinkedIn sayfanız var mı?"
                    value={liExists}
                    onChange={(e) => {
                      setLiExists(e.target.value)
                      if (e.target.value !== 'evet') setLiActive('')
                    }}
                    options={[
                      { value: '', label: 'Seçin...' },
                      { value: 'evet', label: 'Evet' },
                      { value: 'hayir', label: 'Hayır' },
                    ]}
                  />
                  <Select
                    label="LinkedIn'de düzenli paylaşım?"
                    value={liActive}
                    onChange={(e) => setLiActive(e.target.value)}
                    options={[
                      { value: '', label: 'Seçin...' },
                      { value: 'evet', label: 'Evet, düzenli paylaşım var' },
                      { value: 'hayir', label: 'Hayır, aktif değil' },
                    ]}
                  />
                </div>

                <Select
                  label="Aylık ortalama kaç yeni müşteri hedefliyorsunuz?"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  options={[
                    { value: '', label: 'Seçin...' },
                    ...MUSTERI_HEDEFLERI.map((g) => ({ value: g, label: g })),
                  ]}
                />

                <FormPersistButtons
                  filename="gorunurluk-skoru-formu.json"
                  getData={() => ({ name, sector, city, web, platforms, liExists, liActive, goal })}
                  onLoad={(d) => {
                    if (typeof d.name === 'string') setName(d.name)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.city === 'string') setCity(d.city)
                    if (typeof d.web === 'string') setWeb(d.web)
                    if (Array.isArray(d.platforms)) setPlatforms(d.platforms as string[])
                    if (typeof d.liExists === 'string') setLiExists(d.liExists)
                    if (typeof d.liActive === 'string') setLiActive(d.liActive)
                    if (typeof d.goal === 'string') setGoal(d.goal)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button
                  onClick={() => mutation.mutate()}
                  disabled={!canSubmit}
                  loading={mutation.isPending}
                  className="mt-1 w-full"
                >
                  📊 Skoru Hesapla
                </Button>

                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">
                    Yapay zeka analiz ediyor — bu işlem 1-2 dakika sürebilir...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Sonuçlar ────────────────────────────────────────── */}
          {result && colors && (
            <div className="flex flex-col gap-4">
              {/* Skor kartı */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      className={colors.ring}
                      strokeWidth="8"
                      strokeDasharray={`${(result.score / 100) * 251} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${colors.text}`}>{result.score}</span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                </div>
                <div>
                  <p className={`text-lg font-bold ${colors.text}`}>{result.level}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Maddeler */}
              <div className="flex flex-col gap-3">
                {result.items.map((item, i) => {
                  const cfg = statusConfig(item.status)
                  return (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex gap-4 items-start">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${cfg.badge}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {result.ctaText && (
                <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
                  <p className="text-sm text-[#1D9E75] font-medium">{result.ctaText}</p>
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-400 underline text-center no-print"
              >
                Yeni analiz yap
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
