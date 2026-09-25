import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolPrice {
  id: number
  toolId: string
  toolName: string
  priceMonthly: number
  isActive: boolean
  updatedAt: string
}

// Her araç için hangi AI motorunu kaç birim kullandığı
//
// 28 Ağu 2026: marka kuralları (markaKurallari.ts) prompt'lara eklendiği için
// 9 aracın tüketimi 1 token arttı — ölçümle doğrulandı (persona 2 → 3).
// Viral Video ve Trend Video etkilenmedi; onların prompt'ları n8n'de.
// Token sayıları: araç çalıştırıldıkça gerçek değerler bildirilecek, şimdilik 0 = bilinmiyor
const TOOL_ENGINE_MAP: Record<string, {
  engine: 'minimax' | 'gemini' | 'apify'
  unitsPerRun: number   // token veya run birimi (0 = henüz bilinmiyor)
  unitLabel: string
  note?: string
}> = {
  'icerik-takvimi':     { engine: 'minimax', unitsPerRun: 11, unitLabel: 'token/çalıştırma', note: '1 gün + 1 platform · 10-11 token gözlendi · +1 marka kuralları' },
  'trend-video':        { engine: 'apify',   unitsPerRun: 1,  unitLabel: 'run/çalıştırma' },
  'rakip-analiz':       { engine: 'gemini',  unitsPerRun: 2,  unitLabel: 'token/çalıştırma', note: 'MiniMax 2 token + Gemini Flash ~2,5 ₺/run (13 Eyl 2026 ölçümü) · +1 marka kuralları' },
  'gorunurluk-skoru':   { engine: 'minimax', unitsPerRun: 4,  unitLabel: 'token/çalıştırma', note: '3 token · n8n 20 sn · +1 marka kuralları' },
  'musteri-persona':    { engine: 'minimax', unitsPerRun: 6,  unitLabel: 'token/çalıştırma', note: '21 Eyl 2026 canlı ölçüm: 6 token (marka kuralları dahil) · 7 Eyl: 5 · daha önce: 3 — tüketim her ölçümde arttı' },
  'whatsapp-satis':     { engine: 'minimax', unitsPerRun: 11, unitLabel: 'token/çalıştırma', note: '7 itirazda 10 token · itiraz başına ~1 token (temel 3) · en fazla 10 itiraz → ~13 token · +1 marka kuralları' },
  'reklam-butce':       { engine: 'minimax', unitsPerRun: 3,  unitLabel: 'token/çalıştırma', note: '2 kanal seçiminde 2 token · kanal sayısıyla orantılı · +1 marka kuralları' },
  'musteri-geri-donus': { engine: 'minimax', unitsPerRun: 5,  unitLabel: 'token/çalıştırma', note: '23 Eyl 2026 canlı ölçüm: 5 token (uygulamadan, marka kuralları dahil) · önceki değer 4 idi' },
  'chatbot-senaryo':    { engine: 'minimax', unitsPerRun: 8,  unitLabel: 'token/çalıştırma', note: '24 Eyl ölçümü: 26 kartlık belgeyle 8 token · belgesiz 5 SSS ile 3 token. 25 Eyl: belge sınırı 6.000 → 30.000 karakter çıkarıldı, uzun belgede maliyet ARTAR — yeni ölçüm bekliyor' },
  'ai-gorunurluk':      { engine: 'minimax', unitsPerRun: 4,  unitLabel: 'token/çalıştırma', note: '3 token · n8n 19,2 sn · ekranda 23 sn · +1 marka kuralları' },
  'viral-video':        { engine: 'minimax', unitsPerRun: 2,  unitLabel: 'token/çalıştırma', note: '2 token · ekranda 42 sn' },
}

const TOOL_ICONS: Record<string, string> = {
  'gorunurluk-skoru':  '📊',
  'musteri-persona':   '👤',
  'icerik-takvimi':    '📅',
  'whatsapp-satis':    '💬',
  'reklam-butce':      '💰',
  'musteri-geri-donus':'🔄',
  'rakip-analiz':      '🔍',
  'chatbot-senaryo':   '🤖',
  'ai-gorunurluk':     '✨',
  'viral-video':       '🎬',
  'trend-video':       '📱',
}

