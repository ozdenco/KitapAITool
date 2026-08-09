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

interface Senaryo {
  kanal: string
  baslik: string
  mesaj: string
  zamanlama: string
  ipucu?: string
}

interface GeriDonusResult {
  senaryolar: Senaryo[]
  strateji?: string
  ctaText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEKTORLER = [
  'Muhasebe / Finans', 'Sağlık / Klinik', 'Eğitim / Kurs',
  'İnşaat / Mühendislik', 'Hukuk / Danışmanlık', 'Perakende / Mağaza',
  'Yiyecek / İçecek', 'Güzellik / Estetik', 'Lojistik / Taşımacılık',
  'Teknoloji / Yazılım', 'Diğer',
]

const AYRILMA_SEBEPLERI = [
  'Fiyat çok yüksekti', 'Rakip aldılar', 'Kötü deneyim / şikayet',
  'Bizi unuttular', 'İhtiyaçları değişti', 'Kalite beklentisi karşılanmadı',
]

const KANALLAR = ['WhatsApp', 'E-posta', 'SMS', 'Telefon Araması']
const SURELER = ['1-3 ay', '3-6 ay', '6-12 ay', '1 yıldan fazla']

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  isletme: string; sektor: string; hizmet: string
  sebep: string; kanal: string; sure: string
}): string {
  return `Sen müşteri ilişkileri ve satış uzmanısın. Kaybedilen müşterileri geri kazanmak için iletişim senaryoları oluştur.

İŞLETME: ${f.isletme}
SEKTÖR: ${f.sektor}
HİZMET/ÜRÜN: ${f.hizmet}
AYRILMA SEBEBİ: ${f.sebep}
İLETİŞİM KANALI: ${f.kanal}
SON ALIMDAN GEÇEN SÜRE: ${f.sure || 'belirtilmemiş'}

Bu müşteri profiline göre geri kazanım senaryoları yaz.
- İçtenlikle yaklaş, satışa saldırmadan bağlantı kur
- Ayrılma sebebine özel çözüm veya teklif sun
- Mesajlar ${f.kanal} formatına uygun olsun

SADECE JSON döndür:
{
  "senaryolar": [
    {
      "kanal": "${f.kanal}",
      "baslik": "<adım başlığı, örn: 1. Temas - İçten Merhaba>",
      "mesaj": "<tam mesaj metni, gönderilebilir halde>",
      "zamanlama": "<ne zaman gönderilmeli>",
      "ipucu": "<bu adım için 1 cümle ipucu>"
    }
  ],
  "strateji": "<genel geri kazanım stratejisi, 2 cümle>",
  "ctaText": "<${f.isletme} için motivasyon cümlesi>"
}
3 aşamalı bir senaryo oluştur (ilk temas, takip, son teklif). Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

const KANAL_EMOJIS: Record<string, string> = {
  WhatsApp: '💬', 'E-posta': '📧', SMS: '📱', 'Telefon Araması': '📞',
}

export function MusteriGeriDonusPage() {
  const queryClient = useQueryClient()
  const [isletme, setIsletme] = useState('')
  const [sektor, setSektor] = useState('')
  const [hizmet, setHizmet] = useState('')
  const [sebep, setSebep] = useState('')
  const [kanal, setKanal] = useState('')
  const [sure, setSure] = useState('')
  const [result, setResult] = useState<GeriDonusResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ isletme, sektor, hizmet, sebep, kanal, sure })
      const res = await api.post('/tools/musteri-geri-donus/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as GeriDonusResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = isletme.trim() && sektor && hizmet.trim() && sebep && kanal && !mutation.isPending

  return (
    <ToolShell
      toolId="musteri-geri-donus"
      title="Müşteri Geri Dönüş Senaryosu"
      icon="🔄"
      description="Kaybettiğiniz müşterileri geri kazanmak için adım adım iletişim senaryoları oluşturun."
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
                  placeholder="Örn: Delta Hukuk Bürosu"
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
                    label="Son alımdan geçen süre"
                    value={sure}
                    onChange={(e) => setSure(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SURELER.map((s) => ({ value: s, label: s }))]}
                  />
                </div>

                <Textarea
                  label="Hizmet / Ürün *"
                  placeholder="Örn: Kurumsal hukuki danışmanlık ve sözleşme hazırlama hizmetleri"
                  value={hizmet}
                  onChange={(e) => setHizmet(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Müşterinin ayrılma sebebi *</p>
                  <div className="flex flex-wrap gap-2">
                    {AYRILMA_SEBEPLERI.map((s) => (
                      <button key={s} type="button" onClick={() => setSebep(s)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          sebep === s ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">İletişim kanalı *</p>
                  <div className="flex flex-wrap gap-2">
                    {KANALLAR.map((k) => (
                      <button key={k} type="button" onClick={() => setKanal(k)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          kanal === k ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#1D9E75]/40'
                        }`}>
                        {KANAL_EMOJIS[k]} {k}
                      </button>
                    ))}
                  </div>
                </div>

                <FormPersistButtons
                  filename="geri-donus-formu.json"
                  getData={() => ({ isletme, sektor, hizmet, sebep, kanal, sure })}
                  onLoad={(d) => {
                    if (typeof d.isletme === 'string') setIsletme(d.isletme)
                    if (typeof d.sektor === 'string') setSektor(d.sektor)
                    if (typeof d.hizmet === 'string') setHizmet(d.hizmet)
                    if (typeof d.sebep === 'string') setSebep(d.sebep)
                    if (typeof d.kanal === 'string') setKanal(d.kanal)
                    if (typeof d.sure === 'string') setSure(d.sure)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  🔄 Senaryo Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Senaryolar hazırlanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.strateji && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-1">🎯 Geri Kazanım Stratejisi</p>
                  <p className="text-sm text-blue-700">{result.strateji}</p>
                </div>
              )}

              {result.senaryolar.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="w-6 h-6 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{s.baslik}</span>
                    <span className="ml-auto text-xs text-gray-400">{KANAL_EMOJIS[s.kanal] ?? '📨'} {s.kanal}</span>
                  </div>
                  <div className="p-5">
                    <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap border border-gray-100">
                      {s.mesaj}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>⏰ {s.zamanlama}</span>
                      {s.ipucu && <span>💡 {s.ipucu}</span>}
                    </div>
                  </div>
                </div>
              ))}

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
