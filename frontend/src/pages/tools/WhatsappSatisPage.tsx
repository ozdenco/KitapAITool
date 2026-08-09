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

interface WaScript {
  amac: string
  ton: string
  mesaj: string
  zamanlama?: string
  not?: string
}

interface WaResult {
  scripts: WaScript[]
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

const AMACLAR = ['Satış', 'Randevu', 'Bilgi / Tanıtım', 'Kampanya / İndirim', 'Takip / Hatırlatma']
const TONLAR = ['Samimi / Sıcak', 'Profesyonel', 'Acil / Fırsatçı', 'Arkadaşça / Esprili']

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; hizmet: string
  hedef: string; amaclar: string[]; tonlar: string[]
}): string {
  return `Sen WhatsApp pazarlama ve satış uzmanısın. Aşağıdaki işletme için hazır WhatsApp mesaj scriptleri oluştur.

İşletme: ${f.isletme}
Sektör: ${f.sektor}
Hizmet/Ürün: ${f.hizmet}
Hedef Kitle: ${f.hedef || 'belirtilmemiş'}
Mesaj Amacı: ${f.amaclar.join(', ') || 'Genel'}
Ton: ${f.tonlar.join(', ') || 'Profesyonel'}

Her seçilen amaç için 1 ayrı WhatsApp mesajı oluştur. Mesajlar:
- 150-250 karakter arası olsun
- Emoji kullan (ama abartma)
- Türkçe konuşma diline uygun olsun
- Net bir CTA (harekete geçirme) içersin

SADECE JSON döndür:
{
  "scripts": [
    {
      "amac": "<amaç>",
      "ton": "<kullanılan ton>",
      "mesaj": "<WhatsApp mesajı, emoji dahil>",
      "zamanlama": "<ne zaman göndermeli, örn: Pazartesi sabahı>",
      "not": "<kullanım ipucu, 1 cümle>"
    }
  ],
  "ipuclari": ["<3-4 WhatsApp pazarlama ipucu>"],
  "ctaText": "<${f.isletme} için 1 cümle motivasyon>"
}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsappSatisPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [hizmet, setHizmet] = useState('')
  const [hedef, setHedef] = useState('')
  const [amaclar, setAmaclar] = useState<string[]>([])
  const [tonlar, setTonlar] = useState<string[]>([])
  const [result, setResult] = useState<WaResult | null>(null)

  const toggle = (list: string[], setList: (v: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, hizmet, hedef, amaclar, tonlar })
      const res = await api.post('/tools/whatsapp-satis/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as WaResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && hizmet.trim() && !mutation.isPending

  return (
    <ToolShell
      toolId="whatsapp-satis"
      title="WhatsApp Satış Script Üretici"
      icon="💬"
      description="Müşterilerinize göndermek için hazır WhatsApp satış mesajları üretin. Farklı amaç ve tonlarda kişiselleştirilmiş scriptler."
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
                  placeholder="Örn: Yıldız Güzellik Salonu"
                  value={isletme}
                  onChange={(e) => setIsletme(e.target.value)}
                />

                <Select
                  label="Sektör *"
                  value={sektor}
                  onChange={(e) => setSektor(e.target.value)}
                  options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                />

                <Textarea
                  label="Hizmet / Ürün *"
                  placeholder="Örn: Saç boyama, manikür, kalıcı makyaj hizmetleri sunuyoruz."
                  value={hizmet}
                  onChange={(e) => setHizmet(e.target.value)}
                />

                <Input
                  label="Hedef müşteri kitlesi"
                  placeholder="Örn: 25-45 yaş arası kadınlar, çalışan anneler"
                  value={hedef}
                  onChange={(e) => setHedef(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Mesaj amacı (birden fazla seçebilirsiniz)</p>
                  <div className="flex flex-wrap gap-2">
                    {AMACLAR.map((a) => (
                      <button key={a} type="button" onClick={() => toggle(amaclar, setAmaclar, a)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          amaclar.includes(a) ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {amaclar.includes(a) ? '✓ ' : ''}{a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Mesaj tonu</p>
                  <div className="flex flex-wrap gap-2">
                    {TONLAR.map((t) => (
                      <button key={t} type="button" onClick={() => toggle(tonlar, setTonlar, t)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          tonlar.includes(t) ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {tonlar.includes(t) ? '✓ ' : ''}{t}
                      </button>
                    ))}
                  </div>
                </div>

                <FormPersistButtons
                  filename="whatsapp-satis-formu.json"
                  getData={() => ({ isletme, sektor, hizmet, hedef, amaclar, tonlar })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.hizmet === 'string') setHizmet(d.hizmet)
                    if (typeof d.hedef === 'string') setHedef(d.hedef)
                    if (Array.isArray(d.amaclar)) setAmaclar(d.amaclar as string[])
                    if (Array.isArray(d.tonlar)) setTonlar(d.tonlar as string[])
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  💬 Scriptleri Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Yapay zeka yazıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.scripts.map((script, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-lg">💬</span>
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{script.amac}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{script.ton}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="bg-[#DCF8C6] rounded-xl px-4 py-3 mb-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap border border-green-200">
                      {script.mesaj}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {script.zamanlama && <span>⏰ {script.zamanlama}</span>}
                      {script.not && <span>💡 {script.not}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {result.ipuclari && result.ipuclari.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 WhatsApp Pazarlama İpuçları</h3>
                  <ul className="flex flex-col gap-2">
                    {result.ipuclari.map((ip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-[#1D9E75] shrink-0">✓</span>{ip}
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
                Yeni script oluştur
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