// ─── Kur çekme ────────────────────────────────────────────────────────────────

function useUsdTry() {
  return useQuery<number>({
    queryKey: ['usd-try-rate'],
    queryFn: async () => {
      const res  = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY')
      const json = await res.json()
      return (json.rates?.TRY as number) ?? 48
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: 48,
  })
}

// ─── Sayı input yardımcısı ────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, suffix, step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[#6B6963] uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 px-2.5 py-1.5 rounded-lg border border-[#D3D1C7] text-[13px] font-medium text-right tabular-nums bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20"
        />
        {suffix && <span className="text-[12px] text-[#9A9792]">{suffix}</span>}
      </div>
    </label>
  )
}

// ─── Maliyet Analizi Paneli ───────────────────────────────────────────────────

const MALIYET_STORAGE_KEY = 'kkb-maliyet-parametreleri'

const VARSAYILAN_PARAMETRELER = {
  minimaxBudgetUsd:   5,      // $5
  minimaxTokens:      5000,   // 5000 token
  minimaxMonthlyUsd:  5,      // $5/ay sabit MiniMax maliyeti
  claudeUsd:          20,     // $20/ay Claude (geliştirici sabit)
  geminiEstRunsMonth: 100,    // Gemini Flash tahmini aylık run (Rakip Analiz)
  // 13 Eyl 2026 canlı ölçüm: Rakip Analiz turunda Gemini bakiyesi 17,39 ₺ düştü
  // ve API 7 kez çalıştı → 2,48 ₺/run. 48 ₺/$ kurundan ≈ $0,0518 (önceki
  // ölçüm $0,032865 idi, ~1,6 katına çıkmış).
  // ⚠️ Bu değer localStorage'da saklanıyor: eski değeri kaydetmiş tarayıcılarda
  // panelden elle güncellenmeli, yoksa hesap eski rakamla devam eder.
  geminiCostPerRunUsd:0.0518,
  apifyBudgetUsd:     29,     // $29
  apifyRuns:          50,     // 50 run
  n8nUsd:             20,     // $20/ay
  hostingerUsd:       10,     // $10/ay
  activeUsers:        50,     // aktif kullanıcı sayısı
  profitMultiplier:   3,      // kâr marjı çarpanı
  stdPackageRuns:     10,     // standart paket run sayısı
} as const

type MaliyetParametreleri = { -readonly [K in keyof typeof VARSAYILAN_PARAMETRELER]: number }

/** Kayıtlı parametreleri oku; bozuk/eksik alanlar varsayılana düşer. */
function kayitliParametreleriOku(): MaliyetParametreleri {
  const varsayilan: MaliyetParametreleri = { ...VARSAYILAN_PARAMETRELER }
  try {
    const raw = localStorage.getItem(MALIYET_STORAGE_KEY)
    if (!raw) return varsayilan

    const kayitli = JSON.parse(raw) as Record<string, unknown>
    return Object.keys(varsayilan).reduce((acc, key) => {
      const deger = kayitli[key]
      return typeof deger === 'number' && Number.isFinite(deger)
        ? { ...acc, [key]: deger }
        : acc
    }, varsayilan)
  } catch (error) {
    console.error('Maliyet parametreleri okunamadı:', error)
    return varsayilan
  }
}

