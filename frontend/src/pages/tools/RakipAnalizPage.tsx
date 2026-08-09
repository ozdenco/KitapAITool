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

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; sehir: string
  rakipler: string; guclu: string; zayif: string
}): string {
  return `Sen rekabet analizi ve pazar araştırması uzmanısın. Aşağıdaki işletme için kapsamlı rakip analizi yap.

KENDİ İŞLETMEM:
- Ad: ${f.isletme}
- Sektör: ${f.sektor}
- Şehir: ${f.sehir || 'Türkiye geneli'}
- Güçlü yönlerim: ${f.guclu || 'belirtilmemiş'}
- Zayıf yönlerim: ${f.zayif || 'belirtilmemiş'}

RAKİPLERİM: ${f.rakipler || 'sektördeki tipik rakipler'}

Her rakip için dijital varlık, hizmet kalitesi ve pazar konumlanması açısından analiz yap.
${f.isletme}'nin rakiplere göre fırsat alanlarını belirle.

SADECE JSON döndür:
{
  "rakipler": [
    {
      "ad": "<rakip adı>",
      "guclu": ["<3-4 kısa güçlü yön>"],
      "zayif": ["<2-3 kısa zayıf yön>"],
      "firsat": "<${f.isletme} bu rakibe karşı nasıl avantaj kazanır, 1 cümle>"
    }
  ],
  "genel_degerlendirme": "<pazar genel değerlendirmesi, 2-3 cümle>",
  "oneriler": ["<${f.isletme} için 4-5 somut strateji önerisi>"],
  "ctaText": "<${f.isletme} için motivasyon cümlesi>"
}
Türkçe, somut ve uygulanabilir öneriler sun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RakipAnalizPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [sehir, setSehir] = useState('')
  const [rakipler, setRakipler] = useState('')
  const [guclu, setGuclu] = useState('')
  const [zayif, setZayif] = useState('')
  const [result, setResult] = useState<RakipResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, sehir, rakipler, guclu, zayif })
      const res = await api.post('/tools/rakip-analiz/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as RakipResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && !mutation.isPending

  return (
    <ToolShell
      toolId="rakip-analiz"
      title="Rakip Analiz Panosu"
      icon="🔍"
      description="Rakiplerinizin güçlü ve zayıf yönlerini analiz edin, kendi konumunuzu belirleyin ve fırsatları keşfedin."
      hasResult={!!result}
      formHasInput={!!isletme.trim()}
    >
      {({ isFormOpen }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-5">
                <Input
                  label="İşletme adınız *"
                  placeholder="Örn: Şahin Yapı İnşaat"
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
                    label="Şehir / Bölge"
                    placeholder="Örn: Ankara"
                    value={sehir}
                    onChange={(e) => setSehir(e.target.value)}
                  />
                </div>

                <Textarea
                  label="Rakiplerinizin adları"
                  placeholder="Örn: ABC İnşaat, XYZ Yapı, Mega Konut — her birini virgülle ayırın. Bilmiyorsanız boş bırakın, yapay zeka sektör rakiplerini analiz eder."
                  value={rakipler}
                  onChange={(e) => setRakipler(e.target.value)}
                  rows={2}
                />

                <Textarea
                  label="Kendi güçlü yönleriniz"
                  placeholder="Örn: 15 yıllık deneyim, ISO belgesi, güçlü müşteri referansları, rekabetçi fiyat"
                  value={guclu}
                  onChange={(e) => setGuclu(e.target.value)}
                  rows={2}
                />

                <Textarea
                  label="Kendi zayıf yönleriniz (isteğe bağlı)"
                  placeholder="Örn: Sosyal medya varlığı zayıf, web sitesi yok, küçük ekip"
                  value={zayif}
                  onChange={(e) => setZayif(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="rakip-analiz-formu.json"
                  getData={() => ({ isletme, sektor, sehir, rakipler, guclu, zayif })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.sehir === 'string') setSehir(d.sehir)
                    if (typeof d.rakipler === 'string') setRakipler(d.rakipler)
                    if (typeof d.guclu === 'string') setGuclu(d.guclu)
                    if (typeof d.zayif === 'string') setZayif(d.zayif)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🔍 Rakipleri Analiz Et
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Rakip analizi yapılıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Rakip kartları */}
              {result.rakipler.map((rakip, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
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
                          <li key={j} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-green-500 shrink-0">✓</span> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Zayıf Yönler</p>
                      <ul className="flex flex-col gap-1.5">
                        {rakip.zayif.map((z, j) => (
                          <li key={j} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-red-400 shrink-0">✗</span> {z}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 bg-[#1D9E75]/5">
                    <p className="text-sm text-[#1D9E75]">🎯 {rakip.firsat}</p>
                  </div>
                </div>
              ))}

              {/* Genel değerlendirme */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 Genel Değerlendirme</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{result.genel_degerlendirme}</p>
              </div>

              {/* Öneriler */}
              {result.oneriler.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 Strateji Önerileri</h3>
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
