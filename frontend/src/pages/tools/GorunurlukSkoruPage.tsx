import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ResultCard, ResultSection } from '@/components/ui/ResultCard'
import type { GorunurlukSkoruPayload } from '@/types'

interface ScoreResult {
  skore: number
  ozet: string
  guclu_yonler: string[]
  zayif_yonler: string[]
  oncelikli_aksiyonlar: string[]
  detayli_analiz: {
    google_varligi: { puan: number; yorum: string }
    sosyal_medya: { puan: number; yorum: string }
    web_sitesi: { puan: number; yorum: string }
    musteriyorum: { puan: number; yorum: string }
    yerel_seo: { puan: number; yorum: string }
  }
}

const SEHIRLER = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep',
  'Konya', 'Mersin', 'Kayseri', 'Eskişehir', 'Diyarbakır', 'Samsun',
  'Denizli', 'Trabzon', 'Diğer'
]

const SEKTORLER = [
  'Restoran / Kafe', 'Perakende / Mağaza', 'Güzellik / Kuaför', 'Sağlık / Klinik',
  'Eğitim / Kurs', 'İnşaat / Tadilat', 'Hukuk / Danışmanlık', 'Muhasebe / Mali Müşavirlik',
  'Otomotiv / Servis', 'Turizm / Otel', 'Teknoloji / Yazılım', 'Diğer'
]

export function GorunurlukSkoruPage() {
  const [form, setForm] = useState<GorunurlukSkoruPayload>({
    isletme_adi: '',
    sehir: '',
    sektor: '',
    web_sitesi: '',
    google_isletme_profili: false,
    sosyal_medya: [],
  })
  const [result, setResult] = useState<ScoreResult | null>(null)

  const update = (field: keyof GorunurlukSkoruPayload, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleSosyalMedya = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      sosyal_medya: prev.sosyal_medya.includes(platform)
        ? prev.sosyal_medya.filter((p) => p !== platform)
        : [...prev.sosyal_medya, platform],
    }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tools/gorunurluk-skoru/run', form)
      return res.data as ScoreResult
    },
    onSuccess: (data) => setResult(data),
  })

  const canSubmit =
    form.isletme_adi.trim() &&
    form.sehir &&
    form.sektor &&
    !mutation.isPending

  const scoreColor = (score: number) =>
    score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📊</span>
          <h1 className="text-2xl font-bold text-gray-900">İşletme Görünürlük Skoru</h1>
        </div>
        <p className="text-gray-500 text-sm">
          İşletmenizin dijital görünürlüğünü analiz edin. 0-100 arası puan ve öncelikli aksiyonlar alın.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          <Input
            label="İşletme Adı *"
            placeholder="ör. Ayşe'nin Pastanesi"
            value={form.isletme_adi}
            onChange={(e) => update('isletme_adi', e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Şehir *"
              value={form.sehir}
              onChange={(e) => update('sehir', e.target.value)}
              options={[{ value: '', label: 'Seçin...' }, ...SEHIRLER.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              label="Sektör *"
              value={form.sektor}
              onChange={(e) => update('sektor', e.target.value)}
              options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
            />
          </div>

          <Input
            label="Web Sitesi (varsa)"
            placeholder="https://ornekisletme.com"
            type="url"
            value={form.web_sitesi}
            onChange={(e) => update('web_sitesi', e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Sosyal Medya Varlığı
            </label>
            <div className="flex flex-wrap gap-2">
              {['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleSosyalMedya(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition
                    ${form.sosyal_medya.includes(p)
                      ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                      : 'border-gray-300 text-gray-600 hover:border-[#1D9E75]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.google_isletme_profili}
              onChange={(e) => update('google_isletme_profili', e.target.checked)}
              className="w-4 h-4 accent-[#1D9E75]"
            />
            <span className="text-sm text-gray-700">Google İşletme Profilim var</span>
          </label>

          {mutation.isError && (
            <p className="text-sm text-red-500">
              Bir hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            loading={mutation.isPending}
            className="mt-2"
          >
            Skoru Hesapla
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Score hero */}
          <ResultCard className="text-center">
            <div className={`text-7xl font-black mb-2 ${scoreColor(result.skore)}`}>
              {result.skore}
            </div>
            <div className="text-gray-500 text-sm mb-4">/100 Görünürlük Puanı</div>
            <p className="text-gray-700 text-sm leading-relaxed">{result.ozet}</p>
          </ResultCard>

          {/* Breakdown */}
          <ResultCard>
            <ResultSection title="Detaylı Analiz">
              <div className="flex flex-col gap-3">
                {Object.entries(result.detayli_analiz).map(([key, val]) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-20 shrink-0">
                      <div className="text-xs text-gray-500 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div className={`text-lg font-bold ${scoreColor(val.puan)}`}>{val.puan}</div>
                    </div>
                    <div className="h-1.5 flex-1 self-center bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val.puan >= 70 ? 'bg-green-500' : val.puan >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${val.puan}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 w-48 shrink-0 self-center">{val.yorum}</p>
                  </div>
                ))}
              </div>
            </ResultSection>
          </ResultCard>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard>
              <ResultSection title="Güçlü Yönler">
                <ul className="flex flex-col gap-2">
                  {result.guclu_yonler.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-500 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </ResultSection>
            </ResultCard>
            <ResultCard>
              <ResultSection title="Geliştirme Alanları">
                <ul className="flex flex-col gap-2">
                  {result.zayif_yonler.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-red-400 shrink-0">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </ResultSection>
            </ResultCard>
          </div>

          <ResultCard>
            <ResultSection title="Öncelikli Aksiyonlar">
              <ol className="flex flex-col gap-3">
                {result.oncelikli_aksiyonlar.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="flex-none w-6 h-6 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </ResultSection>
          </ResultCard>
        </div>
      )}
    </div>
  )
}
