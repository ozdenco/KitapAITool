import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { useProfilOnDolgu } from '@/hooks/useIsletmeProfili'
import { SEKTORLER } from '@/lib/sektorler'
import { AramaliSecici } from '@/components/ui/AramaliSecici'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SektoreOzguUyarlama {
  sektor: string
  hook: string
  senaryo_taslagi: string
  cta?: string
}

interface ViralVideoResult {
  format_adi?: string
  format_tipi?: string
  format_aciklamasi?: string
  kurgu_yapisi?: string
  ornek_hook?: string
  sure?: string
  uretim_zorlugu?: string
  marka_guvenligi?: string
  sektore_ozgu_uyarlamalar: SektoreOzguUyarlama[]
  uygulama_ipuclari?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TONLAR = [
  'Eğlenceli / Komik',
  'Bilgilendirici',
  'İlham Verici',
  'Duygusal / Samimi',
  'Profesyonel / Kurumsal',
  'Merak Uyandıran',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ViralVideoPage() {
  const queryClient     = useQueryClient()
  const [searchParams]  = useSearchParams()

  // Form state
  const [videoUrl,  setVideoUrl]  = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [bizName,   setBizName]   = useState('')
  const [sector,    setSector]    = useState('')
  const [bizUrl,    setBizUrl]    = useState('')
  const [tones,     setTones]     = useState<string[]>([])
  const [extra,     setExtra]     = useState('')

  // Sonuç + akış bildirimi
  const [result,        setResult]        = useState<ViralVideoResult | null>(null)
  const [fromTrend,     setFromTrend]     = useState(false)

  // İşletme profilinden ön dolgu — boş alanlar doldurulur, kullanıcının
  // yazdığına dokunulmaz (bkz. useProfilOnDolgu).
  useProfilOnDolgu({
    businessName: [bizName, setBizName],
    sector: [sector, setSector],
    website: [bizUrl, setBizUrl],
  })

  // URL parametrelerinden form doldur (Trend Video Bulucu entegrasyonu)
  useEffect(() => {
    const urlParam    = searchParams.get('url')
    const descParam   = searchParams.get('desc')
    const sectorParam = searchParams.get('sector')
    const bizParam    = searchParams.get('biz')
    const bizUrlParam = searchParams.get('bizUrl')
    const tonesParam  = searchParams.get('tones')
    const extraParam  = searchParams.get('extra')

    if (urlParam)    setVideoUrl(urlParam)
    if (descParam)   setVideoDesc(descParam.slice(0, 500))
    if (bizParam)    setBizName(bizParam)
    if (bizUrlParam) setBizUrl(bizUrlParam)
    if (extraParam)  setExtra(extraParam)

    if (sectorParam) {
      // 1. Tam eşleşme (TrendVideoPage sektör değerleri birebir aynı olmalı)
      // 2. İlk kelime eşleşmesi — geriye dönük uyumluluk için
      const exact   = SEKTORLER.find((s) => s === sectorParam)
      const partial = SEKTORLER.find((s) => s.startsWith(sectorParam.split('/')[0].trim()))
      const match   = exact ?? partial
      if (match) setSector(match)
    }

    if (tonesParam) {
      // "Eğlenceli / Komik,Bilgilendirici" → ['Eğlenceli / Komik', 'Bilgilendirici']
      // Sadece TONLAR listesindeki geçerli değerleri kabul et
      const incoming = tonesParam.split(',').map((t) => t.trim()).filter(Boolean)
      const valid    = incoming.filter((t) => TONLAR.includes(t))
      if (valid.length > 0) setTones(valid)
    }

    if (urlParam || descParam) setFromTrend(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTone = (t: string) =>
    setTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const mutation = useMutation<ViralVideoResult>({
    mutationFn: async () => {
      const res = await api.post<ViralVideoResult>('/tools/viral-video/run', {
        isletmeAdi: bizName,
        videoUrl,
        videoDesc,
        sector,
        biz:    bizName || undefined,
        bizUrl: bizUrl  || undefined,
        tones,
        note:   extra   || undefined,
      })
      return res.data
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  // Bekleme sirasinda gecen sureyi gosterir (sabit mesaj donmus hissi veriyordu)
  const elapsedSec = useElapsedSeconds(mutation.isPending)

  const canSubmit = videoUrl.trim() && videoDesc.trim() && sector && !mutation.isPending

  return (
    <ToolShell
      toolId="viral-video"
      title="Viral Video Uyarlayıcı"
      icon="🎬"
      description="Sosyal medyada gördüğün viral bir videoyu yapıştır. Yapay zeka videonun formatını analiz edip işletmene özel uyarlama fikirleri üretir."
      hasResult={!!result}
      formHasInput={!!videoUrl.trim()}
      isPending={mutation.isPending}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                {header}

                {/* Trend Video Bulucu'dan aktar bildirimi */}
                {fromTrend && (
                  <div className="flex items-center gap-2 bg-[#F0FAF6] border border-[#9FE1CB] rounded-lg px-4 py-2.5 text-[12.5px] text-[#085041]">
                    📈 Trend Video Bulucu'dan aktarıldı. Alanları kontrol edip uyarla butonuna basın.
                  </div>
                )}

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
                  <AramaliSecici
                    label="Sektör *"
                    value={sector}
                    onChange={setSector}
                    secenekler={SEKTORLER}
                  />
                </div>

                <Input
                  label="Firma Web Sitesi (isteğe bağlı — daha kişisel senaryo için)"
                  placeholder="https://logvance.com.tr"
                  value={bizUrl}
                  onChange={(e) => setBizUrl(e.target.value)}
                  type="url"
                />

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
                  label="Ek Not (isteğe bağlı)"
                  placeholder="Hedef kitlen, öne çıkarmak istediğin ürün/hizmet, ya da özellikle değinmek istediğin bir konu varsa yaz."
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="viral-video-formu.json"
                  getData={() => ({ videoUrl, videoDesc, bizName, sector, bizUrl, tones, extra })}
                  onLoad={(d) => {
                    if (typeof d.videoUrl  === 'string') setVideoUrl(d.videoUrl)
                    if (typeof d.videoDesc === 'string') setVideoDesc(d.videoDesc)
                    if (typeof d.bizName   === 'string') setBizName(d.bizName)
                    if (typeof d.sector    === 'string') setSector(d.sector)
                    if (typeof d.bizUrl    === 'string') setBizUrl(d.bizUrl)
                    if (Array.isArray(d.tones))          setTones(d.tones as string[])
                    if (typeof d.extra     === 'string') setExtra(d.extra)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-[13px] text-[#A32D2D] bg-[#FCEBEB] rounded-xl px-4 py-3">
                    ⚠️ {(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}
                  </p>
                )}

                <Button
                  onClick={() => mutation.mutate()}
                  disabled={!canSubmit}
                  loading={mutation.isPending}
                  className="mt-1 w-full"
                >
                  🎬 Uyarlama Fikirlerini Üret
                </Button>

                {mutation.isPending && (
                  <p className="text-center text-[13px] text-[#9A9792] animate-pulse">
                    Format analiz ediliyor, uyarlama fikirleri üretiliyor — {elapsedSec} sn geçti
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Sonuçlar ── */}
          {result && (
            <div className="flex flex-col gap-4">

              {/* Kaynak kart + format analizi */}
              <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#F0FAF6] flex items-center justify-center text-lg shrink-0">🎬</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">Kaynak Video</p>
                  <p className="text-[13px] text-[#1C1B19] break-all mb-2">{videoUrl}</p>

                  {/* Format analizi — tüm format_* alanlarını satır satır yazar */}
                  {(() => {
                    const lines: string[] = []
                    if (result.format_adi)         lines.push('📌 ' + result.format_adi)
                    if (result.format_tipi)        lines.push('Tür: ' + result.format_tipi)
                    if (result.format_aciklamasi)  lines.push(result.format_aciklamasi)
                    if (result.kurgu_yapisi)       lines.push('🎬 Kurgu: ' + result.kurgu_yapisi)
                    if (result.ornek_hook)         lines.push('🪝 Örnek Hook: ' + result.ornek_hook)
                    const meta = [
                      result.sure,
                      result.uretim_zorlugu ? 'Üretim: ' + result.uretim_zorlugu : '',
                      result.marka_guvenligi ? 'Marka: ' + result.marka_guvenligi : '',
                    ].filter(Boolean).join(' · ')
                    if (meta) lines.push(meta)
                    if (lines.length === 0) return null
                    return (
                      <div className="border-t border-[#F1EFE8] pt-2 text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">
                        {lines.join('\n')}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Uyarlama kartları */}
              {result.sektore_ozgu_uyarlamalar?.map((u, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F1EFE8]">
                    <div className="w-[30px] h-[30px] rounded-full bg-[#1D9E75] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-[14px] font-medium text-[#1C1B19]">{u.sektor}</span>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-3">
                    {/* Hook */}
                    {u.hook && (
                      <div className="bg-[#FFF8ED] border border-[#F2D8A0] rounded-lg px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-[#633806] mb-1">🪝 Hook</p>
                        <p className="text-[13px] text-[#1C1B19]">{u.hook}</p>
                      </div>
                    )}

                    {/* Senaryo — WhatsApp balonu */}
                    {u.senaryo_taslagi && (
                      <div className="relative bg-[#DCF8C6] rounded-tr-xl rounded-b-xl px-4 py-3 text-[13px] text-[#1C1B19] leading-relaxed whitespace-pre-wrap">
                        <div
                          className="absolute w-0 h-0"
                          style={{
                            left: '-8px', top: 0,
                            borderTop: '8px solid #DCF8C6',
                            borderLeft: '8px solid transparent',
                          }}
                        />
                        {u.senaryo_taslagi}
                      </div>
                    )}

                    {/* CTA */}
                    {u.cta && (
                      <div className="flex items-start gap-2 bg-[#F7F6F2] rounded-lg px-3 py-2 text-[12px] text-[#6B6963]">
                        <span className="text-[#1D9E75] shrink-0 mt-px">▶</span>
                        <span><strong className="text-[#1C1B19]">CTA:</strong> {u.cta}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Uygulama ipuçları */}
              {result.uygulama_ipuclari && (
                <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-5 flex items-start gap-3">
                  <span className="text-lg shrink-0">💡</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#085041] mb-1">Uygulama İpuçları</p>
                    <p className="text-[13px] text-[#0F6E56] leading-relaxed">{result.uygulama_ipuclari}</p>
                  </div>
                </div>
              )}

              {/* CTA kutusu */}
              <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-6 text-center">
                <p className="text-[15px] font-medium text-[#085041] mb-1">Bu fikirleri düzenli almak ister misin?</p>
                <p className="text-[13px] text-[#0F6E56] mb-4 leading-relaxed">
                  Viral Video Uyarlayıcı'yı her ay düzenli kullanmak ve sosyal medya içeriklerini<br />
                  rakiplerden önce planlamak ister misin?
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

            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
