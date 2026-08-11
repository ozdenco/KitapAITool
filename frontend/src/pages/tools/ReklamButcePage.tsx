import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { parseAiJson } from '@/lib/parseAiJson'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KanalDagilim {
  kanal: string
  yuzde: number
  tutar: number
  tahminiTiklama?: string
  tahminiLead?: string
}

interface ReklamResult {
  dagilim: KanalDagilim[]
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

const HEDEFLER = ['Marka Bilinirliği', 'Lead Toplama', 'Satış Artırma']

const KANALLAR = [
  { value: 'Google Arama', label: 'Google Arama' },
  { value: 'Google Display', label: 'Google Display' },
  { value: 'Meta (FB+IG)', label: 'Meta (FB+IG)' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'YouTube', label: 'YouTube' },
]

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  biz: string; sector: string; budget: string
  goal: string; audience: string; channels: string[]
}): string {
  return `Sen dijital reklam bütçesi uzmanısın. KOBİ'ler için reklam kanalı dağılımı ve tahmini performans hesaplıyorsun.

İşletme: ${f.biz}
Sektör: ${f.sector}
Aylık Bütçe: ${f.budget} TL
Hedef: ${f.goal}
Hedef Kitle: ${f.audience || 'belirtilmemiş'}
Seçilen Kanallar: ${f.channels.join(', ')}

Bu bütçeyi ${f.goal} hedefine göre seçilen kanallar arasında dağıt.
Her kanal için tahmini tıklama ve lead sayısı ver.
Türkiye dijital reklam maliyetlerini esas al (Google Arama CPC: 3-8₺, Meta CPM: 25-60₺, LinkedIn CPC: 15-40₺ vb.).

SADECE JSON döndür:
{
  "dagilim": [
    {
      "kanal": "<kanal adı>",
      "yuzde": <0-100 arası sayı>,
      "tutar": <TL cinsinden tam sayı>,
      "tahminiTiklama": "<tahmini tıklama aralığı, ör: 800-1.200>",
      "tahminiLead": "<tahmini lead sayısı, ör: 15-30>"
    }
  ],
  "strateji": "<genel bütçe strateji açıklaması, 2-3 cümle>",
  "uyarilar": ["<dikkat edilmesi gereken 2-3 önemli nokta>"],
  "ctaText": "<${f.biz} için motivasyon cümlesi>"
}
Yüzdeler toplamı 100 olsun. Türkçe olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReklamButcePage() {
  const queryClient = useQueryClient()
  const [biz, setBiz] = useState('')
  const [sector, setSector] = useState('')
  const [budget, setBudget] = useState('')
  const [goal, setGoal] = useState('')
  const [audience, setAudience] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [result, setResult] = useState<ReklamResult | null>(null)

  const toggleChannel = (v: string) =>
    setChannels((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ biz, sector, budget, goal, audience, channels })
      const res = await api.post('/tools/reklam-butce/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return parseAiJson<ReklamResult>(content)
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const canSubmit = biz.trim() && sector && budget && goal && channels.length > 0 && !mutation.isPending

  return (
    <ToolShell
      toolId="reklam-butce"
      title="Reklam Bütçe Dağıtıcı"
      icon="📊"
      description="Aylık reklam bütçenizi girin; kanal bazlı dağılım, tahmini tıklama ve beklenen lead sayısını hesaplayalım."
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
                  label="İşletme adı *"
                  placeholder="Örn: Yıldız Dijital Ajans"
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
                  <div>
                    <label className="block text-sm font-medium text-[#6B6963] mb-1.5">
                      Aylık toplam bütçe (TL) *
                    </label>
                    <input
                      type="number"
                      min="500"
                      placeholder="Örn: 10000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-[#D3D1C7] rounded-lg bg-white text-[#1C1B19] placeholder:text-[#9A9792] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/10"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">Reklam hedefi *</p>
                  <div className="flex flex-wrap gap-2">
                    {HEDEFLER.map((h) => (
                      <label
                        key={h}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          goal === h
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="goal"
                          className="w-auto"
                          checked={goal === h}
                          onChange={() => setGoal(h)}
                        />
                        {h}
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="Hedef kitle (yaş, konum, ilgi alanı)"
                  placeholder="Örn: 25-45 yaş, İstanbul, girişimci ve KOBİ sahipleri"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">Tercih edilen kanallar (en az 1 seçin) *</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

                <FormPersistButtons
                  filename="reklam-butce-formu.json"
                  getData={() => ({ biz, sector, budget, goal, audience, channels })}
                  onLoad={(d) => {
                    if (typeof d.biz === 'string') setBiz(d.biz)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.budget === 'string') setBudget(d.budget)
                    if (typeof d.goal === 'string') setGoal(d.goal)
                    if (typeof d.audience === 'string') setAudience(d.audience)
                    if (Array.isArray(d.channels)) setChannels(d.channels as string[])
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-sm text-red-500">{(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  📊 Bütçe Dağılımını Hesapla
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">Bütçe dağılımı hesaplanıyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {/* Kanal dağılımı */}
              <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">📊 Kanal Bazlı Dağılım</h3>
                <div className="flex flex-col gap-4">
                  {result.dagilim.map((k, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-800">{k.kanal}</span>
                        <div className="flex items-center gap-3">
                          {k.tahminiLead && (
                            <span className="text-xs text-gray-500">~{k.tahminiLead} lead</span>
                          )}
                          <span className="text-sm font-bold text-gray-900">
                            {k.tutar.toLocaleString('tr-TR')} ₺
                          </span>
                          <span className="text-xs text-gray-400 w-10 text-right">%{k.yuzde}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-[#1D9E75] rounded-full transition-all"
                          style={{ width: `${k.yuzde}%` }}
                        />
                      </div>
                      {k.tahminiTiklama && (
                        <p className="text-xs text-gray-400 mt-1">{k.tahminiTiklama} tıklama/ay</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strateji */}
              <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">💡 Strateji</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{result.strateji}</p>
              </div>

              {/* Uyarılar */}
              {result.uyarilar && result.uyarilar.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-amber-700 mb-2">⚠️ Dikkat Edilmesi Gerekenler</h3>
                  <ul className="flex flex-col gap-1.5">
                    {result.uyarilar.map((u, i) => (
                      <li key={i} className="text-sm text-amber-700 flex gap-2">
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
                Yeni hesaplama yap
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
