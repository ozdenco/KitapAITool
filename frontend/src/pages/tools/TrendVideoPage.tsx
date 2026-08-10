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

interface TrendVideo {
  sira: number
  baslik: string
  platform: string
  neden_trend: string
  uyarlama: string
  ipucu?: string
  etiketler?: string[]
}

interface TrendResult {
  ozet?: string
  videolar: TrendVideo[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  { value: 'ALL', label: '✨ Tüm Sektörler (genel tarama)' },
  { value: 'Lojistik / Taşımacılık', label: 'Lojistik / Taşımacılık' },
  { value: 'E-ticaret / Online Mağaza', label: 'E-ticaret / Online Mağaza' },
  { value: 'Yiyecek / İçecek', label: 'Yiyecek / İçecek' },
  { value: 'Güzellik / Estetik', label: 'Güzellik / Estetik' },
  { value: 'Sağlık / Klinik', label: 'Sağlık / Klinik' },
  { value: 'Eğitim / Kurs', label: 'Eğitim / Kurs' },
  { value: 'Muhasebe / Finans', label: 'Muhasebe / Finans' },
  { value: 'Hukuk / Danışmanlık', label: 'Hukuk / Danışmanlık' },
  { value: 'İnşaat / Mühendislik', label: 'İnşaat / Mühendislik' },
  { value: 'Perakende / Mağaza', label: 'Perakende / Mağaza' },
  { value: 'Teknoloji / Yazılım', label: 'Teknoloji / Yazılım' },
  { value: 'Otomotiv / Tamir', label: 'Otomotiv / Tamir' },
  { value: 'Turizm / Otelcilik', label: 'Turizm / Otelcilik' },
  { value: 'Eğlence / Etkinlik', label: 'Eğlence / Etkinlik' },
  { value: 'Diğer', label: 'Diğer' },
]

const TONLAR = [
  'Eğlendirici',
  'Eğitici',
  'Bilgilendirici',
  'Samimi ve yakın',
  'Enerjik ve motive edici',
  'Mizahi ve eğlenceli',
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  bizName: string; sector: string; tones: string[]; audience: string; note: string
}): string {
  const sectorLabel = f.sector === 'ALL' ? 'tüm sektörler (genel tarama)' : f.sector

  return `Sen sosyal medya trend uzmanısın. Instagram, Facebook ve TikTok'ta şu an popüler olan video formatlarını ve trend içerikleri biliyorsun.

İşletme: ${f.bizName || 'belirtilmemiş'}
Sektör: ${sectorLabel}
İstenen video tonu: ${f.tones.join(', ')}
Hedef kitle: ${f.audience || 'belirtilmemiş'}
Ek not: ${f.note || 'yok'}

Bu sektör ve ton için şu an sosyal medyada trend olan 5 video fikri öner. Her fikir için neden trend olduğunu açıkla ve işletmeye nasıl uyarlanabileceğini göster.

SADECE JSON döndür:
{
  "ozet": "<sektör için trend içerik stratejisine dair 1-2 cümle genel özet>",
  "videolar": [
    {
      "sira": 1,
      "baslik": "<video fikri başlığı>",
      "platform": "<en uygun platform: TikTok / Instagram Reels / Facebook>",
      "neden_trend": "<neden viral/trend olduğu, ne tür duygusal tetikleyici kullandığı>",
      "uyarlama": "<${f.bizName || 'işletme'} için nasıl uyarlanır, somut senaryo>",
      "ipucu": "<çekim veya yayın için pratik ipucu>",
      "etiketler": ["<hashtag önerisi>", "<hashtag önerisi>"]
    }
  ],
  "ctaText": "<${f.bizName || 'işletme'} için motivasyon cümlesi>"
}
5 video fikri olsun. Türkçe, yaratıcı ve uygulanabilir olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendVideoPage() {
  const queryClient = useQueryClient()
  const [bizName, setBizName] = useState('')
  const [sector, setSector] = useState('')
  const [tones, setTones] = useState<string[]>([])
  const [audience, setAudience] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<TrendResult | null>(null)

  const toggleTone = (t: string) =>
    setTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ bizName, sector, tones, audience, note })
      const res = await api.post('/tools/trend-video/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as TrendResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = sector && tones.length > 0 && !mutation.isPending

  return (
    <ToolShell
      toolId="trend-video"
      title="Trend Video Bulucu"
      icon="📱"
      description="Sektörünüze uygun Instagram, Facebook ve TikTok'ta trend olan video fikirlerini bulun; markanıza uyarlayın."
      hasResult={!!result}
      formHasInput={!!sector}
    >
      {({ isFormOpen }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-5">
                <Input
                  label="İşletme / hizmet adı (opsiyonel)"
                  placeholder="Örn: Hızlı Kargo Lojistik"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                />

                <Select
                  label="Sektör *"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER]}
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">
                    Video Tonu (en az 1 seçin) *
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TONLAR.map((t) => (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border-[0.5px] rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          tones.includes(t)
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input type="checkbox" className="w-auto" checked={tones.includes(t)} onChange={() => toggleTone(t)} />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="Hedef kitle (opsiyonel)"
                  placeholder="Örn: 25-45 yaş, B2B, E-ticaret müşterileri"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />

                <Textarea
                  label="Ek not (opsiyonel)"
                  placeholder="Örn: Penguen videosunu lojistik müşteriye uyarladık, benzer absürt/şaşırtıcı içerikler istiyoruz."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="trend-video-formu.json"
                  getData={() => ({ bizName, sector, tones, audience, note })}
                  onLoad={(d) => {
                    if (typeof d.bizName === 'string') setBizName(d.bizName)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (Array.isArray(d.tones)) setTones(d.tones as string[])
                    if (typeof d.audience === 'string') setAudience(d.audience)
                    if (typeof d.note === 'string') setNote(d.note)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  📱 Trend Video Fikirlerini Getir
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Trend videolar araştırılıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.ozet && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">📊 Trend Özeti</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.ozet}</p>
                </div>
              )}

              {result.videolar.map((v, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                    <div className="w-7 h-7 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {v.sira}
                    </div>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#085041]">{v.baslik}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#F0FAF6] text-[#085041] rounded-full font-medium">{v.platform}</span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">🔥 Neden Trend?</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{v.neden_trend}</p>
                    </div>

                    <div className="relative bg-[#DCF8C6] rounded-tr-xl rounded-b-xl px-4 py-3 text-sm text-[#1C1B19] leading-relaxed whitespace-pre-wrap">
                      <div className="absolute left-0 top-0 w-0 h-0" style={{ borderTop: '8px solid #DCF8C6', borderLeft: '8px solid transparent', left: '-8px' }} />
                      <p className="text-xs font-semibold text-[#085041] mb-1">💡 Uyarlama</p>
                      {v.uyarlama}
                    </div>

                    {v.ipucu && (
                      <div className="flex gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
                        <span className="text-[#1D9E75] shrink-0">💡</span>{v.ipucu}
                      </div>
                    )}

                    {v.etiketler && v.etiketler.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {v.etiketler.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-[#F0FAF6] border border-[#9FE1CB] text-[#085041] font-medium rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {result.ctaText && (
                <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
                  <p className="text-sm text-[#1D9E75] font-medium">{result.ctaText}</p>
                </div>
              )}

              <button onClick={() => setResult(null)} className="text-sm text-gray-400 underline text-center no-print">
                Yeni arama yap
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
