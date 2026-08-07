import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ResultCard, ResultSection } from '@/components/ui/ResultCard'
import type { IcerikTakvimiPayload } from '@/types'

type JobStatus = 'idle' | 'pending' | 'polling' | 'done' | 'error'

interface ContentItem {
  gun: string
  tarih: string
  platform: string
  icerik_turu: string
  konu: string
  baslik: string
  icerik: string
  hashtag: string[]
  en_iyi_saat: string
}

interface TakvimiResult {
  job_id?: string // async tools return job_id first
  icerik_takvimi?: ContentItem[]
  ozet?: string
  ipuclari?: string[]
}

const PLATFORMLAR = ['Instagram', 'Facebook', 'TikTok', 'Twitter/X', 'LinkedIn']

const SURE_OPTIONS = [
  { value: '1', label: '1 Hafta' },
  { value: '2', label: '2 Hafta' },
  { value: '4', label: '1 Ay' },
]

const PLATFORM_EMOJIS: Record<string, string> = {
  Instagram: '📸', Facebook: '👍', TikTok: '🎵', 'Twitter/X': '✖️', LinkedIn: '💼'
}

export function IcerikTakvimiPage() {
  const [form, setForm] = useState<IcerikTakvimiPayload>({
    isletme_adi: '',
    sektor: '',
    hedef_kitle: '',
    urun_hizmet: '',
    platformlar: [],
    sure_hafta: 2,
    ton: 'profesyonel',
  })
  const [result, setResult] = useState<ContentItem[] | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus>('idle')
  const [pollCount, setPollCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const update = <K extends keyof IcerikTakvimiPayload>(field: K, value: IcerikTakvimiPayload[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const togglePlatform = (p: string) =>
    setForm((prev) => ({
      ...prev,
      platformlar: prev.platformlar.includes(p)
        ? prev.platformlar.filter((x) => x !== p)
        : [...prev.platformlar, p],
    }))

  // Polling logic for async job
  useEffect(() => {
    if (status !== 'polling' || !jobId) return

    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1)
      try {
        const res = await api.get<TakvimiResult>(`/tools/icerik-takvimi/status/${jobId}`)
        if (res.data.icerik_takvimi) {
          clearInterval(pollRef.current!)
          setResult(res.data.icerik_takvimi)
          setStatus('done')
        }
      } catch {
        clearInterval(pollRef.current!)
        setStatus('error')
      }
    }, 4000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [status, jobId])

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<TakvimiResult>('/tools/icerik-takvimi/run', form)
      return res.data
    },
    onSuccess: (data) => {
      if (data.job_id) {
        setJobId(data.job_id)
        setStatus('polling')
        setPollCount(0)
      } else if (data.icerik_takvimi) {
        setResult(data.icerik_takvimi)
        setStatus('done')
      }
    },
    onError: () => setStatus('error'),
  })

  const handleSubmit = () => {
    setStatus('pending')
    setResult(null)
    mutation.mutate()
  }

  const canSubmit =
    form.isletme_adi.trim() &&
    form.sektor.trim() &&
    form.platformlar.length > 0 &&
    status !== 'pending' &&
    status !== 'polling'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📅</span>
          <h1 className="text-2xl font-bold text-gray-900">İçerik Takvimi Üreticisi</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Sosyal medya için hazır içerik takvimi oluşturun. Haftalık veya aylık plan, platform bazında içerikler.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          <Input
            label="İşletme Adı *"
            placeholder="ör. Çiçek Butik"
            value={form.isletme_adi}
            onChange={(e) => update('isletme_adi', e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Sektör *"
              placeholder="ör. El Yapımı Takı"
              value={form.sektor}
              onChange={(e) => update('sektor', e.target.value)}
            />
            <Input
              label="Hedef Kitle"
              placeholder="ör. 25-40 yaş kadınlar"
              value={form.hedef_kitle}
              onChange={(e) => update('hedef_kitle', e.target.value)}
            />
          </div>

          <Textarea
            label="Ürün / Hizmet"
            placeholder="Ne satıyorsunuz?"
            rows={2}
            value={form.urun_hizmet}
            onChange={(e) => update('urun_hizmet', e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Platformlar *</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMLAR.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition flex items-center gap-1.5
                    ${form.platformlar.includes(p)
                      ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                      : 'border-gray-300 text-gray-600 hover:border-[#1D9E75]'}`}
                >
                  <span>{PLATFORM_EMOJIS[p]}</span> {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Süre"
              value={String(form.sure_hafta)}
              onChange={(e) => update('sure_hafta', Number(e.target.value) as 1 | 2 | 4)}
              options={SURE_OPTIONS}
            />
            <Select
              label="İletişim Tonu"
              value={form.ton}
              onChange={(e) => update('ton', e.target.value as IcerikTakvimiPayload['ton'])}
              options={[
                { value: 'profesyonel', label: 'Profesyonel' },
                { value: 'samimi', label: 'Samimi / Sıcak' },
                { value: 'eglenceli', label: 'Eğlenceli / Enerjik' },
                { value: 'bilgilendirici', label: 'Bilgilendirici / Otoriter' },
              ]}
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={status === 'pending' || status === 'polling'}
            className="mt-2"
          >
            {status === 'polling'
              ? `İçerik oluşturuluyor... (${pollCount * 4}s)`
              : 'İçerik Takvimi Oluştur'}
          </Button>

          {status === 'polling' && (
            <p className="text-xs text-center text-gray-400 -mt-2">
              Bu işlem 30-60 saniye sürebilir. Lütfen bekleyin...
            </p>
          )}
        </div>
      </div>

      {/* Result */}
      {result && result.length > 0 && (
        <ResultCard>
          <ResultSection title={`${result.length} İçerik Planı`}>
            <div className="flex flex-col gap-3">
              {result.map((item, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-4 hover:border-[#1D9E75]/30 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{PLATFORM_EMOJIS[item.platform] ?? '📝'}</span>
                      <span className="text-xs font-semibold text-gray-500">{item.platform}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{item.gun} {item.tarih}</span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                      {item.icerik_turu}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-gray-800 mb-1">{item.baslik}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.icerik}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.hashtag.map((tag, j) => (
                      <span key={j} className="text-xs text-[#1D9E75]">{tag}</span>
                    ))}
                  </div>
                  {item.en_iyi_saat && (
                    <p className="text-xs text-gray-400 mt-2">⏰ En iyi paylaşım saati: {item.en_iyi_saat}</p>
                  )}
                </div>
              ))}
            </div>
          </ResultSection>
        </ResultCard>
      )}
    </div>
  )
}
