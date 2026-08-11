import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useToolUsage } from '@/hooks/useToolUsage'
import { ToolCard } from '@/components/ui/ToolCard'
import { TOOLS, TOOL_CATEGORIES } from '@/lib/tools'
import api from '@/lib/api'
import type { ToolId } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  plan: string
  planName: string
  usagePerToolPerMonth: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = Object.keys(TOOL_CATEGORIES) as Array<keyof typeof TOOL_CATEGORIES>

const CATEGORY_ICONS: Record<string, string> = {
  analiz: '📊',
  icerik: '✍️',
  satis:  '💬',
  video:  '🎬',
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`flex items-center justify-center w-6 h-6 rounded-full bg-white border border-[#D3D1C7] shadow-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-[#3A3935]">
        <path d="M3.5 5.5L8 10L12.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user }  = useAuthStore()
  const navigate  = useNavigate()
  const { data: usages, isLoading } = useToolUsage()

  // All categories expanded by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, true]))
  )

  const toggleCategory = (cat: string) =>
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }))

  // Subscription for plan banner
  const { data: sub } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
    enabled: !user?.isAdmin,
  })

  const getUsage = (toolId: ToolId) => {
    const u = usages?.find((u) => u.toolId === toolId)
    return { used: u?.usedCount ?? 0, limit: u?.limit ?? 3 }
  }

  const firstName = user?.name?.split(' ')[0] ?? 'kullanıcı'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  // Plan banner data
  const planName   = user?.isAdmin ? 'Admin (Sınırsız)' : (sub?.planName ?? 'Ücretsiz Plan')
  const planDetail = user?.isAdmin
    ? 'Tüm araçlara sınırsız erişim'
    : sub?.usagePerToolPerMonth == null
      ? 'Tüm araçlara sınırsız erişim'
      : `Her araç için ayda ${sub.usagePerToolPerMonth} kullanım hakkı`

  return (
    <div className="w-full max-w-6xl px-4 py-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-gray-500 text-sm">
          Dijital pazarlama araçlarınız hazır. Hangi işi halledelim bugün?
        </p>
      </div>

      {/* ── Plan banner ── */}
      <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-[#1D9E75]/10 to-[#1D9E75]/5 border border-[#1D9E75]/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-sm font-semibold text-[#1D9E75]">{planName}</span>
            <p className="text-xs text-gray-600 mt-0.5">{planDetail}</p>
          </div>
          {!user?.isAdmin && (
            <button
              onClick={() => navigate('/hesabim/paket-sec')}
              className="text-sm font-medium text-[#1D9E75] hover:underline transition-colors"
            >
              Planı Yükselt →
            </button>
          )}
        </div>
      </div>

      {/* ── Tools by category ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {CATEGORIES.map((cat) => {
            const catTools  = TOOLS.filter((t) => t.category === cat)
            const isOpen    = expanded[cat] ?? true
            const catLabel  = TOOL_CATEGORIES[cat]
            const catIcon   = CATEGORY_ICONS[cat] ?? '📦'

            return (
              <section key={cat}>
                {/* Category header — clickable to toggle */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between gap-3 group mb-3 px-4 py-3 rounded-2xl bg-[#F2F1ED] border border-[#E2E0D8] hover:bg-[#EDECEA] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{catIcon}</span>
                    <span className="text-sm font-bold uppercase tracking-widest text-[#3A3935] group-hover:text-[#1C1B19] transition-colors">
                      {catLabel}
                    </span>
                    <span className="text-xs text-[#9A9792] font-normal normal-case tracking-normal">
                      ({catTools.length} araç)
                    </span>
                  </div>
                  <Chevron open={isOpen} />
                </button>

                {/* Tool grid — animated collapse */}
                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catTools.map((tool) => {
                      const { used, limit } = getUsage(tool.id)
                      return <ToolCard key={tool.id} tool={tool} used={used} limit={limit} />
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
