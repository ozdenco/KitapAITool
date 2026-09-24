import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { parseAiJson, extractAiContent } from '@/lib/parseAiJson'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'
import { ItirazSecici } from '@/components/ui/ItirazSecici'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { useProfilOnDolgu } from '@/hooks/useIsletmeProfili'
import { markaKurallari } from '@/lib/markaKurallari'
import { SEKTORLER } from '@/lib/sektorler'
import { AramaliSecici } from '@/components/ui/AramaliSecici'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScriptAdim {
  label: string
  message: string
  timing: string
}

/** Seçilen her itiraz için üretilen ikna metni. */
interface ItirazYaniti {
  itiraz: string
  yanit: string
  ipucu?: string
}

interface WhatsappResult {
  scripts: ScriptAdim[]
  itirazYanitlari?: ItirazYaniti[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  // Seçilen itirazları JSON şablonuna tek tek yazıyoruz. Modele "her itiraz
  // için bir yanıt üret" demek yetmiyordu; birkaçını birleştirip atlıyordu.
  // Şablonu önceden doldurunca dizi uzunluğu ve itiraz metinleri sabitleniyor.
  const secilen = f.itirazlar.length ? f.itirazlar : ['Fiyatı pahalı', 'Düşüneyim / bekleyeyim']
  const itirazSayisi = secilen.length
  const itirazSablonu = secilen
    .map((it) => {
      const guvenli = it.replace(/"/g, "'")
      return `    { "itiraz": "${guvenli}", "yanit": "<'${guvenli}' itirazına karşı gönderilecek WhatsApp mesajı>", "ipucu": "<bu mesajı ne zaman/nasıl kullanmalı, tek cümle>" }`
    })
    .join(',\n')

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
7. ÇOK ÖNEMLİ: Yukarıda listelenen itirazların HER BİRİ için ayrı bir ikna metni yaz. ${itirazSayisi} itiraz seçildi, bu yüzden "itirazYanitlari" dizisi TAM ${itirazSayisi} eleman içermeli — hiçbirini atlama, birleştirme veya kendin yeni itiraz uydurma. Her "itiraz" alanı, listedeki metnin AYNISI olmalı.
8. Her ikna metni doğrudan müşteriye WhatsApp'tan gönderilebilecek şekilde yazılsın (2-4 cümle), itirazı kabul edip ardından somut bir argümanla çevirsin. Genel geçer laf değil, ${f.sector} sektörüne ve "${f.service}" hizmetine özgü olsun.

SADECE JSON döndür:
{
  "scripts": [
    { "label": "1 · İlk Temas", "message": "<mesaj metni, emoji kullanabilirsin>", "timing": "<ne zaman gönderin>" },
    { "label": "2 · Takip",     "message": "<mesaj metni>", "timing": "<ne zaman>" },
    { "label": "3 · İtiraz Kırma", "message": "<mesaj metni>", "timing": "<ne zaman>" },
    { "label": "4 · Teklif",    "message": "<mesaj metni>", "timing": "<ne zaman>" },
    { "label": "5 · Kapanış",   "message": "<mesaj metni>", "timing": "<ne zaman>" }
  ],
  "itirazYanitlari": [
${itirazSablonu}
  ],
  "ctaText": "<${f.biz} için motivasyon cümlesi>"
}
Türkçe olsun. Samimi ama profesyonel bir ton kullan.
${markaKurallari()}`
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

  // İşletme profilinden ön dolgu — boş alanlar doldurulur, kullanıcının
  // yazdığına dokunulmaz (bkz. useProfilOnDolgu).
  useProfilOnDolgu({
    businessName: [biz, setBiz],
    sector: [sector, setSector],
    productService: [service, setService],
    priceSegment: [price, setPrice],
    targetAudience: [target, setTarget],
    strengths: [advantage, setAdvantage],
  })
  const [result, setResult] = useState<WhatsappResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, service, price, target, itirazlar, advantage })
      const res = await api.post('/tools/whatsapp-satis/run', { prompt, isletmeAdi: biz })
      const content = extractAiContent(res.data)
      return parseAiJson<WhatsappResult>(content)
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  // Bekleme sirasinda gecen sureyi gosterir (sabit mesaj donmus hissi veriyordu)
  const elapsedSec = useElapsedSeconds(mutation.isPending)

  const canSubmit = biz.trim() && sector && service.trim() && !mutation.isPending

  return (
    <ToolShell
      toolId="whatsapp-satis"
      title="WhatsApp Satış Script Üretici"
      icon="💬"
      description="Ürün/hizmetiniz ve en sık karşılaştığınız itirazları girin — ilk temastan kapanışa kadar 5 hazır WhatsApp mesajı oluşturalım."
      hasResult={!!result}
      formHasInput={!!biz.trim()}
      isPending={mutation.isPending}
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
                  <AramaliSecici
                    label="Sektör *"
                    value={sector}
                    onChange={setSector}
                    secenekler={SEKTORLER}
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

                <ItirazSecici secilenler={itirazlar} onChange={setItirazlar} />

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
                  <p className="text-center text-sm text-gray-400 animate-pulse">WhatsApp scriptleri hazırlanıyor — {elapsedSec} sn geçti</p>
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

              {!!result.itirazYanitlari?.length && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#F1EFE8] bg-[#1D9E75]/5">
                    <span className="text-xs font-semibold text-[#085041] bg-[#1D9E75]/15 px-2.5 py-1 rounded-full">
                      🛡️ İtiraz Kırma Cevapları ({result.itirazYanitlari.length})
                    </span>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    {result.itirazYanitlari.map((iy, i) => (
                      <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-[#F7F6F2] border-b border-[#F1EFE8]">
                          <p className="text-[13px] font-semibold text-[#1C1B19]">
                            <span className="text-[#B33A3A]">“</span>{iy.itiraz}<span className="text-[#B33A3A]">”</span>
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{iy.yanit}</p>
                        </div>
                        {iy.ipucu && (
                          <div className="px-4 py-2.5 border-t border-[#F1EFE8] bg-gray-50">
                            <p className="text-xs text-gray-500">💡 {iy.ipucu}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
