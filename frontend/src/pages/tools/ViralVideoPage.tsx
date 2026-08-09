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

interface ScriptAdim {
  sure: string
  sahne: string
  seslendirme: string
  gorseller: string
}

interface ViralResult {
  video_konsepti: string
  script: ScriptAdim[]
  hashtags: string[]
  muzik_onerileri?: string[]
  ipuclari?: string[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const PLATFORMLAR = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook Reels']
const SURELER = ['15 saniye', '30 saniye', '60 saniye', '1-3 dakika']

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; platform: string
  sure: string; viral_video: string; hizmet: string
}): string {
  return `Sen viral video içerik stratejisti ve sosyal medya uzmanısın. Trend olan video formatlarını işletmeler için uyarlıyorsun.

İŞLETME: ${f.isletme}
SEKTÖR: ${f.sektor}
PLATFORM: ${f.platform}
VİDEO SÜRESİ: ${f.sure}
UYARLANACAK VİRAL VİDEO / TREND FORMAT: ${f.viral_video}
TANITILACAK HİZMET/ÜRÜN: ${f.hizmet}

Bu viral video formatını ${f.isletme} için uyarla.
- ${f.platform} için optimize et
- ${f.sure} süreye sığdır
- Sahici, özgün ve paylaşılabilir olsun
- Müşterilerin dikkatini ilk 3 saniyede çek (hook)

SADECE JSON döndür:
{
  "video_konsepti": "<videonun ana fikri ve neden viral olacağı, 2-3 cümle>",
  "script": [
    {
      "sure": "<zaman aralığı, örn: 0:00-0:03>",
      "sahne": "<sahnede ne oluyor, görsel açıklama>",
      "seslendirme": "<söylenecek metin veya anlatı>",
      "gorseller": "<kullanılacak görsel/çekim önerisi>"
    }
  ],
  "hashtags": ["<10-15 hashtag, # ile başlasın>"],
  "muzik_onerileri": ["<2-3 müzik/ses önerisi>"],
  "ipuclari": ["<çekim ve yayınlama ipuçları, 3-4 madde>"],
  "ctaText": "<${f.isletme} için motivasyon cümlesi>"
}
Script 4-8 sahne olsun. Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ViralVideoPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [platform, setPlatform] = useState('')
  const [sure, setSure] = useState('')
  const [viral_video, setViralVideo] = useState('')
  const [hizmet, setHizmet] = useState('')
  const [result, setResult] = useState<ViralResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, platform, sure, viral_video, hizmet })
      const res = await api.post('/tools/viral-video/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as ViralResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && platform && viral_video.trim() && !mutation.isPending

  return (
    <ToolShell
      toolId="viral-video"
      title="Viral Video Uyarlayıcı"
      icon="🎬"
      description="Viral videoları kendi işletmeniz için uyarlayın. Platform ve süreye özel hazır script ve çekim önerileri."
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
                  placeholder="Örn: Pasta Atölyesi Berna"
                  value={isletme}
                  onChange={(e) => setIsletme(e.target.value)}
                />

                <Select
                  label="Sektör *"
                  value={sektor}
                  onChange={(e) => setSektor(e.target.value)}
                  options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Platform *</p>
                    <div className="flex flex-col gap-2">
                      {PLATFORMLAR.map((p) => (
                        <button key={p} type="button" onClick={() => setPlatform(p)}
                          className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            platform === p ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                          }`}>
                          {p === 'TikTok' ? '🎵' : p === 'Instagram Reels' ? '📸' : p === 'YouTube Shorts' ? '▶️' : '👍'} {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Video süresi</p>
                    <div className="flex flex-col gap-2">
                      {SURELER.map((s) => (
                        <button key={s} type="button" onClick={() => setSure(s)}
                          className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            sure === s ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                          }`}>
                          ⏱ {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Textarea
                  label="Uyarlamak istediğiniz viral video / trend format *"
                  placeholder="Örn: 'Müşteri öncesi-sonrası dönüşüm' trendi, veya 'Bir günüm nasıl geçiyor' vlog formatı, ya da TikTok'ta gördüğüm şef pasta yapım videosu"
                  value={viral_video}
                  onChange={(e) => setViralVideo(e.target.value)}
                  rows={3}
                />

                <Textarea
                  label="Tanıtılacak hizmet / ürün"
                  placeholder="Örn: El yapımı butik pastalar, özel tasarım doğum günü pastaları"
                  value={hizmet}
                  onChange={(e) => setHizmet(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="viral-video-formu.json"
                  getData={() => ({ isletme, sektor, platform, sure, viral_video, hizmet })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.platform === 'string') setPlatform(d.platform)
                    if (typeof d.sure === 'string') setSure(d.sure)
                    if (typeof d.viral_video === 'string') setViralVideo(d.viral_video)
                    if (typeof d.hizmet === 'string') setHizmet(d.hizmet)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🎬 Script Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Video scripti hazırlanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Konsept */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🎬 Video Konsepti</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{result.video_konsepti}</p>
              </div>

              {/* Script */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">🎥 Video Script</h3>
                <div className="flex flex-col gap-3">
                  {result.script.map((adim, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-mono font-bold text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-0.5 rounded">
                          {adim.sure}
                        </span>
                        <span className="text-xs text-gray-500">{adim.sahne}</span>
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        {adim.seslendirme && (
                          <p className="text-sm text-gray-800">
                            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide mr-2">🎤 Metin:</span>
                            {adim.seslendirme}
                          </p>
                        )}
                        {adim.gorseller && (
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-xs uppercase tracking-wide mr-2">📷 Görsel:</span>
                            {adim.gorseller}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hashtag */}
              {result.hashtags.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3"># Hashtag Önerileri</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#1D9E75]/10 text-xs text-[#1D9E75] font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Müzik + İpuçları */}
              {((result.muzik_onerileri && result.muzik_onerileri.length > 0) || (result.ipuclari && result.ipuclari.length > 0)) && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  {result.muzik_onerileri && result.muzik_onerileri.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">🎵 Müzik Önerileri</h3>
                      <ul className="flex flex-col gap-1">
                        {result.muzik_onerileri.map((m, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2">
                            <span className="shrink-0">♪</span>{m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.ipuclari && result.ipuclari.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 Çekim İpuçları</h3>
                      <ul className="flex flex-col gap-1.5">
                        {result.ipuclari.map((ip, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-600">
                            <span className="text-[#1D9E75] shrink-0">✓</span>{ip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {result.ctaText && (
                <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
                  <p className="text-sm text-[#1D9E75] font-medium">{result.ctaText}</p>
                </div>
              )}

              <button onClick={() => setResult(null)} className="text-sm text-gray-400 underline text-center no-print">
                Yeni script oluştur
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
