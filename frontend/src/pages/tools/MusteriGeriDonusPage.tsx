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

interface TakipAdim {
  adim: number
  kanal: string
  zamanlama: string
  mesaj: string
  ipucu: string
}

interface GeriDonusResult {
  adimlar: TakipAdim[]
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const SIKLIKLLAR = [
  { value: 'Tek seferlik', label: 'Tek seferlik' },
  { value: 'Aylık', label: 'Aylık' },
  { value: '3 ayda bir', label: '3 ayda bir' },
  { value: '6 ayda bir', label: '6 ayda bir' },
  { value: 'Yıllık', label: 'Yıllık' },
]

const TAKIP_YONTEMLERI = [
  { value: 'Hiç takip yapmıyorum', label: 'Hiç takip yapmıyorum' },
  { value: 'Manuel hatırlatma', label: 'Manuel hatırlatma' },
  { value: 'CRM var', label: 'CRM var' },
  { value: 'Başka bir yöntem', label: 'Başka bir yöntem' },
]

const KANALLAR = [
  { value: 'WhatsApp', label: '💬 WhatsApp' },
  { value: 'E-posta', label: '📧 E-posta' },
  { value: 'SMS', label: '📱 SMS' },
  { value: 'Telefon', label: '📞 Telefon' },
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  biz: string; sector: string; frequency: string
  service: string; channels: string[]; currentMethod: string; note: string
}): string {
  return `Sen müşteri ilişkileri ve satış otomasyonu uzmanısın. KOBİ'ler için etkili müşteri takip senaryoları oluşturuyorsun.

İşletme: ${f.biz}
Sektör: ${f.sector}
Müşteri satın alma sıklığı: ${f.frequency}
Hizmet/Ürün: ${f.service}
Tercih edilen takip kanalları: ${f.channels.join(', ')}
Mevcut takip yöntemi: ${f.currentMethod || 'belirtilmemiş'}
Özel not: ${f.note || 'belirtilmemiş'}

${f.biz} için 5 adımlı müşteri takip senaryosu oluştur.
- Satın alma sıklığına göre zamanlama ayarla (${f.frequency})
- ${f.channels.join(' ve ')} kanallarını kullan
- Her adımda somut mesaj örneği ver

SADECE JSON döndür:
{
  "adimlar": [
    {
      "adim": 1,
      "kanal": "<hangi kanal>",
      "zamanlama": "<ne zaman, ör: Hizmetten 1 hafta sonra>",
      "mesaj": "<tam mesaj metni, emoji kullanabilirsin>",
      "ipucu": "<bu adım için pratik ipucu>"
    }
  ],
  "ctaText": "<${f.biz} için motivasyon cümlesi>"
}
5 adım olsun. Türkçe, samimi ve uygulanabilir olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MusteriGeriDonusPage() {
  const queryClient = useQueryClient()
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [frequency, setFrequency] = useState('')
  const [service, setService] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [currentMethod, setCurrentMethod] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<GeriDonusResult | null>(null)

  const toggleChannel = (v: string) =>
    setChannels((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, frequency, service, channels, currentMethod, note })
      const res = await api.post('/tools/musteri-geri-donus/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return parseAiJson<GeriDonusResult>(content)
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = biz.trim() && sector && frequency && service.trim() && channels.length > 0 && !mutation.isPending

  return (
    <ToolShell
      toolId="musteri-geri-donus"
      title="Müşteri Geri Dönüş Senaryosu"
      icon="🔄"
      description="Sektörünüzü ve müşteri profilinizi girin; 5 adımlık otomatik müşteri takip senaryosu oluşturalım."
      hasResult={!!result}
      formHasInput={!!biz.trim()}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                  {header}
                <Input
                  label="İşletme / hizmet adı *"
                  placeholder="Örn: Güneş Diş Kliniği"
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
                  <Select
                    label="Müşteri satın alma sıklığı *"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SIKLIKLLAR.map((s) => ({ value: s.value, label: s.label }))]}
                  />
                </div>

                <Textarea
                  label="Hizmet / ürün açıklaması *"
                  placeholder="Örn: Diş muayenesi, kanal tedavisi, implant ve estetik diş hizmetleri sunuyoruz."
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  rows={3}
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">Tercih edilen takip kanalları (en az 1) *</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {KANALLAR.map((k) => (
                      <label
                        key={k.value}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          channels.includes(k.value)
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-auto"
                          checked={channels.includes(k.value)}
                          onChange={() => toggleChannel(k.value)}
                        />
                        {k.label}
                      </label>
                    ))}
                  </div>
                </div>

                <Select
                  label="Mevcut müşteri takip yöntemi"
                  value={currentMethod}
                  onChange={(e) => setCurrentMethod(e.target.value)}
                  options={[{ value: '', label: 'Seçin...' }, ...TAKIP_YONTEMLERI.map((t) => ({ value: t.value, label: t.label }))]}
                />

                <Input
                  label="Özel not (opsiyonel)"
                  placeholder="Örn: Müşterilerimiz genellikle 30-50 yaş arası, zaman sıkıntısı var"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <FormPersistButtons
                  filename="musteri-geri-donus-formu.json"
                  getData={() => ({ biz, sector, frequency, service, channels, currentMethod, note })}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.frequency === 'string') setFrequency(d.frequency)
                    if (typeof d.service === 'string') setService(d.service)
                    if (Array.isArray(d.channels)) setChannels(d.channels as string[])
                    if (typeof d.currentMethod === 'string') setCurrentMethod(d.currentMethod)
                    if (typeof d.note === 'string') setNote(d.note)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🔄 Senaryo Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Takip senaryosu hazırlanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">🔄 5 Adımlı Müşteri Takip Senaryosu</h3>
                <div className="flex flex-col gap-4">
                  {result.adimlar.map((adim, i) => (
                    <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                        <div className="w-6 h-6 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {adim.adim}
                        </div>
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#085041]">{adim.kanal}</span>
                          <span className="text-xs text-gray-400">• {adim.zamanlama}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">{adim.mesaj}</p>
                        {adim.ipucu && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            💡 {adim.ipucu}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
