import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'
import { useProfilOnDolgu } from '@/hooks/useIsletmeProfili'
import { SEKTOR_SECENEKLERI_TUMU } from '@/lib/sektorler'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TikTokVideo {
  rank: number
  author: string
  title: string
  webVideoUrl: string
  playCount?: number
  diggCount?: number
  hashtags?: string[]
  // Format Replication — n8n tarafından hesaplanır, mevcut değilse gizlenir
  adaptabilityScore?: number              // 0–100
  formatAdi?: string                      // Ör: "POV", "Expectation vs Reality"
  trendDurumu?: 'rising' | 'peak' | 'falling' | string
  uretimZorlugu?: number                  // 1–5
  markaGuvenligi?: number                 // 1–5
}

interface TrendResult { videos: TikTokVideo[] }

// ─── Constants ────────────────────────────────────────────────────────────────

// ⚠️ Bu değerler ViralVideoPage.tsx'teki TONLAR ile BİREBİR aynı olmalı —
// "Bu Formatı Uyarla →" URL param olarak geçiyor.
const TONLAR = [
  'Eğlenceli / Komik',
  'Bilgilendirici',
  'İlham Verici',
  'Duygusal / Samimi',
  'Profesyonel / Kurumsal',
  'Merak Uyandıran',
]

const LOADING_MESSAGES = [
  'Trend videolar taranıyor...',
  'Sektörel içerikler araştırılıyor...',
  'TikTok verileri çekiliyor...',
  'Viral potansiyel analiz ediliyor...',
  'Uyarlanabilirlik skorları hesaplanıyor...',
  'Son rötuşlar yapılıyor...',
]

const MAX_POLL_ATTEMPTS = 220
const POLL_INTERVAL_MS  = 3000
const LS_KEY = 'trend-video-last-result'

// ─── localStorage helpers (hızlı fallback — backend asıl kaynak) ─────────────

interface PersistedState {
  result: TrendResult
  bizName: string
  sector: string
  tones: string[]
  note: string
  savedAt: number
}

function loadLocalResult(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function saveLocalResult(result: TrendResult, bizName: string, sector: string, tones: string[], note: string) {
  try {
    const data: PersistedState = { result, bizName, sector, tones, note, savedAt: Date.now() }
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    // storage quota exceeded — sessiz geç
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n?: number): string {
  if (n == null) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('tr-TR')
}

function scoreColor(score: number): { ring: string; text: string; bg: string } {
  if (score >= 80) return { ring: '#1D9E75', text: '#085041', bg: '#F0FAF6' }
  if (score >= 60) return { ring: '#D4A017', text: '#7A5C00', bg: '#FEF9EC' }
  return                 { ring: '#C94040', text: '#7A1C1C', bg: '#FDF2F2' }
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Çok Yüksek'
  if (score >= 60) return 'Yüksek'
  if (score >= 40) return 'Orta'
  return 'Düşük'
}

function trendBadge(durumu?: string): { label: string; color: string; bg: string } | null {
  if (!durumu) return null
  if (durumu === 'rising')  return { label: '↑ Yükseliyor', color: '#085041', bg: '#E6F9F2' }
  if (durumu === 'peak')    return { label: '⬆ Zirve',      color: '#7A5C00', bg: '#FEF9EC' }
  if (durumu === 'falling') return { label: '↓ Düşüyor',    color: '#7A1C1C', bg: '#FDF2F2' }
  return { label: durumu, color: '#3A3935', bg: '#F2F1ED' }
}

function starDots(value: number, max = 5, activeColor = '#1D9E75') {
  return (
    <span className="flex gap-[3px] items-center">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: i < value ? activeColor : '#D3D1C7' }}
        />
      ))}
    </span>
  )
}

