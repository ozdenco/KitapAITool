import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TikTokVideo {
  rank: number
  author: string
  title: string
  webVideoUrl: string
  playCount?: number
  diggCount?: number
  hashtags?: string[]
}

interface TrendResult {
  videos: TikTokVideo[]
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

const LOADING_MESSAGES = [
  'Trend videolar taranıyor...',
  'Sektörel içerikler araştırılıyor...',
  'TikTok verileri çekiliyor...',
  'Viral potansiyel analiz ediliyor...',
  'Son rötuşlar yapılıyor...',
]

const MAX_POLL_ATTEMPTS = 220 // 220 × 3 sn ≈ 11 dakika
const POLL_INTERVAL_MS  = 3000

function formatCount(n?: number): string {
  if (n == null) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('tr-TR')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendVideoPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  // Form state
  const [bizName,  setBizName]  = useState('')
  const [sector,   setSector]   = useState('')
  const [tones,    setTones]    = useState<string[]>([])
  const [audience, setAudience] = useState('')
  const [note,     setNote]     = useState('')

  // Async job state
  const [isPending,   setIsPending]   = useState(false)
  const [loadingMsg,  setLoadingMsg]  = useState(LOADING_MESSAGES[0])
  const [elapsedSec,  setElapsedSec]  = useState(0)
  const [error,       setError]       = useState<string | null>(null)
  const [result,      setResult]      = useState<TrendResult | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const toggleTone = (t: string) =>
    setTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const startPolling = useCallback((jobId: string) => {
    let attempt = 0
    intervalRef.current = setInterval(async () => {
      attempt++
      setElapsedSec(attempt * 3)
      setLoadingMsg(LOADING_MESSAGES[attempt % LOADING_MESSAGES.length])

      if (attempt > MAX_POLL_ATTEMPTS) {
        clearPolling()
        setIsPending(false)
        setError('11 dakika içinde sonuç gelmedi. Yapay zeka hâlâ çalışıyor olabilir — birkaç dakika sonra tekrar deneyin.')
        return
      }

      try {
        const res = await api.get<{ status: string; videos?: TikTokVideo[]; error?: string }>(
          `/tools/trend-video/status/${jobId}`
        )
        if (res.data.status === 'completed') {
          clearPolling()
          setIsPending(false)
          setResult({ videos: res.data.videos ?? [] })
          void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
        } else if (res.data.status === 'error') {
          clearPolling()
          setIsPending(false)
          setError(res.data.error ?? 'İşlem hatayla sonuçlandı.')
        }
      } catch {
        // Geçici ağ hatası — bir sonraki turda devam et
      }
    }, POLL_INTERVAL_MS)
  }, [clearPolling, queryClient])

  const handleGenerate = async () => {
    if (!sector || tones.length === 0 || isPending) return
    setError(null)
    setResult(null)
    setIsPending(true)
    setElapsedSec(0)
    setLoadingMsg(LOADING_MESSAGES[0])

    try {
      const res = await api.post<{ job_id: string }>(
        '/tools/trend-video/start',
        { biz: bizName, sector, tones, audience, note }
      )
      startPolling(res.data.job_id)
    } catch (err: unknown) {
      setIsPending(false)
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.'
      setError(msg)
    }
  }

  const handleReset = () => {
    clearPolling()
    setIsPending(false)
    setResult(null)
    setError(null)
  }

  const canSubmit = sector.length > 0 && tones.length > 0 && !isPending

  return (
    <ToolShell
      toolId="trend-video"
      title="Trend Video Bulucu"
      icon="📱"
      description="Sektörünüze uygun TikTok'ta trend olan videoları bulun; markanıza uyarlayın."
      hasResult={!!result}
      formHasInput={!!sector}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                {header}

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
                    if (typeof d.bizName  === 'string') setBizName(d.bizName)
                    if (typeof d.sector   === 'string') setSector(d.sector)
                    if (Array.isArray(d.tones))         setTones(d.tones as string[])
                    if (typeof d.audience === 'string') setAudience(d.audience)
                    if (typeof d.note     === 'string') setNote(d.note)
                  }}
                />
                {rateBar}

