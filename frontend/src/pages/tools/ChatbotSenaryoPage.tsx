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

interface OzelMesaj {
  tip: string
  metin: string
}

interface SssKart {
  soru: string
  cevap: string
}

interface ChatbotResult {
  ozel_mesajlar: OzelMesaj[]
  sss_kartlari: SssKart[]
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

const YONLENDIRME_HEDEFLERI = [
  { value: 'Randevu Al', label: 'Randevu Al' },
  { value: 'Fiyat Teklifi', label: 'Fiyat Teklifi' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Telefon', label: 'Telefon' },
  { value: 'Web Sitesi', label: 'Web Sitesi' },
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  biz: string; sector: string; services: string; hours: string
  faqs: string[]; redirectGoal: string; redirectLink: string
}): string {
  const faqList = f.faqs.filter(Boolean).map((q, i) => `${i + 1}. ${q}`).join('\n')

  return `Sen chatbot tasarımı uzmanısın. Müşteri iletişimi için hazır chatbot metinleri ve SSS yanıtları oluşturuyorsun.

İşletme: ${f.biz}
Sektör: ${f.sector}
Sunulan hizmetler: ${f.services}
Mesai saatleri: ${f.hours || 'belirtilmemiş'}
Yönlendirme hedefi: ${f.redirectGoal}
Yönlendirme linki/numarası: ${f.redirectLink || 'belirtilmemiş'}

Sıkça sorulan sorular:
${faqList || 'sektöre göre tipik SSS'}

${f.biz} için hazır chatbot mesajları ve SSS kartları oluştur.

SADECE JSON döndür:
{
  "ozel_mesajlar": [
    { "tip": "Karşılama Mesajı", "metin": "<merhaba mesajı, emoji kullanabilirsin>" },
    { "tip": "Mesai Dışı Mesaj", "metin": "<şu an hizmet veremiyoruz mesajı>" },
    { "tip": "${f.redirectGoal} Yönlendirmesi", "metin": "<${f.redirectGoal} için yönlendirme mesajı>" }
  ],
  "sss_kartlari": [
    { "soru": "<müşterinin sorduğu soru>", "cevap": "<bot cevabı, kısa ve net>" }
  ],
  "ipuclari": ["<chatbot kurulum ve kullanım için 3-4 pratik ipucu>"],
  "ctaText": "<${f.biz} için teşvik cümlesi>"
}
SSS'de sorulan soruların tamamını yanıtla. Türkçe, samimi ve net olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatbotSenaryoPage() {
  const queryClient = useQueryClient()
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [services, setServices] = useState('')
  const [hours, setHours] = useState('')
  const [faqs, setFaqs] = useState<string[]>(['', '', '', '', ''])
  const [redirectGoal, setRedirectGoal] = useState('')
  const [redirectLink, setRedirectLink] = useState('')
  const [result, setResult] = useState<ChatbotResult | null>(null)

  const updateFaq = (i: number, value: string) =>
    setFaqs((prev) => prev.map((f, idx) => idx === i ? value : f))

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, services, hours, faqs, redirectGoal, redirectLink })
      const res = await api.post('/tools/chatbot-senaryo/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return parseAiJson<ChatbotResult>(content)
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = biz.trim() && sector && services.trim() && faqs.filter(Boolean).length >= 3 && redirectGoal && !mutation.isPending

  return (
    <ToolShell
      toolId="chatbot-senaryo"
      title="Chatbot Senaryosu Hazırlayıcı"
      icon="🤖"
      description="İşletme bilgilerini ve sıkça sorulan soruları girin; hazır chatbot akış senaryosu ve mesaj metinleri oluşturalım."
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
                    label="İşletme adı *"
                    placeholder="Örn: Demir Otomotiv"
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
                  label="Sunulan hizmetler *"
                  placeholder="Örn: Araç bakımı, yağ değişimi, lastik servisi, fren bakımı ve kaporta onarım hizmetleri."
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  rows={3}
                />

                <Input
                  label="Mesai saatleri"
                  placeholder="Örn: Hft 08:00-18:00, Cmt 09:00-14:00"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">
                    Sıkça sorulan sorular * <span className="font-normal text-[#9A9792]">(ilk 3 zorunlu)</span>
                  </p>
                  <div className="flex flex-col gap-2">
                    {faqs.map((faq, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-[#9A9792] w-5 shrink-0">{i + 1}.</span>
                        <input
                          type="text"
                          value={faq}
                          onChange={(e) => updateFaq(i, e.target.value)}
                          placeholder={
                            i === 0 ? 'Örn: Fiyatlarınız nedir?' :
                            i === 1 ? 'Örn: Randevu nasıl alabilirim?' :
                            i === 2 ? 'Örn: Nerede bulunuyorsunuz?' : 'Opsiyonel...'
                          }
                          className="flex-1 px-3 py-2 text-sm border border-[#D3D1C7] rounded-lg bg-white text-[#1C1B19] placeholder:text-[#9A9792] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/10"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Yönlendirme hedefi *"
                    value={redirectGoal}
                    onChange={(e) => setRedirectGoal(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...YONLENDIRME_HEDEFLERI.map((h) => ({ value: h.value, label: h.label }))]}
                  />
                  <Input
                    label="Yönlendirme linki / numarası"
                    placeholder="Örn: 0532 000 00 00 veya site.com/randevu"
                    value={redirectLink}
                    onChange={(e) => setRedirectLink(e.target.value)}
                  />
                </div>

                <FormPersistButtons
                  filename="chatbot-senaryo-formu.json"
                  getData={() => ({ biz, sector, services, hours, faqs, redirectGoal, redirectLink })}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.services === 'string') setServices(d.services)
                    if (typeof d.hours === 'string') setHours(d.hours)
                    if (Array.isArray(d.faqs)) setFaqs(d.faqs as string[])
                    if (typeof d.redirectGoal === 'string') setRedirectGoal(d.redirectGoal)
                    if (typeof d.redirectLink === 'string') setRedirectLink(d.redirectLink)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🤖 Chatbot Senaryosu Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Chatbot senaryosu hazırlanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Özel mesajlar */}
              {result.ozel_mesajlar && result.ozel_mesajlar.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">💬 Özel Mesajlar</h3>
                  <div className="flex flex-col gap-3">
                    {result.ozel_mesajlar.map((m, i) => (
                      <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                          <span className="text-xs font-semibold text-[#085041]">{m.tip}</span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{m.metin}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SSS kartları */}
              {result.sss_kartlari && result.sss_kartlari.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">❓ SSS Akış Kartları</h3>
                  <div className="flex flex-col gap-3">
                    {result.sss_kartlari.map((item, i) => (
                      <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800">
                          👤 {item.soru}
                        </div>
                        <div className="bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                          🤖 {item.cevap}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* İpuçları */}
              {result.ipuclari && result.ipuclari.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">💡 Kurulum & Kullanım İpuçları</h3>
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
                Yeni senaryo oluştur
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