// ─── Adaptability Score Ring (SVG) ───────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const fill = circ - (score / 100) * circ
  const col  = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r={r} fill="none" stroke="#E2E0D8" strokeWidth="4" />
          <circle
            cx="28" cy="28" r={r}
            fill="none"
            stroke={col.ring}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={fill}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <span
          className="absolute text-[15px] font-bold tabular-nums"
          style={{ color: col.text }}
        >
          {score}
        </span>
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
        style={{ color: col.text, background: col.bg }}
      >
        {scoreLabel(score)}
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendVideoPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  // Form state
  const [bizName,  setBizName]  = useState('')
  const [sector,   setSector]   = useState('')
  const [tones,    setTones]    = useState<string[]>([])
  const [audience, setAudience] = useState('')
  const [note,     setNote]     = useState('')

  // Async job state
  const [isPending,  setIsPending]  = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [elapsedSec, setElapsedSec] = useState(0)

  // İşletme profilinden ön dolgu — boş alanlar doldurulur, kullanıcının
  // yazdığına dokunulmaz (bkz. useProfilOnDolgu).
  useProfilOnDolgu({
    businessName: [bizName, setBizName],
    sector: [sector, setSector],
    targetAudience: [audience, setAudience],
  })
  const [error,      setError]      = useState<string | null>(null)
  const [result,     setResult]     = useState<TrendResult | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Mount: Backend'den son kayıtlı sonucu yükle, yoksa localStorage'a bak ──
  useEffect(() => {
    // 1. Hızlı: localStorage'dan göster (gecikme yok)
    const local = loadLocalResult()
    if (local) {
      setResult(local.result)
      if (local.bizName)       setBizName(local.bizName)
      if (local.sector)        setSector(local.sector)
      if (local.tones?.length) setTones(local.tones)
      if (local.note)          setNote(local.note)
    }

    // 2. Kalıcı: Backend'den son kayıtlı sonucu al (oturum/cihaz bağımsız)
    api.get<{ success: boolean; data: { OutputJson: string; InputSummary: string; CreatedAt: string } }>(
      '/tools/trend-video/last-result'
    ).then((res) => {
      if (!res.data?.success || !res.data.data?.OutputJson) return
      try {
        const parsed = JSON.parse(res.data.data.OutputJson) as { videos?: TikTokVideo[]; sector?: string }
        if (!parsed.videos?.length) return
        const backendResult: TrendResult = { videos: parsed.videos }
        setResult(backendResult)
        // Backend'in sektörü varsa form'a yaz
        if (parsed.sector) setSector(parsed.sector)
        // Local cache'i de taze tut (tones/note mevcut local state'den korunur)
        saveLocalResult(backendResult, '', parsed.sector ?? '', [], '')
      } catch { /* JSON parse hatası — görmezden gel */ }
    }).catch(() => { /* Backend henüz sonuç kaydetmemiş — sorun değil */ })
  }, [])

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
          const newResult = { videos: res.data.videos ?? [] }
          setResult(newResult)
          // localStorage'a da yaz — backend kayıt zaten PollStatus'ta otomatik yapılıyor
          saveLocalResult(newResult, bizName, sector, tones, note)
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
  }, [clearPolling, queryClient, bizName, sector, tones, note])

  const handleGenerate = async () => {
    if (!sector || tones.length === 0 || isPending) return
    setError(null)
    setResult(null)
    setIsPending(true)
    setElapsedSec(0)
    setLoadingMsg(LOADING_MESSAGES[0])

    try {
      const res = await api.post<{ job_id: string }>(
        '/tools/trend-video/run',
        {
          biz: bizName, isletmeAdi: bizName, sector, tones, audience, note,
          /* Geçmiş Çıktılar'da "bu çıktı hangi bilgilerle üretildi" kartı için. */
          formBilgileri: {
            'İşletme': bizName, 'Sektör': sector,
            'Marka tonu': tones.join(', ') || 'seçilmedi',
            'Hedef kitle': audience, 'Ek not': note,
          },
        }
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
    // Local cache'i temizle — backend'deki kayıt kalır (geçmiş olarak erişilebilir)
    localStorage.removeItem(LS_KEY)
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
      isPending={isPending}
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
                  options={[{ value: '', label: 'Seçin...' }, ...SEKTOR_SECENEKLERI_TUMU]}
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
                  label="Ek Not (isteğe bağlı)"
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
                  tones:  tones.join(','),
                  ...(note ? { extra: note } : {}),
                }).toString()

                const trend    = trendBadge(v.trendDurumu)
                const hasScore = v.adaptabilityScore != null

                return (
                  <div key={v.rank} className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">

                    {/* ── Header ── */}
                    <div className="flex items-start gap-4 px-5 py-4 border-b border-[#F1EFE8]">
                      {/* Sıralama numarası */}
                      <div className="w-[34px] h-[34px] rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-[13px] font-semibold shrink-0 mt-0.5">
                        {v.rank}
                      </div>

                      {/* Başlık + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1C1B19] leading-snug mb-1.5">
                          {v.author && (
                            <span className="text-[#1D9E75]">@{v.author} — </span>
                          )}
                          {(v.title ?? '').slice(0, 100)}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap text-[12px]">
                          {/* Format adı */}
                          {v.formatAdi && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EDE9FE] text-[#4C1D95] rounded-md font-medium border border-[#C4B5FD]">
                              🎬 {v.formatAdi}
                            </span>
                          )}

                          {/* Platform badge */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FAF6] text-[#085041] rounded-md font-medium">
                            TikTok
                          </span>

                          {/* Trend durumu */}
                          {trend && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md font-medium"
                              style={{ color: trend.color, background: trend.bg }}
                            >
                              {trend.label}
                            </span>
                          )}

                          {/* Play count */}
                          {v.playCount != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF9EC] text-[#7A5C00] rounded-md font-medium border border-[#F5D76E]">
                              👁 {formatCount(v.playCount)}
                            </span>
                          )}

                          {/* Like count */}
                          {v.diggCount != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF0F6] text-[#9D1B4E] rounded-md font-medium border border-[#FBA7C5]">
                              ❤️ {formatCount(v.diggCount)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Adaptability Score ring — sadece değer varsa */}
                      {hasScore && (
                        <div className="shrink-0 ml-1">
                          <ScoreRing score={v.adaptabilityScore!} />
                          <p className="text-[10px] text-[#9A9792] text-center mt-1 leading-tight">
                            Uyarla-<br />nabilirlik
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Body ── */}
                    <div className="px-5 py-4 flex flex-col gap-3">

                      {/* Detay metrikler — sadece en az biri varsa */}
                      {(v.uretimZorlugu != null || v.markaGuvenligi != null) && (
                        <div className="flex gap-5 text-[12px] text-[#6B6963]">
                          {v.uretimZorlugu != null && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#1C1B19]">Üretim zorluğu</span>
                              {starDots(v.uretimZorlugu, 5, '#1D9E75')}
                            </div>
                          )}
                          {v.markaGuvenligi != null && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#1C1B19]">Marka güvenliği</span>
                              {starDots(v.markaGuvenligi, 5, '#1D9E75')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hashtags — h string veya {name: string} olabilir (Apify formatı) */}
                      {(v.hashtags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(v.hashtags ?? [])
                            .map((h) => (typeof h === 'string' ? h : (h as { name?: string })?.name ?? ''))
                            .filter(Boolean)
                            .map((tag) => (
                              <span key={tag} className="text-[11px] px-2 py-0.5 bg-[#F0FAF6] border border-[#9FE1CB] text-[#085041] font-medium rounded-md">
                                #{tag}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Aksiyon butonları */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
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
                          onClick={() => navigate(`/arac/viral-video?${uyarlaParams}`)}
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
