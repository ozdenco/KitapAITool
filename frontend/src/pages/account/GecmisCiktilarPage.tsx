import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'
import { ciktiyiAyristir } from '@/lib/ciktiAyristir'
import { PrintButton } from '@/components/ui/PrintButton'
import { CiktiBasligi } from '@/components/ui/CiktiBasligi'
import { HataSiniri } from '@/components/ui/HataSiniri'
import { CiktiGovdesi } from '@/components/ui/CiktiGovdesi'
import { FormBilgileriKarti } from '@/components/ui/FormBilgileriKarti'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultSummary {
  id: string
  toolId: string
  inputSummary: string
  createdAt: string
}

interface ResultDetail extends ResultSummary {
  outputJson: string
  /** Çıktının üretildiği form girdileri (JSON) — eski kayıtlarda yok. */
  formBilgileri?: string | null
}

// ─── Tool meta lookup ─────────────────────────────────────────────────────────

const TOOL_META: Record<string, { name: string; icon: string }> = Object.fromEntries(
  TOOLS.map((t) => [t.id, { name: t.name, icon: t.icon }]),
)

function getToolMeta(toolId: string) {
  return TOOL_META[toolId] ?? { name: toolId, icon: '🔧' }
}
// Çıktı gövdesi ortak bileşene taşındı — yönetici Rapor Detayı sayfası da
// aynısını kullanıyor (bkz. components/ui/CiktiGovdesi.tsx).


// ─── Expanded result panel ────────────────────────────────────────────────────

