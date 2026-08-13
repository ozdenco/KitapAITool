import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'
import { ToolOutputRenderer } from '@/components/ui/ToolOutputRenderer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultDetail {
  id: string
  toolId: string
  inputSummary: string
  outputJson: string
  createdAt: string
  userId: string
  name: string
  email: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOOL_META = Object.fromEntries(TOOLS.map((t) => [t.id, { name: t.name, icon: t.icon }]))

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  )
}

function parseOutput(outputJson: string): Record<string, unknown> | null {
  try {
    let raw = JSON.parse(outputJson) as Record<string, unknown> | Record<string, unknown>[]
    if (Array.isArray(raw) && raw.length === 1) raw = raw[0]
    let parsed = raw as Record<string, unknown>

    if (parsed && 'content' in parsed) {
      const content = (parsed as { content: unknown }).content
      if (Array.isArray(content) && content[0] && typeof (content[0] as { text?: string }).text === 'string') {
        try {
          const inner = JSON.parse((content[0] as { text: string }).text) as Record<string, unknown>
          const extras: Record<string, unknown> = {}
          for (const k of Object.keys(parsed)) {
            if (k !== 'content') extras[k] = (parsed as Record<string, unknown>)[k]
          }
          parsed = { ...inner, ...extras }
        } catch { /* keep raw parsed */ }
      }
    }
    return parsed
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminRaporDetayPage() {
  const { resultId } = useParams<{ resultId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery<ResultDetail>({
    queryKey: ['admin-result', resultId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ResultDetail }>(
        `/admin/results/${resultId}`
      )
      if (!res.data.success) throw new Error('Rapor yüklenemedi')
      return res.data.data
    },
    enabled: !!resultId,
  })

  const tool   = data ? (TOOL_META[data.toolId] ?? { name: data.toolId, icon: '🔧' }) : null
  const parsed = data ? parseOutput(data.outputJson) : null

  const handlePrint = () => {
    if (!data || !tool) return
    const prev = document.title
    document.title = `${tool.name}_${data.name}_Rapor`
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
    <div className="w-full max-w-4xl mx-auto px-4 py-8">

      {/* ── Geri butonu ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[13px] text-[#6B6963] hover:text-[#1C1B19] mb-5 transition-colors no-print"
      >
        ← Kullanım Raporuna Dön
      </button>

      {/* ── Yükleniyor ── */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="h-20 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
        </div>
      )}

      {/* ── Hata ── */}
      {isError && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
          <p className="text-[14px] font-medium text-red-700">Rapor yüklenemedi</p>
          <p className="text-[12px] text-red-500 mt-1">Kayıt bulunamıyor ya da erişim yetkiniz yok.</p>
        </div>
      )}

      {/* ── İçerik ── */}
      {data && tool && (
        <>
          {/* Başlık kartı */}
          <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 mb-4 no-print">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[28px] leading-none">{tool.icon}</span>
                <div>
                  <h1 className="text-[18px] font-semibold text-[#1C1B19]">{tool.name}</h1>
                  <p className="text-[12px] text-[#6B6963] mt-0.5">
                    <strong className="text-[#3A3935]">{data.name}</strong>
                    {' '}·{' '}
                    <span className="text-[#9A9792]">{data.email}</span>
                  </p>
                  <p className="text-[11px] text-[#9A9792] mt-0.5">{formatDateTime(data.createdAt)}</p>
                </div>
              </div>

              <button
                onClick={handlePrint}
                className="shrink-0 flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl border border-[#D3D1C7] bg-white text-[#6B6963] hover:bg-[#F7F6F2] transition-colors"
              >
                🖨️ Yazdır / PDF
              </button>
            </div>
          </div>

          {/* Rapor içeriği */}
          <div className="bg-[#F7F6F2] rounded-2xl border border-[#E2E0D8] overflow-hidden">
            <div className="p-5 gecmis-print-target">
              {parsed !== null ? (
                <ToolOutputRenderer toolId={data.toolId} data={parsed} />
              ) : (
                <pre className="text-[11px] text-[#3A3935] bg-white border border-[#E2E0D8] rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {data.outputJson}
                </pre>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
