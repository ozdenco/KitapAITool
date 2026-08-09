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

interface AkisAdim {
  adim: number
  bot_mesaji: string
  secenekler?: string[]
  sonraki?: string
}

interface SssItem {
  soru: string
  cevap: string
}

interface ChatbotResult {
  akis: AkisAdim[]
  sss: SssItem[]
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

const KANALLAR = ['Web Sitesi', 'WhatsApp', 'Her İkisi']
const AMACLAR = ['Sık Sorulan Soruları Yanıtlama', 'Randevu / Rezervasyon', 'Ürün Tanıtımı', 'Müşteri Desteği', 'Satış / Lead Toplama']
const TONLAR = ['Profesyonel', 'Samimi', 'Eğlenceli', 'Resmi']

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; kanal: string
  amac: string; ton: string; sssList: string
}): string {
  return `Sen chatbot tasarımı ve müşteri iletişimi uzmanısın.

İŞLETME: ${f.isletme}
SEKTÖR: ${f.sektor}
CHATBOT KANALI: ${f.kanal}
ANA AMAÇ: ${f.amac}
İLETİŞİM TONU: ${f.ton}
SIK SORULAN SORULAR: ${f.sssList || 'sektöre göre tipik SSS'}

${f.isletme} için hazır chatbot konuşma senaryosu oluştur.
- ${f.kanal} formatına uygun olsun
- Ton: ${f.ton}
- Müşteriyi doğal bir şekilde yönlendir

SADECE JSON döndür:
{
  "akis": [
    {
      "adim": <sayı>,
      "bot_mesaji": "<bot'un söylediği mesaj>",
      "secenekler": ["<seçenek 1>", "<seçenek 2>"],
      "sonraki": "<sonraki adım açıklaması, 1 cümle>"
    }
  ],
  "sss": [
    {
      "soru": "<müşterinin sorduğu soru>",
      "cevap": "<bot'un cevabı>"
    }
  ],
  "ipuclari": ["<chatbot kurulum ve kullanım ipuçları, 3-4 madde>"],
  "ctaText": "<${f.isletme} için teşvik cümlesi>"
}
Akışta 5-7 adım olsun. SSS'de 5-6 soru/cevap olsun. Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatbotSenaryoPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [kanal, setKanal] = useState('')
  const [amac, setAmac] = useState('')
  const [ton, setTon] = useState('')
  const [sssList, setSssList] = useState('')
  const [result, setResult] = useState<ChatbotResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, kanal, amac, ton, sssList })
      const res = await api.post('/tools/chatbot-senaryo/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as ChatbotResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && kanal && amac && !mutation.isPending

  return (
    <ToolShell
      toolId="chatbot-senaryo"
      title="Chatbot Senaryo Hazırlayıcı"
      icon="🤖"
      description="Web siteniz veya WhatsApp için hazır chatbot konuşma senaryoları ve SSS yanıtları oluşturun."
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
                  placeholder="Örn: Omega Güzellik Kliniği"
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
                    label="İletişim tonu"
                    value={ton}
                    onChange={(e) => setTon(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...TONLAR.map((t) => ({ value: t, label: t }))]}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Chatbot kanalı *</p>
                  <div className="flex flex-wrap gap-2">
                    {KANALLAR.map((k) => (
                      <button key={k} type="button" onClick={() => setKanal(k)}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                          kanal === k ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {k === 'Web Sitesi' ? '🌐' : k === 'WhatsApp' ? '💬' : '🔗'} {k}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Chatbot'un ana amacı *</p>
                  <div className="flex flex-wrap gap-2">
                    {AMACLAR.map((a) => (
                      <button key={a} type="button" onClick={() => setAmac(a)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          amac === a ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="Müşterilerinizin sık sorduğu sorular (isteğe bağlı)"
                  placeholder="Örn: Fiyatlarınız nedir? Randevu nasıl alınır? Hangi hizmetleri sunuyorsunuz?"
                  value={sssList}
                  onChange={(e) => setSssList(e.target.value)}
                  rows={3}
                />

                <FormPersistButtons
                  filename="chatbot-senaryo-formu.json"
                  getData={() => ({ isletme, sektor, kanal, amac, ton, sssList })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.kanal === 'string') setKanal(d.kanal)
                    if (typeof d.amac === 'string') setAmac(d.amac)
                    if (typeof d.ton === 'string') setTon(d.ton)
                    if (typeof d.sssList === 'string') setSssList(d.sssList)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🤖 Senaryo Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Chatbot senaryosu hazırlanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Konuşma akışı */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">🤖 Konuşma Akışı</h3>
                <div className="flex flex-col gap-3">
                  {result.akis.map((adim, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {adim.adim}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-2">
                          🤖 {adim.bot_mesaji}
                        </div>
                        {adim.secenekler && adim.secenekler.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {adim.secenekler.map((s, j) => (
                              <span key={j} className="px-2.5 py-1 rounded-full border border-[#1D9E75]/30 text-xs text-[#1D9E75] bg-[#1D9E75]/5">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {adim.sonraki && (
                          <p className="text-xs text-gray-400">→ {adim.sonraki}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SSS */}
              {result.sss.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">❓ Sık Sorulan Sorular & Hazır Cevaplar</h3>
                  <div className="flex flex-col gap-3">
                    {result.sss.map((item, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 Kurulum & Kullanım İpuçları</h3>
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
