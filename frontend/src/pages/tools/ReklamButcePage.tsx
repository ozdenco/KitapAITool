import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformDagilim {
  platform: string
  yuzde: number
  tutar: number
  icerik: string
  gerekce: string
}

interface ReklamResult {
  toplam_butce: number
  dagilim: PlatformDagilim[]
  strateji: string
  uyarilar?: string[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const HEDEFLER = ['Marka Farkındalığı', 'Satış / Dönüşüm', 'Web Sitesi Trafiği', 'Müşteri Adayı (Lead)', 'Uygulama İndirme']
const YAS_ARALIKLARI = ['18–25', '25–35', '35–50', '50+', 'Tüm yaşlar']
const BUTCE_ARALIK = ['1.000–3.000 ₺', '3.000–5.000 ₺', '5.000–10.000 ₺', '10.000–25.000 ₺', '25.000 ₺+']

const PLATFORM_EMOJIS: Record<string, string> = {
  'Google Ads': '🔍',
  'Meta (Facebook & Instagram)': '📱',
  'Instagram': '📸',
  'Facebook': '👍',
  'TikTok': '🎵',
  'LinkedIn': '💼',
  'YouTube': '▶️',
  'Twitter/X': '✖️',
}

function platformEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(PLATFORM_EMOJIS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji
  }
  return '📊'
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; butce: string
  hedef: string; sehir: string; yas: string
}): string {
  return `Sen dijital reklam stratejisti ve medya planlamacısısın. Türkiye piyasasını iyi biliyorsun.

İŞLETME:
- Ad: ${f.isletme}
- Sektör: ${f.sektor}
- Aylık reklam bütçesi: ${f.butce} TL
- Kampanya hedefi: ${f.hedef}
- Şehir / Coğrafi hedef: ${f.sehir || 'Türkiye geneli'}
- Hedef yaş aralığı: ${f.yas || 'belirtilmemiş'}

Bu bilgilere göre aylık reklam bütçesini en verimli şekilde platformlara dağıt.
Türkiye'deki dijital reklam maliyetleri ve kullanıcı davranışlarını dikkate al.
Sektöre özel platform tercihlerini yansıt.

SADECE JSON döndür:
{
  "toplam_butce": <sayı, TL>,
  "dagilim": [
    {
      "platform": "<platform adı>",
      "yuzde": <0-100 arası tam sayı>,
      "tutar": <TL tutarı>,
      "icerik": "<ne tür reklam öneriyorsun, 1 satır>",
      "gerekce": "<neden bu platform, 1 cümle>"
    }
  ],
  "strateji": "<genel strateji özeti, 2-3 cümle>",
  "uyarilar": ["<önemli uyarı veya öneri, 2-3 madde>"],
  "ctaText": "<${f.isletme} için kişisel 1 cümle teşvik>"
}
Toplam yüzde 100 olsun. 3-5 platform öner. Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReklamButcePage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [butce, setButce] = useState('')
  const [hedef, setHedef] = useState('')
  const [sehir, setSehir] = useState('')
  const [yas, setYas] = useState('')
  const [result, setResult] = useState<ReklamResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, butce, hedef, sehir, yas })
      const res = await api.post('/tools/reklam-butce/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as ReklamResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && butce && hedef && !mutation.isPending

  return (
    <ToolShell
      toolId="reklam-butce"
      title="Reklam Bütçe Dağıtıcı"
      icon="💰"
      description="Aylık reklam bütçenizi hangi platforma ne kadar vermeniz gerektiğini yapay zeka ile optimize edin."
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
                  placeholder="Örn: Anadolu Klinik"
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
                  <Select
                    label="Aylık bütçe aralığı *"
                    value={butce}
                    onChange={(e) => setButce(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...BUTCE_ARALIK.map((b) => ({ value: b, label: b }))]}
                  />
                </div>

                <Select
                  label="Kampanya hedefi *"
                  value={hedef}
                  onChange={(e) => setHedef(e.target.value)}
                  options={[{ value: '', label: 'Seçin...' }, ...HEDEFLER.map((h) => ({ value: h, label: h }))]}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Şehir / Bölge hedefi"
                    placeholder="Örn: İstanbul, Anadolu Yakası"
                    value={sehir}
                    onChange={(e) => setSehir(e.target.value)}
                  />
                  <Select
                    label="Hedef yaş aralığı"
                    value={yas}
                    onChange={(e) => setYas(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...YAS_ARALIKLARI.map((y) => ({ value: y, label: y }))]}
                  />
                </div>

                <FormPersistButtons
                  filename="reklam-butce-formu.json"
                  getData={() => ({ isletme, sektor, butce, hedef, sehir, yas })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.butce === 'string') setButce(d.butce)
                    if (typeof d.hedef === 'string') setHedef(d.hedef)
                    if (typeof d.sehir === 'string') setSehir(d.sehir)
                    if (typeof d.yas === 'string') setYas(d.yas)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  💰 Bütçeyi Dağıt
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Analiz ediliyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Platform dağılımı */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Platform Dağılımı</h3>
                <div className="flex flex-col gap-3">
                  {result.dagilim.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800 flex items-center gap-1.5">
                          {platformEmoji(item.platform)} {item.platform}
                        </span>
                        <span className="font-bold text-[#1D9E75]">
                          {item.tutar.toLocaleString('tr-TR')} ₺ ({item.yuzde}%)
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-[#1D9E75] rounded-full transition-all"
                          style={{ width: `${item.yuzde}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{item.icerik} · {item.gerekce}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strateji */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Genel Strateji</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{result.strateji}</p>
              </div>

              {/* Uyarılar */}
              {result.uyarilar && result.uyarilar.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3">⚠️ Önemli Notlar</h3>
                  <ul className="flex flex-col gap-2">
                    {result.uyarilar.map((u, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-700">
                        <span className="shrink-0">•</span>{u}
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
                Yeni bütçe planı oluştur
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
