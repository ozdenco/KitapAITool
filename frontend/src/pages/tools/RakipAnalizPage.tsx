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

interface RakipKart {
  ad: string
  guclu: string[]
  zayif: string[]
  firsat: string
}

interface RakipResult {
  rakipler: RakipKart[]
  genel_degerlendirme: string
  oneriler: string[]
  ctaText?: string
}

interface RakipBlok {
  ad: string
  web: string
  fiyat: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const PLATFORMLAR = [
  { value: 'Google Business', label: '🔍 Google Business' },
  { value: 'Instagram', label: '📸 Instagram' },
  { value: 'Facebook', label: '👍 Facebook' },
  { value: 'LinkedIn', label: '💼 LinkedIn' },
  { value: 'WhatsApp İş', label: '💬 WhatsApp İş' },
]

const FIYAT_SEGMENTLERI = [
  { value: 'Ekonomik', label: 'Ekonomik' },
  { value: 'Orta', label: 'Orta' },
  { value: 'Premium', label: 'Premium' },
]

const emptyRakip = (): RakipBlok => ({ ad: '', web: '', fiyat: '' })

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  biz: string; sector: string; web: string; platforms: string[]
  strengths: string; myPrice: string
  rakip1: RakipBlok; rakip2: RakipBlok; rakip3: RakipBlok
}): string {
  const rakiplerStr = [f.rakip1, f.rakip2, f.rakip3]
    .filter((r) => r.ad.trim())
    .map((r, i) => `Rakip ${i + 1}: ${r.ad}${r.web ? ` (${r.web})` : ''}${r.fiyat ? `, fiyat: ${r.fiyat}` : ''}`)
    .join('\n') || 'sektördeki tipik rakipler'

  return `Sen rekabet analizi uzmanısın. Aşağıdaki işletme için kapsamlı rakip analizi yap.

KENDİ İŞLETMEM:
- Ad: ${f.biz}
- Sektör: ${f.sector}
- Web sitesi: ${f.web || 'yok'}
- Aktif platformlar: ${f.platforms.length ? f.platforms.join(', ') : 'belirtilmemiş'}
- Güçlü yönlerim: ${f.strengths || 'belirtilmemiş'}
- Fiyat segmentim: ${f.myPrice || 'belirtilmemiş'}

RAKİPLER:
${rakiplerStr}

Her rakip için dijital varlık, hizmet kalitesi ve pazar konumlanması açısından analiz yap.
${f.biz}'nin rakiplere göre fırsat alanlarını belirle.

SADECE JSON döndür:
{
  "rakipler": [
    {
      "ad": "<rakip adı>",
      "guclu": ["<3-4 kısa güçlü yön>"],
      "zayif": ["<2-3 kısa zayıf yön>"],
      "firsat": "<${f.biz} bu rakibe karşı nasıl avantaj kazanır, 1 cümle>"
    }
  ],
  "genel_degerlendirme": "<pazar genel değerlendirmesi, 2-3 cümle>",
  "oneriler": ["<${f.biz} için 4-5 somut strateji önerisi>"],
  "ctaText": "<${f.biz} için motivasyon cümlesi>"
}
Türkçe, somut ve uygulanabilir öneriler sun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RakipAnalizPage() {
  const queryClient = useQueryClient()
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [web, setWeb] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [strengths, setStrengths] = useState('')
  const [myPrice, setMyPrice] = useState('')
  const [rakip1, setRakip1] = useState<RakipBlok>(emptyRakip())
  const [rakip2, setRakip2] = useState<RakipBlok>(emptyRakip())
  const [rakip3, setRakip3] = useState<RakipBlok>(emptyRakip())
  const [result, setResult] = useState<RakipResult | null>(null)

  const togglePlatform = (v: string) =>
    setPlatforms((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, web, platforms, strengths, myPrice, rakip1, rakip2, rakip3 })
      // Rakip listesini ayrı dizi olarak gönder — n8n Gemini sosyal medya araştırması için gerekli
      const competitors = [rakip1, rakip2, rakip3]
        .filter((r) => r.ad.trim())
        .map((r) => ({ name: r.ad, ...(r.web ? { web: r.web } : {}) }))
      const res = await api.post('/tools/rakip-analiz/run', { prompt, competitors })
      const content = res.data?.content?.[0]?.text ?? res.data
      return parseAiJson<RakipResult>(content)
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = biz.trim() && sector && rakip1.ad.trim() && !mutation.isPending

  return (
    <ToolShell
      toolId="rakip-analiz"
      title="Rakip Analiz Panosu"
      icon="🔍"
      description="Kendi işletmenizi ve rakiplerinizi girin; karşılaştırmalı analiz, güçlü/zayıf yönler ve aksiyon önerileri alın."
      hasResult={!!result}
      formHasInput={!!biz.trim()}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                  {header}

                {/* ── Kendi işletme bölümü ── */}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kendi İşletmeniz</p>

                <Input
                  label="İşletme adı *"
                  placeholder="Örn: Kartal Hukuk Bürosu"
                  value={biz}
                  onChange={(e) => setBiz(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Sektör *"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                  />
                  <Input
                    label="Web sitesi (opsiyonel)"
                    placeholder="Örn: kartalhukuk.com"
                    value={web}
                    onChange={(e) => setWeb(e.target.value)}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">Aktif platformlarınız</p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMLAR.map((p) => (
                      <label
                        key={p.value}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border-[0.5px] rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          platforms.includes(p.value)
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-auto"
                          checked={platforms.includes(p.value)}
                          onChange={() => togglePlatform(p.value)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Textarea
                    label="Güçlü yönleriniz"
                    placeholder="Örn: 10 yıllık deneyim, geniş müşteri portföyü, uzman ekip"
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    rows={2}
                  />
                  <Select
                    label="Fiyat segmentiniz"
                    value={myPrice}
                    onChange={(e) => setMyPrice(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...FIYAT_SEGMENTLERI.map((f) => ({ value: f.value, label: f.label }))]}
                  />
                </div>

                <div className="flex items-start gap-2 bg-[#F0FAF5] border border-[#A8DFC6] rounded-xl px-4 py-3 text-xs text-[#1C6B4A]">
                  <span className="shrink-0 text-base">✨</span>
                  <span>Rakiplerin sosyal medya platformları yapay zeka tarafından otomatik araştırılacak — manuel seçim gerekmez.</span>
                </div>

                {/* ── Rakip 1 ── */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Rakip 1 <span className="text-red-500">(zorunlu)</span>
                  </p>
                  <div className="border border-[#F1EFE8] rounded-xl p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Rakip adı *" placeholder="Örn: Aslan Hukuk" value={rakip1.ad} onChange={(e) => setRakip1({ ...rakip1, ad: e.target.value })} />
                      <Input label="Web sitesi (opsiyonel)" placeholder="aslanhukuk.com" value={rakip1.web} onChange={(e) => setRakip1({ ...rakip1, web: e.target.value })} />
                    </div>
                    <Select
                      label="Tahmini fiyat segmenti"
                      value={rakip1.fiyat}
                      onChange={(e) => setRakip1({ ...rakip1, fiyat: e.target.value })}
                      options={[{ value: '', label: 'Seçin...' }, ...FIYAT_SEGMENTLERI.map((f) => ({ value: f.value, label: f.label }))]}
                    />
                  </div>
                </div>

                {/* ── Rakip 2 ── */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rakip 2 (opsiyonel)</p>
                  <div className="border border-[#F1EFE8] rounded-xl p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Rakip adı" placeholder="Örn: Demir Danışmanlık" value={rakip2.ad} onChange={(e) => setRakip2({ ...rakip2, ad: e.target.value })} />
                      <Input label="Web sitesi (opsiyonel)" placeholder="demirdanismanlik.com" value={rakip2.web} onChange={(e) => setRakip2({ ...rakip2, web: e.target.value })} />
                    </div>
                    <Select
                      label="Tahmini fiyat segmenti"
                      value={rakip2.fiyat}
                      onChange={(e) => setRakip2({ ...rakip2, fiyat: e.target.value })}
                      options={[{ value: '', label: 'Seçin...' }, ...FIYAT_SEGMENTLERI.map((f) => ({ value: f.value, label: f.label }))]}
                    />
                  </div>
                </div>

                {/* ── Rakip 3 ── */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rakip 3 (opsiyonel)</p>
                  <div className="border border-[#F1EFE8] rounded-xl p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Rakip adı" placeholder="Örn: Yıldız Büro" value={rakip3.ad} onChange={(e) => setRakip3({ ...rakip3, ad: e.target.value })} />
                      <Input label="Web sitesi (opsiyonel)" placeholder="yildizburo.com" value={rakip3.web} onChange={(e) => setRakip3({ ...rakip3, web: e.target.value })} />
                    </div>
                    <Select
                      label="Tahmini fiyat segmenti"
                      value={rakip3.fiyat}
                      onChange={(e) => setRakip3({ ...rakip3, fiyat: e.target.value })}
                      options={[{ value: '', label: 'Seçin...' }, ...FIYAT_SEGMENTLERI.map((f) => ({ value: f.value, label: f.label }))]}
                    />
                  </div>
                </div>

                <FormPersistButtons
                  filename="rakip-analiz-formu.json"
                  getData={() => ({ biz, sector, web, platforms, strengths, myPrice, rakip1, rakip2, rakip3 })}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.web === 'string') setWeb(d.web)
                    if (Array.isArray(d.platforms)) setPlatforms(d.platforms as string[])
                    if (typeof d.strengths === 'string') setStrengths(d.strengths)
                    if (typeof d.myPrice === 'string') setMyPrice(d.myPrice)
                    if (d.rakip1 && typeof d.rakip1 === 'object') setRakip1(d.rakip1 as RakipBlok)
                    if (d.rakip2 && typeof d.rakip2 === 'object') setRakip2(d.rakip2 as RakipBlok)
                    if (d.rakip3 && typeof d.rakip3 === 'object') setRakip3(d.rakip3 as RakipBlok)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🔍 Rakip Analizi Başlat
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Rakip analizi yapılıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.rakipler.map((rakip, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#F1EFE8] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900">{rakip.ad}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Güçlü Yönler</p>
                      <ul className="flex flex-col gap-1.5">
                        {rakip.guclu.map((g, j) => (
                          <li key={j} className="flex gap-2 text-sm text-[#1C1B19]">
                            <span className="text-green-500 shrink-0">✓</span> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Zayıf Yönler</p>
                      <ul className="flex flex-col gap-1.5">
                        {rakip.zayif.map((z, j) => (
                          <li key={j} className="flex gap-2 text-sm text-[#1C1B19]">
                            <span className="text-red-400 shrink-0">✗</span> {z}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-[#F1EFE8] bg-[#1D9E75]/5">
                    <p className="text-sm text-[#1D9E75]">🎯 {rakip.firsat}</p>
                  </div>
                </div>
              ))}

              <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">📊 Genel Değerlendirme</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{result.genel_degerlendirme}</p>
              </div>

              {result.oneriler.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">💡 Strateji Önerileri</h3>
                  <ul className="flex flex-col gap-2">
                    {result.oneriler.map((o, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-[#1D9E75] shrink-0 font-bold">{i + 1}.</span> {o}
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
