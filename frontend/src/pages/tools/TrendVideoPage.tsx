import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'idle' | 'pending' | 'polling' | 'done' | 'error'

interface TrendItem {
  baslik: string
  platform: string
  trend_sebebi: string
  uyarlama: string
  script_onerim: string
}

interface TrendResult {
  job_id?: string
  trendler?: TrendItem[]
  ozet?: string
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const PLATFORMLAR = ['TikTok', 'Instagram', 'YouTube Shorts', 'Hepsi']
const SURELER = ['15 saniye', '30 saniye', '60 saniye', '1-3 dakika', 'Fark etmez']

const PLATFORM_EMOJIS: Record<string, string> = {
  TikTok: '🎵', Instagram: '📸', 'YouTube Shorts': '▶️', Hepsi: '🌐',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendVideoPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [platform, setPlatform] = useState('')
  const [sure, setSure] = useState('')
  const [konu, setKonu] = useState('')
  const [trendler, setTrendler] = useState<TrendItem[] | null>(null)
  const [ozet, setOzet] = useState<string | null>(null)
  const [ctaText, setCtaText] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus>('idle')
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Polling for async result
  useEffect(() => {
    if (status !== 'polling' || !jobId) return

    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1)
      try {
        const res = await api.get<TrendResult>(`/tools/trend-video/status/${jobId}`)
        if (res.data.trendler) {
          clearInterval(pollRef.current!)
          setTrendler(res.data.trendler)
          setOzet(res.data.ozet ?? null)
          setCtaText(res.data.ctaText ?? null)
          setStatus('done')
          void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
        }
      } catch {
        clearInterval(pollRef.current!)
        setStatus('error')
      }
    }, 4000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [status, jobId, queryClient])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        isletme_adi: isletme,
        sektor,
        platform: platform || 'Hepsi',
        sure_tercihi: sure || 'Fark etmez',
        konu: konu || 'genel içerik',
      }
      const res = await api.post<TrendResult>('/tools/trend-video/run', payload)
      return res.data
    },
    onSuccess: (data) => {
      if (data.job_id) {
        setJobId(data.job_id)
        setStatus('polling')
        setPollCount(0)
      } else if (data.trendler) {
        setTrendler(data.trendler)
        setOzet(data.ozet ?? null)
        setCtaText(data.ctaText ?? null)
        setStatus('done')
        void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
      }
    },
    onError: () => setStatus('error'),
  })

  const handleSubmit = () => {
    setStatus('pending')
    setTrendler(null)
    mutation.mutate()
  }

  const canSubmit =
    isletme.trim() && sektor &&
    status !== 'pending' && status !== 'polling'

  const hasResult = !!trendler && trendler.length > 0

  return (
    <ToolShell
      toolId="trend-video"
      title="Trend Video Bulucu"
      icon="📱"
      description="Sektörünüzdeki güncel viral video trendlerini bulun ve kendi işletmenize nasıl uyarlayacağınızı öğrenin."
      hasResult={hasResult}
      formHasInput={!!isletme.trim()}
    >
      {({ isFormOpen }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-5">
                <Input
                  label="İşletme adı *"
                  placeholder="Örn: Konak Çiçekçilik"
                  value={isletme}
                  onChange={(e) => setIsletme(e.target.value)}
                />

                <Select
                  label="Sektör *"
                  value={sektor}
                  onChange={(e) => setSektor(e.target.value)}
                  options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                />

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Hedef platform</p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMLAR.map((p) => (
                      <button key={p} type="button" onClick={() => setPlatform(p)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          platform === p ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {PLATFORM_EMOJIS[p]} {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Tercih edilen video süresi</p>
                  <div className="flex flex-wrap gap-2">
                    {SURELER.map((s) => (
                      <button key={s} type="button" onClick={() => setSure(s)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          sure === s ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Odaklanmak istediğiniz konu / tema (isteğe bağlı)"
                  placeholder="Örn: bahar sezonu, anneler günü, indirim kampanyası"
                  value={konu}
                  onChange={(e) => setKonu(e.target.value)}
                />

                <FormPersistButtons
                  filename="trend-video-formu.json"
                  getData={() => ({ isletme, sektor, platform, sure, konu })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.platform === 'string') setPlatform(d.platform)
                    if (typeof d.sure === 'string') setSure(d.sure)
                    if (typeof d.konu === 'string') setKonu(d.konu)
                  }}
                />

                {status === 'error' && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  loading={status === 'pending' || status === 'polling'}
                  className="mt-1 w-full"
                >
                  {status === 'polling'
                    ? `Trendler aranıyor... (${pollCount * 4}s)`
                    : '📱 Trend Videoları Bul'}
                </Button>

                {status === 'polling' && (
                  <p className="text-xs text-center text-gray-400 -mt-2">
                    Bu işlem 30-60 saniye sürebilir. Lütfen bekleyin...
                  </p>
                )}
              </div>
            </div>
          )}

          {hasResult && trendler && (
            <div className="flex flex-col gap-4">
              {ozet && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-1">📊 Özet</p>
                  <p className="text-sm text-blue-700">{ozet}</p>
                </div>
              )}

              {trendler.map((trend, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-lg">{PLATFORM_EMOJIS[trend.platform] ?? '📱'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{trend.baslik}</p>
                      <p className="text-xs text-gray-400">{trend.platform}</p>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Neden Trend?</p>
                      <p className="text-sm text-gray-700">{trend.trend_sebebi}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">İşletmenize Uyarlama</p>
                      <p className="text-sm text-gray-700">{trend.uyarlama}</p>
                    </div>
                    <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-1">Script Fikri</p>
                      <p className="text-sm text-gray-700">{trend.script_onerim}</p>
                    </div>
                  </div>
                </div>
              ))}

              {ctaText && (
                <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
                  <p className="text-sm text-[#1D9E75] font-medium">{ctaText}</p>
                </div>
              )}

              <button
                onClick={() => { setTrendler(null); setStatus('idle') }}
                className="text-sm text-gray-400 underline text-center no-print"
              >
                Yeni arama yap
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
