import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { parseAiJson } from '@/lib/parseAiJson'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UyarlamaFikir {
  numara: number
  baslik: string
  senaryo: string
  kanca?: string
  ipucu?: string
  platformlar?: string[]
  format?: string
}

interface ViralVideoResult {
  kaynak_analiz?: string
  uyarlamalar: UyarlamaFikir[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Lojistik / Taşımacılık', 'E-ticaret / Perakende', 'Restoran / Kafe / Yiyecek',
  'Güzellik / Kuaför / Estetik', 'Sağlık / Klinik / Eczane', 'İnşaat / Gayrimenkul',
  'Muhasebe / Finans / Danışmanlık', 'Eğitim / Kurs / Koçluk', 'Teknoloji / Yazılım',
  'Turizm / Otel / Seyahat', 'Hukuk / Avukatlık', 'Temizlik / Hizmet', 'Diğer',
]

const TONLAR = [
  'Eğlenceli / Komik',
  'Bilgilendirici',
  'İlham Verici',
  'Duygusal / Samimi',
  'Profesyonel / Kurumsal',
  'Merak Uyandıran',
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  videoUrl: string; videoDesc: string; bizName: string
  sector: string; tones: string[]; extra: string
}): string {
  return `Sen sosyal medya içerik uzmanısın. Viral videoları KOBİ'lere özgü uyarlamalara dönüştürüyorsun.

Viral Video Linki: ${f.videoUrl}
Videonun Konusu: ${f.videoDesc}
İşletme: ${f.bizName || 'belirtilmemiş'}
Sektör: ${f.sector}
Tercih edilen ton: ${f.tones.length > 0 ? f.tones.join(', ') : 'serbest'}
Ek bağlam: ${f.extra || 'yok'}

Bu viral videonun formatını ve yapısını analiz et. Ardından ${f.bizName || 'bu işletme'} için 3 farklı uyarlama fikri üret. Her fikir videonun viral elementini koruyarak sektöre özgü olmalı.

SADECE JSON döndür:
{
  "kaynak_analiz": "<videonun neden viral olduğuna dair 1-2 cümle analiz>",
  "uyarlamalar": [
    {
      "numara": 1,
      "baslik": "<uyarlama başlığı>",
      "senaryo": "<tam senaryo açıklaması, ne çekileceği, nasıl kurgulanacağı>",
      "kanca": "<ilk 3 saniyedeki dikkat çekici kanca cümlesi>",
      "ipucu": "<çekim veya kurgu için pratik ipucu>",
      "platformlar": ["<ör: TikTok>", "<ör: Instagram Reels>"],
      "format": "<ör: 15-30 sn, dikey video>"
    }
  ],
  "ctaText": "<${f.bizName || 'işletme'} için motivasyon cümlesi>"
}
3 uyarlama olsun. Türkçe, yaratıcı ve uygulanabilir olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ViralVideoPage() {
  const queryClient = useQueryClient()
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [bizName, setBizName] = useState('')
  const [sector, setSector] = useState('')
  const [tones, setTones] = useState<string[]>([])
  const [extra, setExtra] = useState('')
  const [result, setResult] = useState<ViralVideoResult | null>(null)

  const toggleTone = (t: string) =>
    setTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ videoUrl, videoDesc, bizName, sector, tones, extra })
      const res = await api.post('/tools/viral-video/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return parseAiJson<ViralVideoResult>(content)
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = videoUrl.trim() && videoDesc.trim() && sector && !mutation.isPending

  return (
    <ToolShell
      toolId="viral-video"
      title="Viral Video Uyarlayıcı"
      icon="🎬"
      description="Sosyal medyada gördüğün viral bir videoyu yapıştır. Yapay zeka videonun formatını analiz edip işletmene özel uyarlama fikirleri üretir."
      hasResult={!!result}
      formHasInput={!!videoUrl.trim()}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                  {header}
                <Input
                  label="Video Linki *"
                  placeholder="https://www.tiktok.com/@... veya https://www.instagram.com/reel/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  type="url"
                />

                <Textarea
                  label="Video Ne Hakkında? *"
                  placeholder="Videonun konusunu kısaca açıkla. Örn: Bir penguen tuhaf şekilde yürüyor, üzerine komik müzik eklenmiş ve sonunda bir iş yerinde çalışıyormuş gibi sahne geliyor."
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  rows={3}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="İşletme Adı"
                    placeholder="Logvance Lojistik"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                  <Select
                    label="Sektör *"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">Video Tonu</p>
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

                <Textarea
                  label="Ek Bağlam (isteğe bağlı)"
                  placeholder="Hedef kitlen, öne çıkarmak istediğin ürün/hizmet, ya da özellikle değinmek istediğin bir konu varsa yaz."
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="viral-video-formu.json"
                  getData={() => ({ videoUrl, videoDesc, bizName, sector, tones, extra })}
                  onLoad={(d) => {
                    if (typeof d.videoUrl === 'string') setVideoUrl(d.videoUrl)
                    if (typeof d.videoDesc === 'string') setVideoDesc(d.videoDesc)
                    if (typeof d.bizName === 'string') setBizName(d.bizName)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (Array.isArray(d.tones)) setTones(d.tones as string[])
                    if (typeof d.extra === 'string') setExtra(d.extra)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🎬 Uyarlama Fikirlerini Üret
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Format analiz ediliyor, uyarlama fikirleri üretiliyor — 10–30 saniye sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.kaynak_analiz && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">🔍 Viral Analiz</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.kaynak_analiz}</p>
                </div>
              )}

              {result.uyarlamalar.map((u, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                    <div className="w-7 h-7 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {u.numara}
                    </div>
                    <span className="font-semibold text-sm text-[#085041]">{u.baslik}</span>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    {/* Senaryo balonu */}
                    <div className="relative bg-[#DCF8C6] rounded-tr-xl rounded-b-xl px-4 py-3 text-sm text-[#1C1B19] leading-relaxed whitespace-pre-wrap">
                      <div className="absolute left-0 top-0 w-0 h-0" style={{ borderTop: '8px solid #DCF8C6', borderLeft: '8px solid transparent', left: '-8px' }} />
                      {u.senaryo}
                    </div>

                    {u.kanca && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <p className="text-xs font-semibold text-amber-700 mb-0.5">🎣 İlk 3 Saniye Kancası</p>
                        <p className="text-sm text-amber-800">{u.kanca}</p>
                      </div>
                    )}

                    {u.ipucu && (
                      <div className="flex gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
                        <span className="text-[#1D9E75] shrink-0">💡</span>{u.ipucu}
                      </div>
                    )}

                    {(u.platformlar || u.format) && (
                      <div className="flex gap-2 flex-wrap">
                        {u.platformlar?.map((p) => (
                          <span key={p} className="text-xs px-2.5 py-1 bg-[#E1F5EE] text-[#085041] font-medium rounded-full">{p}</span>
                        ))}
                        {u.format && (
                          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-full">{u.format}</span>
                        )}
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
                Yeni uyarlama üret
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
