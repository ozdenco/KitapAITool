import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ResultCard, ResultSection } from '@/components/ui/ResultCard'
import type { MusteriPersonaPayload } from '@/types'

interface PersonaResult {
  persona_adi: string
  yas_araligi: string
  cinsiyet_dagilimi: string
  gelir_seviyesi: string
  egitim: string
  meslek: string
  yasam_tarzi: string
  degerler_ve_oncelikler: string[]
  acilar_ve_sorunlar: string[]
  hedefler_ve_arzular: string[]
  satin_alma_davranisi: string
  iletisim_tercihleri: string[]
  pazarlama_mesajlari: string[]
  ideal_icerik_turleri: string[]
  ornek_bir_gun: string
}

const HEDEF_KITLELER = [
  'Genç Profesyoneller (25-35)',
  'Orta Yaş Ev Hanımları',
  'Emekliler (55+)',
  'Üniversite Öğrencileri',
  'KOBİ Sahipleri',
  'Ebeveynler',
  'Spor Tutkunları',
  'Teknoloji Meraklıları',
  'Diğer'
]

export function MusteriPersonaPage() {
  const [form, setForm] = useState<MusteriPersonaPayload>({
    isletme_adi: '',
    urun_hizmet: '',
    mevcut_musteriler: '',
    hedef_kitle: '',
    cografya: '',
    fiyat_araligi: '',
  })
  const [result, setResult] = useState<PersonaResult | null>(null)

  const update = (field: keyof MusteriPersonaPayload, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tools/musteri-persona/run', form)
      return res.data as PersonaResult
    },
    onSuccess: (data) => setResult(data),
  })

  const canSubmit =
    form.isletme_adi.trim() &&
    form.urun_hizmet.trim() &&
    !mutation.isPending

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">👥</span>
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Persona Oluşturucu</h1>
        </div>
        <p className="text-gray-500 text-sm">
          İşletmeniz için detaylı müşteri profili oluşturun. Kime sattığınızı anlayın.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          <Input
            label="İşletme Adı *"
            placeholder="ör. Yeşil Bebek Mağazası"
            value={form.isletme_adi}
            onChange={(e) => update('isletme_adi', e.target.value)}
          />

          <Textarea
            label="Ürün / Hizmetiniz *"
            placeholder="Ne satıyorsunuz? Ürün veya hizmetinizi kısaca açıklayın..."
            hint="Örn: Organik bebek maması ve doğal bakım ürünleri"
            value={form.urun_hizmet}
            onChange={(e) => update('urun_hizmet', e.target.value)}
          />

          <Textarea
            label="Mevcut Müşterileriniz (isteğe bağlı)"
            placeholder="Şu an kimler alıyor? Bildiklerinizi paylaşın..."
            value={form.mevcut_musteriler}
            onChange={(e) => update('mevcut_musteriler', e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Hedef Kitle Tahmini"
              value={form.hedef_kitle}
              onChange={(e) => update('hedef_kitle', e.target.value)}
              options={[
                { value: '', label: 'Emin değilim / AI karar versin' },
                ...HEDEF_KITLELER.map((k) => ({ value: k, label: k }))
              ]}
            />
            <Input
              label="Coğrafya"
              placeholder="ör. İstanbul Anadolu Yakası"
              value={form.cografya}
              onChange={(e) => update('cografya', e.target.value)}
            />
          </div>

          <Select
            label="Fiyat Aralığı"
            value={form.fiyat_araligi}
            onChange={(e) => update('fiyat_araligi', e.target.value)}
            options={[
              { value: '', label: 'Belirtmek istemiyorum' },
              { value: 'ekonomik', label: 'Ekonomik (piyasanın altı)' },
              { value: 'orta', label: 'Orta segment' },
              { value: 'premium', label: 'Premium / Lüks' },
            ]}
          />

          {mutation.isError && (
            <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
          )}

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            loading={mutation.isPending}
            className="mt-2"
          >
            Persona Oluştur
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Persona hero */}
          <ResultCard>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center text-3xl">
                👤
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{result.persona_adi}</h2>
                <p className="text-sm text-gray-500">
                  {result.yas_araligi} · {result.meslek} · {result.gelir_seviyesi}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-[#1D9E75]/30 pl-4">
              {result.ornek_bir_gun}
            </p>
          </ResultCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard>
              <ResultSection title="Acılar & Sorunlar">
                <ul className="flex flex-col gap-2">
                  {result.acilar_ve_sorunlar.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-red-400 shrink-0 mt-0.5">●</span> {item}
                    </li>
                  ))}
                </ul>
              </ResultSection>
            </ResultCard>

            <ResultCard>
              <ResultSection title="Hedefler & Arzular">
                <ul className="flex flex-col gap-2">
                  {result.hedefler_ve_arzular.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-[#1D9E75] shrink-0 mt-0.5">●</span> {item}
                    </li>
                  ))}
                </ul>
              </ResultSection>
            </ResultCard>
          </div>

          <ResultCard>
            <ResultSection title="Pazarlama Mesajları">
              <div className="flex flex-col gap-3">
                {result.pazarlama_mesajlari.map((msg, i) => (
                  <div key={i} className="rounded-lg bg-[#1D9E75]/5 border border-[#1D9E75]/10 px-4 py-3 text-sm text-gray-700">
                    "{msg}"
                  </div>
                ))}
              </div>
            </ResultSection>
          </ResultCard>

          <ResultCard>
            <ResultSection title="Satın Alma Davranışı">
              <p className="text-sm text-gray-700 leading-relaxed">{result.satin_alma_davranisi}</p>
            </ResultSection>
            <ResultSection title="İletişim Kanalları">
              <div className="flex flex-wrap gap-2">
                {result.iletisim_tercihleri.map((k, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">{k}</span>
                ))}
              </div>
            </ResultSection>
            <ResultSection title="İçerik Türleri">
              <div className="flex flex-wrap gap-2">
                {result.ideal_icerik_turleri.map((k, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-[#1D9E75]/10 text-xs text-[#1D9E75]">{k}</span>
                ))}
              </div>
            </ResultSection>
          </ResultCard>
        </div>
      )}
    </div>
  )
}
