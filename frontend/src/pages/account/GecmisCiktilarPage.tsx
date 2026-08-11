import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'

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
    return (
      <span className="font-semibold text-[#1D9E75] text-[15px]">{value}</span>
    )
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
          <div
            key={i}
            className="pl-3 border-l-2 border-[#E2E0D8]"
          >
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

// Translate common AI output field keys to Turkish
const KEY_LABELS: Record<string, string> = {
  score: 'Skor',
  level: 'Seviye',
  summary: 'Özet',
  items: 'Değerlendirmeler',
  ctaText: 'Öneri',
  name: 'Ad',
  desc: 'Açıklama',
  description: 'Açıklama',
  badge: 'Etiket',
  status: 'Durum',
  icon: 'İkon',
  title: 'Başlık',
  text: 'Metin',
  content: 'İçerik',
  platform: 'Platform',
  budget: 'Bütçe',
  percentage: 'Yüzde',
  amount: 'Tutar',
  reason: 'Neden',
  action: 'Aksiyon',
  priority: 'Öncelik',
  days: 'Günler',
  week: 'Hafta',
  posts: 'Gönderiler',
  tip: 'İpucu',
  recommendation: 'Öneri',
  message: 'Mesaj',
  script: 'Senaryo',
  subject: 'Konu',
  body: 'İçerik',
  category: 'Kategori',
  type: 'Tür',
  value: 'Değer',
  url: 'Bağlantı',
  link: 'Bağlantı',
  date: 'Tarih',
  time: 'Zaman',
}

function labelFor(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
}

// Priority fields to render first for better readability
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

// ─── Expanded result panel ────────────────────────────────────────────────────

function ResultDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery<ResultDetail>({
    queryKey: ['tool-result', id],
    queryFn: () =>
      api.get(`/tools/results/${id}`).then((r) => r.data?.data ?? r.data),
  })

  const [showRaw, setShowRaw] = useState(false)

  if (isLoading) {
    return (
      <div className="mt-3 p-4 bg-[#F7F6F2] rounded-xl animate-pulse h-40" />
    )
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
    parsed = JSON.parse(data.outputJson)
    // Some tools return content wrapped in an array or have nested structure
    if (Array.isArray(parsed) && parsed.length === 1) {
      parsed = parsed[0] as Record<string, unknown>
    }
    // Handle { content: [{ type: "text", text: "..." }] } format
    if (parsed && typeof parsed === 'object' && 'content' in parsed) {
      const content = (parsed as { content: unknown }).content
      if (Array.isArray(content) && content[0] && typeof (content[0] as { text?: string }).text === 'string') {
        try {
          parsed = JSON.parse((content[0] as { text: string }).text)
        } catch {
          // keep as-is
        }
      }
    }
  } catch {
    // outputJson might be raw text
  }

  return (
    <div className="mt-3 bg-[#F7F6F2] rounded-xl border border-[#E2E0D8] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9A9792]">Çıktı Detayı</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1 rounded-lg hover:bg-white"
          >
            {showRaw ? 'Biçimlendirilmiş Görünüm' : 'Ham JSON'}
          </button>
          <button
            onClick={onClose}
            className="text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1 rounded-lg hover:bg-white"
          >
            ✕ Kapat
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="text-[11px] text-[#3A3935] bg-white border border-[#E2E0D8] rounded-xl p-4 overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
          {JSON.stringify(JSON.parse(data.outputJson), null, 2)}
        </pre>
      ) : parsed !== null ? (
        <OutputObject obj={parsed} depth={0} />
      ) : (
        <p className="text-[13px] text-[#3A3935] whitespace-pre-wrap leading-relaxed">
          {data.outputJson}
        </p>
      )}
    </div>
  )
}

// ─── Date formatter ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GecmisCiktilarPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: results, isLoading } = useQuery<ResultSummary[]>({
    queryKey: ['tool-results'],
    queryFn: () =>
      api.get('/tools/results').then((r) => r.data?.data ?? r.data ?? []),
  })

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📋</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Geçmiş Çıktılarım</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Çalıştırdığınız araçların kayıtlı sonuçlarına ulaşın</p>
      </div>

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
          <p className="text-[12px] text-[#9A9792] mt-1">
            Araçları kullandıkça sonuçlarınız burada görünecek
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((r) => {
            const meta = getToolMeta(r.toolId)
            const isOpen = expandedId === r.id

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden"
              >
                {/* Card header — clickable */}
                <button
                  type="button"
                  onClick={() => toggleExpand(r.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#F7F6F2] transition-colors text-left"
                >
                  {/* Tool icon */}
                  <span className="text-[22px] leading-none shrink-0">{meta.icon}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-[#1C1B19]">{meta.name}</p>
                      {r.inputSummary && r.inputSummary !== r.toolId && (
                        <span className="text-[12px] text-[#6B6963]">— {r.inputSummary}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9A9792] mt-0.5">{formatDate(r.createdAt)}</p>
                  </div>

                  {/* Chevron */}
                  <span
                    className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#D3D1C7] bg-[#F7F6F2] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-[#6B6963]">
                      <path
                        d="M3.5 5.5L8 10L12.5 5.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5">
                    <ResultDetail
                      id={r.id}
                      onClose={() => setExpandedId(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {results.length >= 50 && (
            <p className="text-center text-[12px] text-[#9A9792]">
              Son 50 kayıt gösteriliyor
            </p>
          )}
        </div>
      )}
    </div>
  )
}