function ResultDetailPanel({ result: summary, onClose }: { result: ResultSummary; onClose: () => void }) {
  const queryClient = useQueryClient()
  /*
   * İki aşamalı silme: ilk tık uyarıyı açar, ikinci tık siler. Tarayıcının
   * confirm() kutusu yerine satır içi uyarı tercih edildi — kullanıcı neyi
   * sildiğini ekranda görmeye devam ediyor ve uyarı Türkçe.
   */
  const [silmeOnayi, setSilmeOnayi] = useState(false)

  const silme = useMutation({
    mutationFn: () => api.delete(`/tools/results/${summary.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tool-results'] })
      onClose()
    },
  })

  const { data, isLoading, isError } = useQuery<ResultDetail>({
    queryKey: ['tool-result', summary.id],
    queryFn: () => api.get(`/tools/results/${summary.id}`).then((r) => r.data?.data ?? r.data),
  })

  const [showRaw, setShowRaw] = useState(false)

  /*
   * TÜM HOOK'LAR ERKEN ÇIKIŞLARDAN ÖNCE ÇAĞRILMALI.
   *
   * Bu ref aşağıda, `if (isLoading) return ...` satırlarının ALTINDA
   * duruyordu. İlk render'da fonksiyon erken dönüyor (2 hook), veri
   * gelince devam ediyor (3 hook) — React "Rendered more hooks than
   * during the previous render" hatası verip tüm ağacı çökertiyordu.
   * Kullanıcı her kayıt açışında bembeyaz sayfa görüyordu (7 Eyl 2026).
   */
  const ciktiRef = useRef<HTMLDivElement>(null)

  const meta = getToolMeta(summary.toolId)

  if (isLoading) {
    return <div className="mt-3 p-4 bg-[#F7F6F2] rounded-xl animate-pulse h-40" />
  }

  if (isError || !data) {
    return (
      <div className="mt-3 p-4 bg-red-50 rounded-xl text-[13px] text-red-600">
        Detaylar yüklenemedi. Lütfen tekrar deneyin.
      </div>
    )
  }

  const { parsed, kesilmis } = ciktiyiAyristir(data.outputJson)

  const handlePrint = () => {
    const prev = document.title
    document.title = `${meta.name}_Sonuç`
    document.body.setAttribute('data-printing-result', 'true')
    const restore = () => {
      document.body.removeAttribute('data-printing-result')
      document.title = prev
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  return (
    <div className="mt-3 bg-[#F7F6F2] rounded-xl border border-[#E2E0D8] overflow-hidden">
      {/* Detail header */}
      <div className="px-5 py-3 bg-white border-b border-[#E2E0D8] flex items-center gap-3">
        <span className="text-[20px] leading-none">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1C1B19]">{meta.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F7F6F2]"
          >
            {showRaw ? '📋 Biçimlendirilmiş' : '{ } JSON'}
          </button>
          <PrintButton
            onPrint={handlePrint}
            boyut="kompakt"
            pdfHedefi={() => ciktiRef.current}
            pdfDosyaAdi={`${meta.name}_${formatDate(data.createdAt)}`}
          />
          <button
            onClick={() => setSilmeOnayi((v) => !v)}
            className="text-[11px] text-[#9A9792] hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            🗑 Sil
          </button>
          <button
            onClick={onClose}
            className="text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F7F6F2]"
          >
            ✕ Kapat
          </button>
        </div>
      </div>

      {silmeOnayi && (
        <div className="px-5 py-3.5 bg-[#FFF5F5] border-b border-[#F3C9C9] no-print">
          <p className="text-[12.5px] text-[#9B2C2C] leading-relaxed mb-2.5">
            <strong>Bu çıktı kalıcı olarak silinecek.</strong> Silinen çıktıya bir daha
            erişemezsiniz; geri alınamaz. Saklamak istiyorsanız önce PDF olarak indirin.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => silme.mutate()}
              disabled={silme.isPending}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold bg-[#C53030] text-white hover:bg-[#9B2C2C] transition-colors disabled:opacity-50"
            >
              {silme.isPending ? 'Siliniyor…' : 'Evet, kalıcı olarak sil'}
            </button>
            <button
              onClick={() => setSilmeOnayi(false)}
              className="px-3.5 py-1.5 rounded-lg text-[12px] border border-[#D3D1C7] text-[#3A3935] hover:bg-white transition-colors"
            >
              Vazgeç
            </button>
            {silme.isError && (
              <span className="text-[11px] text-[#C53030]">Silinemedi, tekrar deneyin.</span>
            )}
          </div>
        </div>
      )}

      {/* Detail content — .gecmis-print-target: targeted @media print */}
      <div ref={ciktiRef} className="p-5 gecmis-print-target">
        <CiktiBasligi aracAdi={meta.name} tarih={formatDate(data.createdAt)} />
        {showRaw ? (
          <pre className="text-[11px] text-[#3A3935] bg-white border border-[#E2E0D8] rounded-xl p-4 overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
            {/*
              KORUMASIZ JSON.parse'dı — geçersiz JSON kaydında sayfayı
              komple çökertiyordu. Artık yukarıda güvenli çözümlenen
              `parsed` kullanılıyor, o da başarısızsa ham metin basılıyor.
            */}
            {parsed !== null ? JSON.stringify(parsed, null, 2) : data.outputJson}
          </pre>
        ) : parsed !== null ? (
          <HataSiniri baslik={data.toolId}>
            <FormBilgileriKarti ham={data.formBilgileri} />
            <CiktiGovdesi
              toolId={data.toolId}
              parsed={parsed}
              kesilmis={kesilmis}
              olusturmaTarihi={data.createdAt}
              sonucId={data.id}
              isletmeAdi={data.inputSummary}
            />
          </HataSiniri>
        ) : (
          <p className="text-[13px] text-[#3A3935] whitespace-pre-wrap leading-relaxed">
            {data.outputJson}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Date formatter ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const DATE_OPTIONS = [
  { value: 'all', label: 'Tüm zamanlar' },
  { value: '7d',  label: 'Son 7 gün'   },
  { value: '30d', label: 'Son 30 gün'  },
  { value: '90d', label: 'Son 3 ay'    },
]

interface FilterBarProps {
  search:        string
  filterTool:    string
  filterDate:    string
  onSearch:      (v: string) => void
  onFilterTool:  (v: string) => void
  onFilterDate:  (v: string) => void
  totalCount:    number
  filteredCount: number
}

function FilterBar({
  search, filterTool, filterDate,
  onSearch, onFilterTool, onFilterDate,
  totalCount, filteredCount,
}: FilterBarProps) {
  const isFiltered = search.trim() || filterTool !== 'all' || filterDate !== 'all'
  const clearAll = () => { onSearch(''); onFilterTool('all'); onFilterDate('all') }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9792] text-sm">🔍</span>
        <input
          type="text"
          placeholder="İşletme adı veya içerik ara…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#D3D1C7] rounded-xl bg-[#FAFAF8] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
        />
      </div>

      {/* Tool + Date filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Tool filter */}
        <select
          value={filterTool}
          onChange={(e) => onFilterTool(e.target.value)}
          className="text-[12px] px-3 py-1.5 border border-[#D3D1C7] rounded-xl bg-white text-[#3A3935] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
        >
          <option value="all">Tüm araçlar</option>
          {TOOLS.map((t) => (
            <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
          ))}
        </select>

        {/* Date filter chips */}
        <div className="flex gap-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterDate(opt.value)}
              className={`text-[11px] px-3 py-1.5 rounded-xl border transition-colors ${
                filterDate === opt.value
                  ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041] font-semibold'
                  : 'border-[#D3D1C7] bg-white text-[#6B6963] hover:border-[#B4B2A9]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Count + clear */}
        <div className="ml-auto flex items-center gap-3">
          {isFiltered && (
            <span className="text-[11px] text-[#6B6963]">
              {filteredCount} / {totalCount} kayıt
            </span>
          )}
          {isFiltered && (
            <button
              onClick={clearAll}
              className="text-[11px] text-[#9A9792] hover:text-red-500 transition-colors"
            >
              ✕ Filtreleri temizle
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GecmisCiktilarPage() {
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [filterTool,  setFilterTool]  = useState('all')
  const [filterDate,  setFilterDate]  = useState('all')

  const { data: results, isLoading } = useQuery<ResultSummary[]>({
    queryKey: ['tool-results'],
    // Sunucu varsayılanı artık tamamını döndürüyor (eskiden 50 ile sınırlıydı)
    queryFn: () => api.get('/tools/results').then((r) => r.data?.data ?? r.data ?? []),
  })

  // Client-side filtering
  const filtered = useMemo(() => {
    if (!results) return []
    const now = Date.now()
    const q   = search.trim().toLowerCase()

    return results.filter((r) => {
      // Tool filter
      if (filterTool !== 'all' && r.toolId !== filterTool) return false

      // Date filter
      if (filterDate !== 'all') {
        const ageDays = (now - new Date(r.createdAt).getTime()) / 86_400_000
        if (filterDate === '7d'  && ageDays > 7)  return false
        if (filterDate === '30d' && ageDays > 30) return false
        if (filterDate === '90d' && ageDays > 90) return false
      }

      // Text search
      if (q) {
        const meta = getToolMeta(r.toolId)
        return (
          r.inputSummary.toLowerCase().includes(q) ||
          meta.name.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [results, filterTool, filterDate, search])

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📋</span>
          <h1 className="text-[16px] font-medium text-[#1C1B19]">Geçmiş Çıktılarım</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Çalıştırdığınız araçların kayıtlı sonuçlarına ulaşın</p>
      </div>

      {/* ── Filter bar (only when data loaded) ── */}
      {!isLoading && results && results.length > 0 && (
        <FilterBar
          search={search}
          filterTool={filterTool}
          filterDate={filterDate}
          onSearch={setSearch}
          onFilterTool={setFilterTool}
          onFilterDate={setFilterDate}
          totalCount={results.length}
          filteredCount={filtered.length}
        />
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
          ))}
        </div>
      ) : !results || results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-10 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-[14px] font-medium text-[#3A3935]">Henüz kayıtlı çıktı yok</p>
          <p className="text-[12px] text-[#9A9792] mt-1">Araçları kullandıkça sonuçlarınız burada görünecek</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[14px] font-medium text-[#3A3935]">Sonuç bulunamadı</p>
          <p className="text-[12px] text-[#9A9792] mt-1">Farklı filtre veya arama deneyebilirsiniz</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => {
            const meta  = getToolMeta(r.toolId)
            const isOpen = expandedId === r.id

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(r.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#F7F6F2] transition-colors text-left"
                >
                  <span className="text-[22px] leading-none shrink-0">{meta.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1C1B19]">{meta.name}</p>
                    <p className="text-[11px] text-[#9A9792] mt-0.5">{formatDate(r.createdAt)}</p>
                  </div>

                  <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#D3D1C7] bg-[#F7F6F2] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-[#6B6963]">
                      <path d="M3.5 5.5L8 10L12.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5">
                    <ResultDetailPanel result={r} onClose={() => setExpandedId(null)} />
                  </div>
                )}
              </div>
            )
          })}

          {results.length >= 50 && (
            <p className="text-center text-[12px] text-[#9A9792]">Son 50 kayıt gösteriliyor</p>
          )}
        </div>
      )}
    </div>
  )
}
