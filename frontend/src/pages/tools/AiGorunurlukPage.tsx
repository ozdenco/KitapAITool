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

interface PlatformSkor {
  platform: string
  skor: number
  durum: 'red' | 'amber' | 'green'
  aciklama: string
  oneriler: string[]
}

interface AiGorunurlukResult {
  genel_skor: number
  platformlar: PlatformSkor[]
  genel_oneriler: string[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const AI_PLATFORMLAR = ['ChatGPT / GPT-4', 'Google Gemini', 'Microsoft Copilot', 'Perplexity AI', 'Claude']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function durumColor(durum: string) {
  if (durum === 'green') return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500' }
  if (durum === 'amber') return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-400' }
  return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-400' }
}

function genelSkorColor(skor: number) {
  if (skor >= 70) return { text: 'text-green-600', ring: 'stroke-green-500' }
  if (skor >= 40) return { text: 'text-amber-500', ring: 'stroke-amber-400' }
  return { text: 'text-red-500', ring: 'stroke-red-400' }
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; sehir: string
  hizmet: string; web: string; platformlar: string[]
}): string {
  return `Sen yapay zeka görünürlük ve AI SEO uzmanısın.

İŞLETME: ${f.isletme}
SEKTÖR: ${f.sektor}
ŞEHİR: ${f.sehir || 'Türkiye'}
HİZMET: ${f.hizmet}
WEB SİTESİ: ${f.web || 'yok'}

Bu işletmenin ChatGPT, Google Gemini ve diğer yapay zeka asistanlarında ne kadar bilindiğini ve önerildiğini değerlendir.
AI görünürlük, web sitesi yapısı, içerik kalitesi, yerel SEO ve marka bilinirliğine göre puan ver.

SADECE JSON döndür:
{
  "genel_skor": <0-100 arası tam sayı>,
  "platformlar": [
    {
      "platform": "<platform adı, ör: ChatGPT>",
      "skor": <0-100>,
      "durum": "<red|amber|green>",
      "aciklama": "<bu platformda durumu ve neden, 1-2 cümle>",
      "oneriler": ["<bu platform için 2-3 somut öneri>"]
    }
  ],
  "genel_oneriler": ["<AI görünürlüğünü artırmak için 4-5 genel öneri>"],
  "ctaText": "<${f.isletme} için motivasyon cümlesi>"
}
3-4 platform değerlendir. red=0-39, amber=40-69, green=70-100. Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiGorunurlukPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [sehir, setSehir] = useState('')
  const [hizmet, setHizmet] = useState('')
  const [web, setWeb] = useState('')
  const [platformlar, setPlatformlar] = useState<string[]>([])
  const [result, setResult] = useState<AiGorunurlukResult | null>(null)

  const togglePlatform = (p: string) =>
    setPlatformlar((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, sehir, hizmet, web, platformlar })
      const res = await api.post('/tools/ai-gorunurluk/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as AiGorunurlukResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && hizmet.trim() && !mutation.isPending
  const genelColors = result ? genelSkorColor(result.genel_skor) : null

  return (
    <ToolShell
      toolId="ai-gorunurluk"
      title="AI Görünürlük Takipçisi"
      icon="✨"
      description="İşletmenizin ChatGPT, Gemini ve Copilot gibi yapay zeka asistanlarında ne kadar bilindiğini ölçün ve iyileştirin."
      hasResult={!!result}
      formHasInput={!!isletme.trim()}
    >
      {({ isFormOpen }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-5">
                <Input
                  label="İşletme adı *"
                  placeholder="Örn: Güneş Diş Kliniği"
                  value={isletme}
                  onChange={(e) => setIsletme(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Sektör *"
                    value={sektor}
                    onChange={(e) => setSektor(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                  />
                  <Input
                    label="Şehir"
                    placeholder="Örn: İzmir"
                    value={sehir}
                    onChange={(e) => setSehir(e.target.value)}
                  />
                </div>

                <Textarea
                  label="Sunulan hizmetler *"
                  placeholder="Örn: Diş beyazlatma, implant, ortodonti, çocuk diş hekimliği"
                  value={hizmet}
                  onChange={(e) => setHizmet(e.target.value)}
                  rows={2}
                />

                <Input
                  label="Web sitesi (varsa)"
                  placeholder="Örn: www.gunesdiskliniği.com"
                  value={web}
                  onChange={(e) => setWeb(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Hangi AI platformlarını analiz edelim?</p>
                  <div className="flex flex-wrap gap-2">
                    {AI_PLATFORMLAR.map((p) => (
                      <button key={p} type="button" onClick={() => togglePlatform(p)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          platformlar.includes(p) ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {platformlar.includes(p) ? '✓ ' : ''}{p}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Seçmezseniz en yaygın 3 platform analiz edilir.</p>
                </div>

                <FormPersistButtons
                  filename="ai-gorunurluk-formu.json"
                  getData={() => ({ isletme, sektor, sehir, hizmet, web, platformlar })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.sehir === 'string') setSehir(d.sehir)
                    if (typeof d.hizmet === 'string') setHizmet(d.hizmet)
                    if (typeof d.web === 'string') setWeb(d.web)
                    if (Array.isArray(d.platformlar)) setPlatformlar(d.platformlar as string[])
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  ✨ AI Görünürlüğümü Ölç
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">AI platformları analiz ediliyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && genelColors && (
            <div className="flex flex-col gap-4">
              {/* Genel skor */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      className={genelColors.ring}
                      strokeWidth="8"
                      strokeDasharray={`${(result.genel_skor / 100) * 251} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${genelColors.text}`}>{result.genel_skor}</span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                </div>
                <div>
                  <p className={`text-lg font-bold ${genelColors.text}`}>Genel AI Görünürlük Skoru</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {result.genel_skor >= 70 ? 'AI asistanları işletmenizden haberdar.' :
                      result.genel_skor >= 40 ? 'AI görünürlüğünüz geliştirilmeli.' :
                        'AI asistanları sizi tanımıyor, acil aksiyon gerekli.'}
                  </p>
                </div>
              </div>

              {/* Platform skorları */}
              {result.platformlar.map((p, i) => {
                const clr = durumColor(p.durum)
                return (
                  <div key={i} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${clr.border}`}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between ${clr.bg} ${clr.border}`}>
                      <span className={`font-semibold text-sm ${clr.text}`}>✨ {p.platform}</span>
                      <span className={`text-lg font-bold ${clr.text}`}>{p.skor}/100</span>
                    </div>
                    <div className="px-5 pt-3 pb-1">
                      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${clr.bar}`} style={{ width: `${p.skor}%` }} />
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{p.aciklama}</p>
                    </div>
                    <div className={`px-5 py-3 border-t ${clr.border} ${clr.bg}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${clr.text}`}>Öneriler</p>
                      <ul className="flex flex-col gap-1">
                        {p.oneriler.map((o, j) => (
                          <li key={j} className="flex gap-2 text-sm text-gray-600">
                            <span className={`shrink-0 ${clr.text}`}>→</span>{o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}

              {/* Genel öneriler */}
              {result.genel_oneriler.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 AI Görünürlüğünü Artırma Stratejisi</h3>
                  <ul className="flex flex-col gap-2">
                    {result.genel_oneriler.map((o, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-[#1D9E75] font-bold shrink-0">{i + 1}.</span>{o}
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
