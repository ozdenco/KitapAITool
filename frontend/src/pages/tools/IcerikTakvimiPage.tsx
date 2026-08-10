import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentItem {
  gun: string
  tarih?: string
  platform: string
  icerik_turu: string
  konu: string
  baslik: string
  icerik: string
  hashtag: string[]
  en_iyi_saat?: string
}

interface TakvimiResult {
  icerik_takvimi: ContentItem[]
  ozet?: string
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

const PLATFORMLAR = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Twitter/X', 'YouTube Shorts']

const GUNLER = [
  { value: 'Pazartesi', label: 'Pzt' },
  { value: 'Salı', label: 'Sal' },
  { value: 'Çarşamba', label: 'Çar' },
  { value: 'Perşembe', label: 'Per' },
  { value: 'Cuma', label: 'Cum' },
  { value: 'Cumartesi', label: 'Cmt' },
  { value: 'Pazar', label: 'Paz' },
]

const TONLAR = [
  { value: 'Profesyonel ve güvenilir', label: 'Profesyonel ve güvenilir' },
  { value: 'Samimi ve yakın', label: 'Samimi ve yakın' },
  { value: 'Eğitici ve bilgilendirici', label: 'Eğitici ve bilgilendirici' },
  { value: 'Enerjik ve motive edici', label: 'Enerjik ve motive edici' },
  { value: 'Mizahi ve eğlenceli', label: 'Mizahi ve eğlenceli' },
]

const PLATFORM_EMOJIS: Record<string, string> = {
  Instagram: '📸', Facebook: '👍', LinkedIn: '💼',
  TikTok: '🎵', 'Twitter/X': '✖️', 'YouTube Shorts': '▶️',
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(f: {
  bizName: string; sector: string; audience: string
  platform: string; gunler: string; ton: string
  lang: string; ozelGunler: string; startDate: string
}): string {
  return `Sen sosyal medya içerik stratejisti ve metin yazarısın. 30 günlük kapsamlı içerik takvimi oluşturuyorsun.

İşletme: ${f.bizName || 'belirtilmemiş'}
Sektör: ${f.sector || 'belirtilmemiş'}
Hedef kitle: ${f.audience || 'belirtilmemiş'}
Platform: ${f.platform}
Paylaşım günü: ${f.gunler}
Marka tonu: ${f.ton || 'Profesyonel ve güvenilir'}
İçerik dili: ${f.lang}
Özel günler / kampanyalar: ${f.ozelGunler || 'yok'}
Başlangıç tarihi: ${f.startDate || 'bugün'}

${f.bizName || 'Bu işletme'} için ${f.platform}'da ${f.gunler} günleri paylaşılacak 30 günlük içerik takvimi oluştur.
Her içerik için hazır metin taslağı yaz. Hashtag öner. ${f.lang} dilinde olsun.
Varsa özel günleri (${f.ozelGunler || 'belirtilmemiş'}) içeriğe yansıt.

SADECE JSON döndür:
{
  "icerik_takvimi": [
    {
      "gun": "<haftanın günü, ör: Pazartesi>",
      "tarih": "<gün numarası, ör: 1. hafta>",
      "platform": "${f.platform}",
      "icerik_turu": "<Gönderi / Video / Hikaye / Carousel vb.>",
      "konu": "<içerik konusu, 1 cümle>",
      "baslik": "<içerik başlığı>",
      "icerik": "<hazır paylaşım metni, emojiler kullanabilirsin>",
      "hashtag": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "en_iyi_saat": "<ör: 18:00-20:00>"
    }
  ],
  "ozet": "<30 günlük strateji özeti, 1-2 cümle>",
  "ipuclari": ["<3 pratik içerik ipucu>"],
  "ctaText": "<${f.bizName || 'işletme'} için motivasyon cümlesi>"
}
Her haftada ${f.gunler} günü olan tarihlere denk gelecek şekilde yaklaşık 4-5 içerik üret. Türkçe veya ${f.lang} dilinde, sektöre özgü, uygulanabilir olsun.`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IcerikTakvimiPage() {
  const queryClient = useQueryClient()
  const [bizName, setBizName] = useState('')
  const [sector, setSector] = useState('')
  const [audience, setAudience] = useState('')
  const [platform, setPlatform] = useState('')   // max 1
  const [gunler, setGunler] = useState('')       // max 1 day
  const [ton, setTon] = useState('')
  const [lang, setLang] = useState('Türkçe')
  const [ozelGunler, setOzelGunler] = useState('')
  const [startDate, setStartDate] = useState('')
  const [result, setResult] = useState<TakvimiResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const prompt = buildPrompt({ bizName, sector, audience, platform, gunler, ton, lang, ozelGunler, startDate })
      const res = await api.post('/tools/icerik-takvimi/run', { prompt })
      const content = res.data?.content?.[0]?.text ?? res.data
      return (typeof content === 'string' ? JSON.parse(content) : content) as TakvimiResult
    },
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  const getData = () => ({ bizName, sector, audience, platform, gunler, ton, lang, ozelGunler, startDate })

  const canSubmit = (bizName.trim() || sector) && platform && gunler && !mutation.isPending

  return (
    <ToolShell
      toolId="icerik-takvimi"
      title="30 Günlük İçerik Takvimi"
      icon="📅"
      description="Sektörünüze, hedef kitlenize ve marka sesinize uygun 30 günlük sosyal medya takvimi oluşturalım. Her gün için konu, format önerisi ve hazır taslak metin üretiyoruz."
      hasResult={!!result}
      formHasInput={!!bizName.trim() || !!sector}
    >
      {({ isFormOpen }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="İşletme / marka adı"
                    placeholder="Örn: Yıldız Muhasebe"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                  <Select
                    label="Sektör"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...SEKTORLER.map((s) => ({ value: s, label: s }))]}
                  />
                </div>

                <Input
                  label="Hedef kitle"
                  placeholder="Örn: 30-50 yaş, küçük işletme sahipleri, muhasebe konusunda bilgisi az girişimciler"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">
                    Hangi platform için içerik üretilsin? *
                    <span className="font-normal text-gray-400 ml-1">(en fazla 1)</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {PLATFORMLAR.map((p) => (
                      <label
                        key={p}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border-[0.5px] rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          platform === p
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="platform"
                          className="w-auto"
                          checked={platform === p}
                          onChange={() => setPlatform(p)}
                        />
                        {PLATFORM_EMOJIS[p]} {p}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-1">
                    Haftanın hangi günü paylaşım yapılsın? *
                    <span className="font-normal text-gray-400 ml-1">(en fazla 1)</span>
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-1">
                    {GUNLER.map((g) => (
                      <label
                        key={g.value}
                        className={`flex flex-col items-center justify-center gap-1 py-2 border rounded-lg cursor-pointer text-sm select-none transition-colors ${
                          gunler === g.value
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input type="radio" name="gunler" className="sr-only" checked={gunler === g.value} onChange={() => setGunler(g.value)} />
                        <span className="text-xs font-semibold">{g.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Marka tonu"
                    value={ton}
                    onChange={(e) => setTon(e.target.value)}
                    options={[{ value: '', label: 'Seçin...' }, ...TONLAR]}
                  />
                  <Select
                    label="İçerik dili"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    options={[{ value: 'Türkçe', label: 'Türkçe' }, { value: 'İngilizce', label: 'İngilizce' }]}
                  />
                </div>

                <Input
                  label="Bu ay özel günler / kampanyalar var mı?"
                  placeholder="Örn: 15 Temmuz kurumsal indirim, mağaza yıl dönümü 22. gün"
                  value={ozelGunler}
                  onChange={(e) => setOzelGunler(e.target.value)}
                />

                <div>
                  <label className="block text-sm font-medium text-[#6B6963] mb-1.5">
                    Takvim başlangıç tarihi
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-[#D3D1C7] rounded-lg bg-white text-gray-900 outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/10"
                  />
                </div>

                <FormPersistButtons
                  filename="icerik-takvimi-formu.json"
                  getData={getData}
                  onLoad={(d) => {
                    if (typeof d.bizName === 'string') setBizName(d.bizName)
                    if (typeof d.sector === 'string') setSector(d.sector)
                    if (typeof d.audience === 'string') setAudience(d.audience)
                    if (typeof d.platform === 'string') setPlatform(d.platform)
                    if (typeof d.gunler === 'string') setGunler(d.gunler)
                    if (typeof d.ton === 'string') setTon(d.ton)
                    if (typeof d.lang === 'string') setLang(d.lang)
                    if (typeof d.ozelGunler === 'string') setOzelGunler(d.ozelGunler)
                    if (typeof d.startDate === 'string') setStartDate(d.startDate)
                  }}
                />

                {mutation.isError && (
                  <p className="text-sm text-red-500">Bir hata oluştu. Lütfen tekrar deneyin.</p>
                )}

                <Button onClick={() => mutation.mutate()} disabled={!canSubmit} loading={mutation.isPending} className="mt-1 w-full">
                  📅 30 Günlük İçerik Takvimi Oluştur
                </Button>
                {mutation.isPending && (
                  <p className="text-center text-sm text-gray-400 animate-pulse">İçerik takvimi oluşturuluyor — 1-2 dakika sürebilir...</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              {result.ozet && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">📊 Strateji Özeti</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.ozet}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">📅 {result.icerik_takvimi.length} İçerik Planı</h3>
                <div className="flex flex-col gap-3">
                  {result.icerik_takvimi.map((item, i) => (
                    <div key={i} className="rounded-xl border border-[#F1EFE8] p-4 hover:border-[#1D9E75]/30 transition">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span>{PLATFORM_EMOJIS[item.platform] ?? '📝'}</span>
                          <span className="text-xs font-semibold text-gray-500">{item.platform}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{item.gun}{item.tarih ? ` · ${item.tarih}` : ''}</span>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{item.icerik_turu}</span>
                      </div>
                      <p className="font-semibold text-sm text-gray-800 mb-1">{item.baslik}</p>
                      {item.konu && item.konu !== item.baslik && (
                        <p className="text-xs text-gray-400 mb-2 italic">{item.konu}</p>
                      )}
                      <p className="text-sm text-[#1C1B19] leading-relaxed mb-3 whitespace-pre-wrap">{item.icerik}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.hashtag.map((tag, j) => (
                          <span key={j} className="text-xs text-[#1D9E75]">{tag}</span>
                        ))}
                      </div>
                      {item.en_iyi_saat && (
                        <p className="text-xs text-gray-400">⏰ En iyi paylaşım saati: {item.en_iyi_saat}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {result.ipuclari && result.ipuclari.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">💡 Pratik İpuçları</h3>
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
                Yeni takvim oluştur
              </button>
            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
