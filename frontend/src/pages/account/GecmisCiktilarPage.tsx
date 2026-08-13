import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'
import { ToolOutputRenderer } from '@/components/ui/ToolOutputRenderer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultSummary {
  id: string
  toolId: string
  inputSummary: string
  createdAt: string
}

interface ResultDetail extends ResultSummary {
  outputJson: string
}

// ─── Tool meta lookup ─────────────────────────────────────────────────────────

const TOOL_META: Record<string, { name: string; icon: string }> = Object.fromEntries(
  TOOLS.map((t) => [t.id, { name: t.name, icon: t.icon }]),
)

function getToolMeta(toolId: string) {
  return TOOL_META[toolId] ?? { name: toolId, icon: '🔧' }
}

// ─── JSON output renderer ─────────────────────────────────────────────────────

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-[#9A9792]">—</span>

  if (typeof value === 'number') {
    return <span className="font-semibold text-[#1D9E75] text-[15px]">{value}</span>
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`font-medium ${value ? 'text-[#1D9E75]' : 'text-[#E05252]'}`}>
        {value ? 'Evet' : 'Hayır'}
      </span>
    )
  }

  if (typeof value === 'string') {
    if (value.length > 200) {
      return <p className="text-[13px] text-[#3A3935] leading-relaxed whitespace-pre-wrap">{value}</p>
    }
    return <span className="text-[13px] text-[#3A3935]">{value}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#9A9792] text-[12px]">Boş</span>
    return (
      <div className="flex flex-col gap-2 mt-1">
        {value.map((item, i) => (
          <div key={i} className="pl-3 border-l-2 border-[#E2E0D8]">
            {typeof item === 'object' && item !== null ? (
              <OutputObject obj={item as Record<string, unknown>} depth={depth + 1} />
            ) : (
              renderValue(item, depth + 1)
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    return <OutputObject obj={value as Record<string, unknown>} depth={depth + 1} />
  }

  return <span className="text-[13px] text-[#3A3935]">{String(value)}</span>
}

const KEY_LABELS: Record<string, string> = {
  score: 'Skor', level: 'Seviye', summary: 'Özet', items: 'Değerlendirmeler',
  ctaText: 'Öneri', name: 'Ad', desc: 'Açıklama', description: 'Açıklama',
  badge: 'Etiket', status: 'Durum', icon: 'İkon', title: 'Başlık',
  text: 'Metin', content: 'İçerik', platform: 'Platform', budget: 'Bütçe',
  percentage: 'Yüzde', amount: 'Tutar', reason: 'Neden', action: 'Aksiyon',
  priority: 'Öncelik', days: 'Günler', week: 'Hafta', posts: 'Gönderiler',
  tip: 'İpucu', recommendation: 'Öneri', message: 'Mesaj', script: 'Senaryo',
  subject: 'Konu', body: 'İçerik', category: 'Kategori', type: 'Tür',
  value: 'Değer', url: 'Bağlantı', link: 'Bağlantı', date: 'Tarih',
  time: 'Zaman', ad: 'Ad', guclu: 'Güçlü Yönler', zayif: 'Zayıf Yönler',
  firsat: 'Fırsat', tehdit: 'Tehdit Seviyesi', rakipler: 'Rakipler',
  genel_degerlendirme: 'Genel Değerlendirme', oneriler: 'Öneriler',
}

function labelFor(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
}

const PRIORITY_KEYS = ['score', 'level', 'summary', 'ctaText', 'title', 'name']

function OutputObject({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const keys = Object.keys(obj)
  const prioritized = [
    ...PRIORITY_KEYS.filter((k) => k in obj),
    ...keys.filter((k) => !PRIORITY_KEYS.includes(k)),
  ]

  return (
    <div className={`flex flex-col gap-${depth === 0 ? '4' : '2'}`}>
      {prioritized.map((key) => {
        const val = obj[key]
        const isArray = Array.isArray(val)
        const isObj = typeof val === 'object' && val !== null && !isArray
        const isBigString = typeof val === 'string' && val.length > 80

        return (
          <div key={key} className={depth === 0 ? 'border-b border-[#F2F1ED] pb-4 last:border-0 last:pb-0' : ''}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] mb-1">
              {labelFor(key)}
            </p>
            {(isArray || isObj || isBigString) ? (
              <div className="mt-1">{renderValue(val, depth)}</div>
            ) : (
              renderValue(val, depth)
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Rich renderer with generic fallback ─────────────────────────────────────

// Tool IDs that have a dedicated rich renderer in ToolOutputRenderer.
const RICH_TOOL_IDS = new Set([
  'gorunurluk-skoru', 'musteri-persona', 'icerik-takvimi', 'reklam-butce',
  'whatsapp-satis', 'musteri-geri-donus', 'chatbot-senaryo', 'ai-gorunurluk',
  'viral-video', 'trend-video', 'rakip-analiz',
])

function RichOrFallback({ toolId, parsed }: { toolId: string; parsed: Record<string, unknown> }) {
  if (RICH_TOOL_IDS.has(toolId)) {
    return <ToolOutputRenderer toolId={toolId} data={parsed} />
  }
  return <OutputObject obj={parsed} depth={0} />
}

// ─── Expanded result panel ────────────────────────────────────────────────────

function ResultDetailPanel({ result: summary, onClose }: { result: ResultSummary; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery<ResultDetail>({
    queryKey: ['tool-result', summary.id],
    queryFn: () => api.get(`/tools/results/${summary.id}`).then((r) => r.data?.data ?? r.data),
  })

  const [showRaw, setShowRaw] = useState(false)
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

  let parsed: Record<string, unknown> | null = null
  try {
    let raw = JSON.parse(data.outputJson) as Record<string, unknown> | Record<string, unknown>[]
    if (Array.isArray(raw) && raw.length === 1) raw = raw[0]
    parsed = raw as Record<string, unknown>

    if (parsed && typeof parsed === 'object' && 'content' in parsed) {
      const content = (parsed as { content: unknown }).content
      if (Array.isArray(content) && content[0] && typeof (content[0] as { text?: string }).text === 'string') {
        try {
          const inner = JSON.parse((content[0] as { text: string }).text) as Record<string, unknown>
          // Preserve top-level fields that live alongside content (e.g. geminiPlatforms)
          const extras: Record<string, unknown> = {}
          for (const k of Object.keys(parsed)) {
            if (k !== 'content') extras[k] = parsed[k]
          }
          parsed = { ...inner, ...extras }
        } catch { /* keep raw parsed */ }
      }
    }
  } catch { /* outputJson might be raw text */ }

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
          <button
            onClick={handlePrint}
            className="text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F7F6F2]"
          >
            🖨️ Yazdır
          </button>
          <button
            onClick={onClose}
            className="text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F7F6F2]"
          >
            ✕ Kapat
          </button>
        </div>
      </div>

      {/* Detail content — .gecmis-print-target: targeted @media print */}
      <div className="p-5 gecmis-print-target">
        {showRaw ? (
          <pre className="text-[11px] text-[#3A3935] bg-white border border-[#E2E0D8] rounded-xl p-4 overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
            {JSON.stringify(JSON.parse(data.outputJson), null, 2)}
          </pre>
        ) : parsed !== null ? (
          <RichOrFallback toolId={data.toolId} parsed={parsed} />
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
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Geçmiş Çıktılarım</h1>
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