                {error && (
                  <div className="text-[13px] text-[#A32D2D] bg-[#FCEBEB] rounded-xl px-4 py-3">
                    ⚠️ {error}
                  </div>
                )}

                <Button onClick={handleGenerate} disabled={!canSubmit} loading={isPending} className="mt-1 w-full">
                  🔥 Trendleri Bul
                </Button>

                {isPending && (
                  <div className="text-center py-6">
                    <div className="w-11 h-11 border-[3px] border-[#E2E0D8] border-t-[#1D9E75] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[14px] text-[#6B6963]">{loadingMsg}</p>
                    <p className="text-[12px] text-[#9A9792] mt-2">
                      Yapay zeka çalışıyor ({elapsedSec} sn geçti)...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Sonuçlar ── */}
          {result && result.videos.length > 0 && (
            <div className="flex flex-col gap-4">
              {result.videos.map((v) => {
                const uyarlaParams = new URLSearchParams({
                  url:    v.webVideoUrl ?? '',
                  desc:   (v.title ?? '').slice(0, 200),
                  sector: sector,
                  biz:    bizName,
                }).toString()

                return (
                  <div key={v.rank} className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start gap-[14px] px-6 py-4 border-b border-[#F1EFE8]">
                      <div className="w-[34px] h-[34px] rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
                        {v.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1C1B19] leading-snug mb-1">
                          {v.author && (
                            <span className="text-[#1D9E75]">@{v.author} — </span>
                          )}
                          {(v.title ?? '').slice(0, 100)}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-[12px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FAF6] text-[#085041] rounded-md font-medium">
                            TikTok
                          </span>
                          {v.playCount != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF9EC] text-[#7A5C00] rounded-md font-medium border border-[#F5D76E]">
                              👁 {formatCount(v.playCount)}
                            </span>
                          )}
                          {v.diggCount != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF0F6] text-[#9D1B4E] rounded-md font-medium border border-[#FBA7C5]">
                              ❤️ {formatCount(v.diggCount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 flex flex-col gap-3">
                      {/* Hashtags */}
                      {(v.hashtags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(v.hashtags ?? []).map((h) => (
                            <span key={h} className="text-[11px] px-2 py-0.5 bg-[#F0FAF6] border border-[#9FE1CB] text-[#085041] font-medium rounded-md">
                              #{h}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Aksiyon butonları */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {v.webVideoUrl && (
                          <a
                            href={v.webVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-[13px] py-[7px] bg-white border border-[#D3D1C7] rounded-lg text-[12px] font-medium text-[#1C1B19] hover:bg-[#F7F6F2] transition-colors"
                          >
                            ↗ Videoyu Aç
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/araclar/viral-video?${uyarlaParams}`)}
                          className="inline-flex items-center gap-1.5 px-[16px] py-[7px] bg-[#1D9E75] text-white rounded-lg text-[13px] font-medium hover:bg-[#0F6E56] transition-colors"
                        >
                          🪄 Bu Formatı Uyarla →
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* CTA */}
              <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-6 text-center">
                <p className="text-[15px] font-medium text-[#085041] mb-1">Bu işi otomasyona bağlayalım</p>
                <p className="text-[13px] text-[#0F6E56] mb-4 leading-relaxed">
                  Uzmanlarımız video pazarlama stratejinizi oluştursun.
                </p>
                <a
                  href="https://kolaykobi.com/iletisim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#1D9E75] text-white px-6 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#0F6E56] transition-colors"
                >
                  Ücretsiz Görüşme Ayarla
                </a>
              </div>

              <button onClick={handleReset} className="text-[13px] text-[#9A9792] underline text-center">
                Yeni arama yap
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
