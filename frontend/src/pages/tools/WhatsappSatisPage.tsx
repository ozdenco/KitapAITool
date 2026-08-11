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
  label: string
  message: string
  timing: string
}

interface WhatsappResult {
  scripts: ScriptAdim[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const ITIRAZLAR = [
  { value: 'Fiyatı pahalı', label: 'Fiyatı pahalı' },
  { value: 'Düşüneyim / bekleyeyim', label: 'Düşüneyim' },
  { value: 'Başka biriyle çalışıyorum', label: 'Başkası var' },
  { value: 'Şu an ihtiyacım yok', label: 'İhtiyacım yok' },
  { value: 'Riski bilmiyorum / güvenmiyorum', label: 'Güvenmiyorum' },
  { value: 'Bütçem yok', label: 'Bütçem yok' },
]

const SCRIPT_LABELS = [
  { label: '1 · İlk Temas', tip: 'Potansiyel müşteri formu doldurunca veya sizi bulunca gönderin' },
  { label: '2 · Takip', tip: 'İlk mesajdan 24-48 saat cevap gelmezse gönderin' },
  { label: '3 · İtiraz Kırma', tip: 'Müşteri tereddüt ettiğinde veya itiraz gösterdiğinde kullanın' },
  { label: '4 · Teklif', tip: 'Müşteri ilgilendiğini gösterdiğinde somut teklif yapın' },
  { label: '5 · Kapanış', tip: 'Teklif sonrası karar beklerken gönderin' },
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  biz: string; sector: string; service: string
  price: string; target: string; itirazlar: string[]; advantage: string
}): string {
  return `Sen WhatsApp satış uzmanısın. KOBİ'ler için etkili, doğal ve dönüşüm odaklı WhatsApp mesajları yazıyorsun.

İşletme adı: ${f.biz}
Sektör: ${f.sector}
Hizmet/Ürün: ${f.service}
Fiyat aralığı: ${f.price || 'belirtilmemiş'}
Hedef müşteri: ${f.target || 'KOBİ sahipleri'}
Sık karşılaşılan itirazlar: ${f.itirazlar.length ? f.itirazlar.join(', ') : 'genel itirazlar'}
Özel avantajlar/notlar: ${f.advantage || 'belirtilmemiş'}

Kurallar:
1. İşletme adını (${f.biz}) ilk mesajda mutlaka geçir.
2. Her mesaj kısa, net ve WhatsApp'a uygun olsun (max 3 paragraf).
3. Fiyat aralığı (${f.price || 'belirtilmemiş'}) belirtilmişse, teklif ve kapanış mesajlarında bu fiyatı doğrudan zikret.
4. Hedef müşteri (${f.target || 'KOBİ sahipleri'}) profiline uygun dil ve ton kullan.
5. İtiraz kırma mesajında seçilen itirazlardan birini ("${f.itirazlar[0] || 'genel itiraz'}") içerik olarak karşıla.
6. Özel avantajlar belirtilmişse ("${f.advantage || '—'}"), bunları teklif ve kapanış mesajlarında somut argüman olarak kullan.

SADECE JSON döndür:
{
  "scripts": [
    { "label": "1 · İlk Temas", "message": "<mesaj metni, emoji kullanabilirsin>", "timing": "<ne zaman gönderin>" },
    { "label": "2 · Takip",     "message": "<mesaj metni>", "timing": "<ne zaman>" },
    { "label": "3 · İtiraz Kırma", "message": "<mesaj metni>", "timing": "<ne zaman>" },
    { "label": "4 · Teklif",    "message": "<mesaj metni>", "timing": "<ne zaman>" },
    { "label": "5 · Kapanış",   "message": "<mesaj metni>", "timing": "<ne zaman>" }
  ],
  "ctaText": "<${f.biz} için motivasyon cümlesi>"
}
Türkçe olsun. Samimi ama profesyonel bir ton kullan.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsappSatisPage() {
  const queryClient = useQueryClient()
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [service, setService] = useState('')
  const [price, setPrice] = useState('')
  const [target, setTarget] = useState('')
  const [itirazlar, setItirazlar] = useState<string[]>([])
  const [advantage, setAdvantage] = useState('')
  const [result, setResult] = useState<WhatsappResult | null>(null)

  const toggleItiraz = (v: string) =>
    setItirazlar((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, service, price, target, itirazlar, advantage })
      const res = await api.post('/tools/whatsapp-satis/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as WhatsappResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = biz.trim() && sector && service.trim() && !mutation.isPending

  return (
    <ToolShell
      toolId="whatsapp-satis"
      title="WhatsApp Satış Script Üretici"
      icon="💬"
      description="Ürün/hizmetiniz ve en sık karşılaştığınız itirazları girin — ilk temastan kapanışa kadar 5 hazır WhatsApp mesajı oluşturalım."
      hasResult={!!result}
      formHasInput={!!biz.trim()}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                  {header}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="İşletme / hizmet adı *"
                    placeholder="Örn: Yıldız Muhasebe"
                    value={biz}
                    onChange={(e) => setBiz(e.target.value)}
                  />
                  <Select
                    label="Sektör *"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                  />
                </div>

                <Textarea
                  label="Sunduğunuz hizmet / ürün *"
                  placeholder="Örn: KOBİ'lere aylık muhasebe, vergi beyannamesi ve e-fatura hizmetleri. Paketler 3.000₺'den başlıyor, 3 gün içinde kurulum yapılıyor."
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  rows={3}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Fiyat aralığı"
                    placeholder="Örn: 3.000₺ – 8.000₺/ay"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <Input
                    label="Hedef müşteri"
                    placeholder="Örn: 5-20 kişilik KOBİ sahipleri"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-3">En sık karşılaştığınız itirazlar</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ITIRAZLAR.map((it) => (
                      <label
                        key={it.value}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          itirazlar.includes(it.value)
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-auto"
                          checked={itirazlar.includes(it.value)}
                          onChange={() => toggleItiraz(it.value)}
                        />
                        {it.label}
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="Özel not / avantaj (opsiyonel)"
                  placeholder="Örn: İlk ay ücretsiz deneme, 7/24 WhatsApp destek, sertifikalı mali müşavir ekibi"
                  value={advantage}
                  onChange={(e) => setAdvantage(e.target.value)}
                />

                <FormPersistButtons
                  filename="whatsapp-satis-formu.json"
                  getData={() => ({ biz, sector, service, price, target, itirazlar, advantage })}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.service === 'string') setService(d.service)
                    if (typeof d.price === 'string') setPrice(d.price)
                    if (typeof d.target === 'string') setTarget(d.target)
                    if (Array.isArray(d.itirazlar)) setItirazlar(d.itirazlar as string[])
                    if (typeof d.advantage === 'string') setAdvantage(d.advantage)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  💬 Scriptleri Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">WhatsApp scriptleri hazırlanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.scripts.map((script, i) => {
                const meta = SCRIPT_LABELS[i] ?? { label: script.label, tip: '' }
                return (
                  <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#F1EFE8] bg-[#1D9E75]/5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#085041] bg-[#1D9E75]/15 px-2.5 py-1 rounded-full">
                        💬 {meta.label}
                      </span>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{script.message}</p>
                    </div>
                    {(script.timing || meta.tip) && (
                      <div className="px-5 py-3 border-t border-[#F1EFE8] bg-gray-50">
                        <p className="text-xs text-gray-500">⏰ {script.timing || meta.tip}</p>
                      </div>
                    )}
                  </div>
                )
              })}

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