function MaliyetPaneli({ prices }: { prices?: ToolPrice[] }) {
  const { data: usdTry = 48, isFetching: kurYukleniyor } = useUsdTry()

  // `form`  → hesaplamalarda kullanılan, kaydedilmiş değerler
  // `draft` → input'larda düzenlenen, henüz kaydedilmemiş değerler
  const [form,  setForm]  = useState<MaliyetParametreleri>(kayitliParametreleriOku)
  const [draft, setDraft] = useState<MaliyetParametreleri>(kayitliParametreleriOku)
  const [kaydedildi, setKaydedildi] = useState(false)

  const setF = (k: keyof MaliyetParametreleri) => (v: number) =>
    setDraft(prev => ({ ...prev, [k]: v }))

  const degisiklikVar = (Object.keys(draft) as (keyof MaliyetParametreleri)[])
    .some(k => draft[k] !== form[k])

  const handleKaydet = () => {
    try {
      localStorage.setItem(MALIYET_STORAGE_KEY, JSON.stringify(draft))
    } catch (error) {
      console.error('Maliyet parametreleri kaydedilemedi:', error)
    }
    setForm(draft)                                  // hesaplamalar yeni değerlerle yenilenir
    setKaydedildi(true)
    setTimeout(() => setKaydedildi(false), 2500)
  }

  const handleSifirla = () => {
    const varsayilan: MaliyetParametreleri = { ...VARSAYILAN_PARAMETRELER }
    try {
      localStorage.removeItem(MALIYET_STORAGE_KEY)
    } catch (error) {
      console.error('Maliyet parametreleri sıfırlanamadı:', error)
    }
    setDraft(varsayilan)
    setForm(varsayilan)
  }

  // ── Hesaplama ─────────────────────────────────────────────────────────────
  const minimaxCostPerToken = form.minimaxBudgetUsd / form.minimaxTokens   // $/token
  const apifyCostPerRun     = form.apifyBudgetUsd   / form.apifyRuns        // $/run

  // MiniMax sabit aylık $5 + Claude $20 altyapıya dahil; per-run maliyet ayrı
  const totalInfraUsd   = form.n8nUsd + form.hostingerUsd + form.minimaxMonthlyUsd + form.claudeUsd
  const infraPerUserTry = (totalInfraUsd / Math.max(1, form.activeUsers)) * usdTry

  // Sabit altyapı payı araç başına: kullanıcı başı aylık altyapı / araç sayısı.
  // Aylık bir gider olduğu için çalıştırma sayısıyla ÇARPILMAZ, doğrudan eklenir.
  const toolCount       = (prices ?? []).length || 1
  const infraPerToolTry = infraPerUserTry / toolCount

  function costPerRunUsd(toolId: string): number {
    const m = TOOL_ENGINE_MAP[toolId]
    if (!m || m.unitsPerRun === 0) return 0
    if (m.engine === 'minimax') return minimaxCostPerToken * m.unitsPerRun
    if (m.engine === 'apify')   return apifyCostPerRun     * m.unitsPerRun
    // Rakip Analiz iki motoru BİRLİKTE kullanır: önce Gemini ile web araması,
    // sonra MiniMax ile yorumlama. Yalnızca Gemini maliyetini saymak eksik kalıyordu.
    if (m.engine === 'gemini')  return form.geminiCostPerRunUsd + minimaxCostPerToken * m.unitsPerRun
    return 0
  }

  // Standart paket için ortalama AI maliyeti (Apify hariç — ayrı fiyatlandırılmalı)
  // Sıfır tokenlı araçlar hesaba katılmaz (henüz ölçülmedi)
  const measuredNonApifyTools = (prices ?? []).filter(p => {
    const m = TOOL_ENGINE_MAP[p.toolId]
    return m && m.engine !== 'apify' && m.unitsPerRun > 0
  })
  const avgAiUsd        = measuredNonApifyTools.length
    ? measuredNonApifyTools.reduce((s, p) => s + costPerRunUsd(p.toolId), 0) / measuredNonApifyTools.length
    : 0
  const stdAiTotalTry   = avgAiUsd * form.stdPackageRuns * usdTry
  const stdTotalCostTry = stdAiTotalTry + infraPerUserTry
  const recPriceTry     = Math.ceil(stdTotalCostTry * form.profitMultiplier / 10) * 10

  // ── Araç Başı Maliyet tablosunun alt toplamı ──────────────────────────────
  // Yukarıdaki stdAiTotalTry ORTALAMA maliyeti (tek "temsili" araç) kullanır;
  // burada her ölçülen aracın GERÇEK maliyeti tek tek toplanır. Bu, bir
  // kullanıcının paketteki TÜM araçları aylık limitine kadar kullanması
  // durumundaki gerçek maliyeti verir — fiyatlandırma için daha güvenli üst sınır.
  const trendVideoDahilDegil   = (prices ?? []).some(p => TOOL_ENGINE_MAP[p.toolId]?.engine === 'apify')
  const toplamAiMaliyetiTry    = measuredNonApifyTools.reduce(
    (s, p) => s + costPerRunUsd(p.toolId) * usdTry * form.stdPackageRuns, 0,
  )
  const toplamPaketMaliyetiTry = toplamAiMaliyetiTry + infraPerUserTry
  const onerilenPaketFiyatiTry = Math.ceil(toplamPaketMaliyetiTry * form.profitMultiplier / 10) * 10

  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 flex flex-col gap-6">

      {/* ── Başlık + kur ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[14px] font-semibold text-[#1C1B19] flex items-center gap-2">
            <span>📊</span> Çalıştırma Maliyet Analizi
          </h2>
          <p className="text-[12px] text-[#6B6963] mt-0.5">
            Maliyetleri gir, <strong>Kaydet</strong>'e bas — değerler tarayıcında saklanır
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#F7F6F2] rounded-xl px-4 py-2">
          <span className="text-[12px] text-[#6B6963]">1 USD =</span>
          <span className="text-[15px] font-bold text-[#1C1B19] tabular-nums">
            {kurYukleniyor ? '…' : `₺${usdTry.toFixed(2)}`}
          </span>
          <span className="text-[10px] text-[#9A9792]">Frankfurter API · otomatik</span>
        </div>
      </div>

      {/* ── Kaydet / Sıfırla ─── */}
      <div className={`flex items-center gap-3 flex-wrap rounded-xl px-4 py-3 border transition-colors ${
        degisiklikVar ? 'bg-amber-50 border-amber-200' : 'bg-[#F7F6F2] border-[#E2E0D8]'
      }`}>
        <button
          type="button"
          onClick={handleKaydet}
          disabled={!degisiklikVar}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          💾 Kaydet ve Hesapla
        </button>

        <button
          type="button"
          onClick={handleSifirla}
          className="px-3 py-2 rounded-lg text-[12px] font-medium text-[#6B6963] bg-white border border-[#D3D1C7] hover:border-[#9A9792] transition-colors"
        >
          ↺ Varsayılanlara dön
        </button>

        {degisiklikVar ? (
          <span className="text-[12px] text-amber-700 font-medium">
            ⚠️ Kaydedilmemiş değişiklik var — aşağıdaki hesaplamalar hâlâ eski değerleri gösteriyor
          </span>
        ) : kaydedildi ? (
          <span className="text-[12px] text-[#1D9E75] font-medium">✓ Kaydedildi</span>
        ) : (
          <span className="text-[12px] text-[#9A9792]">
            Tüm hesaplamalar kayıtlı değerlerle yapılıyor
          </span>
        )}
      </div>

      {/* ── Form girdileri ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* MiniMax */}
        <div className="bg-[#F7F6F2] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-[#1C1B19]">🧠 MiniMax (tüm araçlar)</p>
          <NumInput label="Paket bütçesi (USD)" value={draft.minimaxBudgetUsd} onChange={setF('minimaxBudgetUsd')} suffix="$" step={1} />
          <NumInput label="Token sayısı"         value={draft.minimaxTokens}    onChange={setF('minimaxTokens')}    suffix="token" step={100} />
          <NumInput label="Sabit aylık maliyet"  value={draft.minimaxMonthlyUsd} onChange={setF('minimaxMonthlyUsd')} suffix="$/ay" step={1} />
          <div className="text-[11px] text-[#6B6963] bg-white rounded-lg px-3 py-2">
            <span className="font-medium text-[#1C1B19]">${minimaxCostPerToken.toFixed(4)}</span> / token
            <span className="mx-2 text-[#D3D1C7]">·</span>
            İçerik Takvimi: <span className="font-medium text-[#1C1B19]">${(minimaxCostPerToken * 10).toFixed(4)}</span>/run
          </div>
        </div>

        {/* Gemini */}
        <div className="bg-[#F7F6F2] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-[#1C1B19]">✨ Gemini Flash (Rakip Analiz)</p>
          <NumInput label="Çalıştırma başı maliyet" value={draft.geminiCostPerRunUsd} onChange={setF('geminiCostPerRunUsd')} suffix="$/run" step={0.0001} />
          <NumInput label="Aylık tahmini run"        value={draft.geminiEstRunsMonth}  onChange={setF('geminiEstRunsMonth')}  suffix="run" step={10} />
          {/* Ölçüm 27 Ağu 2026'da yapıldı; buradaki uyarı ölçümden sonra da
              koşulsuz görünmeye devam ediyordu. Yerine gerçek bileşim yazıldı. */}
          <div className="text-[11px] text-[#6B6963] bg-white border border-[#E2E0D8] rounded-lg px-3 py-2 leading-relaxed">
            Rakip Analiz <strong>iki motoru birlikte</strong> kullanır: MiniMax{' '}
            {TOOL_ENGINE_MAP['rakip-analiz']?.unitsPerRun ?? 0} token + yukarıdaki
            Gemini maliyeti. Araç başı maliyet ikisinin toplamıdır.
            <br />
            <strong>Başarısız çalıştırma da para yakar:</strong> Gemini zincirde MiniMax'tan
            ÖNCE çalışıyor; sonraki adım hata verse bile Gemini ücreti oluşur
            (13 Eyl 2026: 7 çağrının 6'sı hatayla bitti, Gemini yine de faturalandı).
          </div>
        </div>

        {/* Apify */}
        <div className="bg-[#F7F6F2] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-[#1C1B19]">🕷️ Apify (Trend Video)</p>
          <NumInput label="Plan fiyatı (USD)" value={draft.apifyBudgetUsd}  onChange={setF('apifyBudgetUsd')}  suffix="$/ay" step={1} />
          <NumInput label="Aylık run hakkı"   value={draft.apifyRuns}        onChange={setF('apifyRuns')}        suffix="run" step={5} />
          <div className="text-[11px] text-[#6B6963] bg-white rounded-lg px-3 py-2">
            <span className="font-medium text-[#1C1B19]">${apifyCostPerRun.toFixed(3)}</span> / run
            <span className="mx-2 text-[#D3D1C7]">·</span>
            Trend Video: 1 run/çalıştırma · <span className="text-red-600 font-medium">paket dışı</span>
          </div>
        </div>
      </div>

      {/* ── Altyapı + Paket ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Altyapı */}
        <div className="bg-[#F7F6F2] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-[#1C1B19]">🏗️ Sabit Altyapı (aylık)</p>
          <div className="flex flex-col gap-2">
            <NumInput label="n8n"             value={draft.n8nUsd}           onChange={setF('n8nUsd')}           suffix="$/ay" />
            <NumInput label="Hostinger"       value={draft.hostingerUsd}     onChange={setF('hostingerUsd')}     suffix="$/ay" />
            <NumInput label="MiniMax (sabit)" value={draft.minimaxMonthlyUsd} onChange={setF('minimaxMonthlyUsd')} suffix="$/ay" />
            <NumInput label="Claude (geliştirici)" value={draft.claudeUsd}   onChange={setF('claudeUsd')}        suffix="$/ay" />
          </div>
          <div className="border-t border-[#E2E0D8] pt-2 text-[12px] text-[#1C1B19]">
            Toplam:{' '}
            <strong className="tabular-nums">${totalInfraUsd} · ₺{(totalInfraUsd * usdTry).toFixed(0)}/ay</strong>
          </div>
          <NumInput label="Aktif kullanıcı sayısı" value={draft.activeUsers} onChange={setF('activeUsers')} step={1} />
          <div className="text-[11px] text-[#6B6963]">
            Kullanıcı başı altyapı:{' '}
            <strong className="text-[#1C1B19]">₺{infraPerUserTry.toFixed(1)}/ay</strong>
          </div>
        </div>

        {/* Standart paket sonuç */}
        <div className="bg-[#E6F9F2] border border-[#9FE1CB] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-[#085041]">💡 Standart Paket Hesabı</p>
          <div className="flex flex-col gap-2">
            <NumInput label="Paketteki run sayısı" value={draft.stdPackageRuns}      onChange={setF('stdPackageRuns')}      step={1} />
            {/* 0.1 adım: 1,1 · 1,2 · 1,3 gibi ince ayar yapılabilsin */}
            <NumInput label="Kâr marjı çarpanı"    value={draft.profitMultiplier}     onChange={setF('profitMultiplier')}    step={0.1} />
          </div>
          <div className="flex flex-col gap-1 text-[12px] text-[#1C1B19]">
            <div className="flex justify-between">
              <span className="text-[#6B6963]">Ort. AI maliyeti ({form.stdPackageRuns} run, Apify hariç)</span>
              <span className="tabular-nums font-medium">₺{stdAiTotalTry.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6963]">Altyapı payı ({form.activeUsers} kullanıcı)</span>
              <span className="tabular-nums font-medium">₺{infraPerUserTry.toFixed(2)}</span>
            </div>
            <div className="border-t border-[#9FE1CB] pt-1.5 flex justify-between font-semibold text-[#085041]">
              <span>Toplam maliyet</span>
              <span className="tabular-nums">₺{stdTotalCostTry.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[11px] text-[#6B6963] mb-1">{form.profitMultiplier}× kâr marjıyla önerilen fiyat</p>
            <p className="text-[32px] font-black text-[#085041] tabular-nums leading-none">₺{recPriceTry}</p>
            <p className="text-[10px] text-[#9A9792] mt-1">
              /ay · {form.stdPackageRuns} kullanım · tüm araçlar (Trend Video hariç)
            </p>
          </div>
        </div>
      </div>

      {/* ── Araç başı maliyet tablosu ─── */}
      <div>
        <p className="text-[12px] font-semibold text-[#1C1B19] mb-2">Araç Başı Maliyet</p>
        <div className="overflow-x-auto rounded-xl border border-[#E2E0D8]">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E2E0D8]">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Araç</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Motor</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">$/çalıştırma</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">₺/çalıştırma</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">
                  AI ₺ / {form.stdPackageRuns} run
                </th>
                <th
                  title={`AI maliyeti + araç başına sabit altyapı payı (₺${infraPerToolTry.toFixed(2)}/ay)`}
                  className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] bg-[#F0EFE9]"
                >
                  Toplam maliyet ⓘ
                </th>
                <th
                  title={`Toplam maliyet × ${form.profitMultiplier} kâr çarpanı`}
                  className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#085041] bg-[#E6F9F2]"
                >
                  Önerilen fiyat
                </th>
              </tr>
            </thead>
            <tbody>
              {(prices ?? []).map(tool => {
                const m         = TOOL_ENGINE_MAP[tool.toolId]
                if (!m) return null
                const usd       = costPerRunUsd(tool.toolId)
                const tryV      = usd * usdTry
                const tryN      = tryV * form.stdPackageRuns
                const isApify   = m.engine === 'apify'
                const isUnknown = m.unitsPerRun === 0 && m.engine !== 'apify'
                // Gerçek maliyet: değişken AI gideri + araç başına düşen sabit altyapı payı
                const totalCostTry = tryN + infraPerToolTry
                const recTry       = Math.ceil(totalCostTry * form.profitMultiplier)
                return (
                  <tr key={tool.toolId} className="border-b border-[#F0EFE9] last:border-b-0 hover:bg-[#FAFAF7]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]">{TOOL_ICONS[tool.toolId] ?? '🔧'}</span>
                        <div>
                          <span className="text-[13px] font-medium text-[#1C1B19]">{tool.toolName}</span>
                          {m.note && <p className="text-[10px] text-[#9A9792]">{m.note}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        m.engine === 'minimax' ? 'bg-blue-100 text-blue-700' :
                        m.engine === 'apify'   ? 'bg-red-100 text-red-700' :
                        m.engine === 'gemini'  ? 'bg-purple-100 text-purple-700' :
                        'bg-[#E6F9F2] text-[#085041]'
                      }`}>
                        {m.engine === 'minimax' ? 'MiniMax' : m.engine === 'apify' ? 'Apify' : m.engine === 'gemini' ? 'MiniMax+Gemini' : m.engine}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-[#6B6963]">
                      {isUnknown ? <span className="text-amber-500">ölçülmedi</span> : `$${usd.toFixed(4)}`}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] tabular-nums font-medium text-[#1C1B19]">
                      {isUnknown ? '—' : `₺${tryV.toFixed(3)}`}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-[12px] tabular-nums font-semibold ${
                      isApify ? 'text-red-600' : isUnknown ? 'text-amber-500' : 'text-[#085041]'
                    }`}>
                      {isUnknown ? '—' : `₺${tryN.toFixed(2)}`}
                      {isApify   && <span className="ml-1 text-[10px] text-red-400">⚠️paket dışı</span>}
                      {isUnknown && <span className="ml-1 text-[10px] text-amber-400">⏳bildir</span>}
                    </td>

                    {/* Toplam maliyet = AI + sabit altyapı payı */}
                    <td className="px-3 py-2.5 text-right text-[12px] tabular-nums font-semibold text-[#3A3935] bg-[#F7F6F2]">
                      {isUnknown ? '—' : `₺${totalCostTry.toFixed(2)}`}
                      {!isUnknown && (
                        <p className="text-[9px] font-normal text-[#9A9792]">
                          +₺{infraPerToolTry.toFixed(2)} sabit
                        </p>
                      )}
                    </td>

                    {/* Önerilen satış fiyatı */}
                    <td className="px-3 py-2.5 text-right text-[13px] tabular-nums font-bold text-[#085041] bg-[#E6F9F2]">
                      {isUnknown ? '—' : `₺${recTry}`}
                      {!isUnknown && (
                        <p className="text-[9px] font-normal text-[#1D9E75]">
                          ×{form.profitMultiplier} kâr
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#D3D1C7] bg-[#F7F6F2]">
                <td colSpan={4} className="px-3 py-2.5 text-[12px] font-semibold text-[#1C1B19]">
                  Toplam ({measuredNonApifyTools.length} ölçülen araç, {form.stdPackageRuns} run/araç —
                  bir kullanıcı tüm araçları limitine kadar kullanırsa)
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] tabular-nums font-bold text-[#3A3935]">
                  ₺{toplamPaketMaliyetiTry.toFixed(2)}
                  <p className="text-[9px] font-normal text-[#9A9792]">
                    AI ₺{toplamAiMaliyetiTry.toFixed(2)} + altyapı ₺{infraPerUserTry.toFixed(2)}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-right text-[14px] tabular-nums font-black text-[#085041]">
                  ₺{onerilenPaketFiyatiTry}
                  <p className="text-[9px] font-normal text-[#1D9E75]">
                    ×{form.profitMultiplier} kâr — bu paketi bu fiyata satmalısınız
                  </p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {trendVideoDahilDegil && (
          <p className="text-[11px] text-[#9A9792] mt-2">
            Trend Video Bulucu (Apify) toplama dahil değildir — ayrı fiyatlandırılır, paket dışıdır.
            12 Eyl 2026'dan beri müşteriye de kapalı, yalnızca yönetici hesabında görünüyor.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Inline editable row ──────────────────────────────────────────────────────

function PriceRow({
  tool,
  onSave,
}: {
  tool: ToolPrice
  onSave: (id: number, price: number, active: boolean) => Promise<void>
}) {
  const [price, setPrice]   = useState(tool.priceMonthly.toString())
  const [active, setActive] = useState(tool.isActive)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)

  const handlePriceChange = (v: string) => { setPrice(v);  setDirty(true) }
  const handleActiveChange = (v: boolean) => { setActive(v); setDirty(true) }

  const handleSave = async () => {
    const numPrice = parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0) return
    setSaving(true)
    try {
      await onSave(tool.id, numPrice, active)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const icon = TOOL_ICONS[tool.toolId] ?? '🔧'

  return (
    <tr className="border-b border-[#F0EFE9] last:border-b-0 hover:bg-[#FAFAF7] transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[15px] shrink-0">{icon}</span>
          <div>
            <p className="text-[13px] font-medium text-[#1C1B19]">{tool.toolName}</p>
            <p className="text-[11px] text-[#9A9792] font-mono">{tool.toolId}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5 w-36">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-[#9A9792]">₺</span>
          <input
            type="number"
            min={0}
            max={9999}
            step={1}
            value={price}
            onChange={e => handlePriceChange(e.target.value)}
            className="w-20 px-2.5 py-1 rounded-lg border border-[#D3D1C7] text-[13px] font-medium text-[#1C1B19] text-right focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 bg-white tabular-nums"
          />
          <span className="text-[11px] text-[#9A9792]">/ay</span>
        </div>
      </td>

      <td className="px-5 py-3.5 w-24">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="switch"
            aria-checked={active}
            tabIndex={0}
            onClick={() => handleActiveChange(!active)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleActiveChange(!active)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/40 ${
              active ? 'bg-[#1D9E75]' : 'bg-[#D3D1C7]'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              active ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
          <span className={`text-[12px] font-medium ${active ? 'text-[#085041]' : 'text-[#9A9792]'}`}>
            {active ? 'Aktif' : 'Pasif'}
          </span>
        </label>
      </td>

      <td className="px-5 py-3.5 w-36">
        <span className="text-[11px] text-[#9A9792]">
          {new Date(tool.updatedAt).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>
      </td>

      <td className="px-5 py-3.5 w-24 text-right">
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {saving ? '⏳' : 'Kaydet'}
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminAracFiyatlariPage() {
  const queryClient = useQueryClient()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: prices, isLoading } = useQuery<ToolPrice[]>({
    queryKey: ['admin-tool-prices'],
    queryFn: () =>
      api.get<{ success: boolean; data: ToolPrice[] }>('/admin/tool-prices')
         .then((r: { data: { success: boolean; data: ToolPrice[] } }) => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: ({ id, priceMonthly, isActive }: { id: number; priceMonthly: number; isActive: boolean }) =>
      api.put(`/admin/tool-prices/${id}`, { priceMonthly, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tool-prices'] })
      setSuccessMsg('Fiyat güncellendi ✓')
      setTimeout(() => setSuccessMsg(null), 2500)
    },
  })

  const handleSave = async (id: number, priceMonthly: number, isActive: boolean) => {
    await mutation.mutateAsync({ id, priceMonthly, isActive })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Title ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-[10px] mb-[4px]">
            <span className="text-[20px] leading-none">🏷️</span>
            <h1 className="text-[16px] font-semibold text-[#1C1B19]">Araç Fiyatları</h1>
          </div>
          <p className="text-[13px] text-[#6B6963]">
            Tekil araç satın alımı fiyatları ve maliyet analizi
          </p>
        </div>
        {successMsg && (
          <span className="text-[12px] font-medium text-[#085041] bg-[#E6F9F2] border border-[#9FE1CB] px-3 py-1.5 rounded-lg">
            {successMsg}
          </span>
        )}
      </div>

      {/* ── Maliyet Analizi ── */}
      <MaliyetPaneli prices={prices} />

      {/* ── Info banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
        💡 <strong>Not:</strong> Bu fiyatlar "Araç Satın Al" sayfasında görünür. Pasif araçlar satın alınamaz.
        Paket aboneliği fiyatları için{' '}
        <span className="font-medium">Paket İşlemleri</span> sayfasını kullanın.
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-[1px] p-4">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="h-12 bg-[#F7F6F2] rounded animate-pulse mb-1" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E2E0D8]">
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Araç</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Aylık Standart Paket Fiyatı</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Durum</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Son Güncelleme</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(prices ?? []).map(tool => (
                <PriceRow key={tool.id} tool={tool} onSave={handleSave} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
