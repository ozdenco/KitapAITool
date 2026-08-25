import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useToolUsage } from '@/hooks/useToolUsage'
import { ToolCard } from '@/components/ui/ToolCard'
import { ACTIVE_TOOLS, TOOL_CATEGORIES } from '@/lib/tools'
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
    <svg viewBox="0 0 16 16" fill="none" className={`w-3.5 h-3.5 text-[#C0BDB5] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <path d="M3.5 5.5L8 10L12.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
    <div className="w-full max-w-6xl px-4 py-5">

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[20px] font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <span className="text-[11px] font-semibold text-[#1D9E75] bg-[#E6F9F2] border border-[#9FE1CB] px-2 py-0.5 rounded-full leading-none">
            {planName}
          </span>
          {!user?.isAdmin && (
            <button
              onClick={() => navigate('/hesabim/paket-sec')}
              className="text-[11px] text-[#9A9792] hover:text-[#1D9E75] transition-colors"
            >
              Yükselt →
            </button>
          )}
        </div>
        <p className="mt-1 text-gray-500 text-[13px]">
          Dijital pazarlama araçlarınız hazır. Hangi işi halledelim bugün?
        </p>
      </div>

      {/* ── Tools by category ── Araçlar static data; API yüklenmesini bekleme */}
      <div className="flex flex-col gap-4">
        {CATEGORIES.map((cat) => {
          const catTools  = ACTIVE_TOOLS.filter((t) => t.category === cat)
          const isOpen    = expanded[cat] ?? true
          const catLabel  = TOOL_CATEGORIES[cat]
          const catIcon   = CATEGORY_ICONS[cat] ?? '📦'

          return (
            <section key={cat}>
              {/* Category header — clickable to toggle */}
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2.5 group mb-3"
              >
                <span className="text-[15px] leading-none shrink-0">{catIcon}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6963] group-hover:text-[#1C1B19] transition-colors whitespace-nowrap">
                  {catLabel}
                </span>
                <span className="text-[11px] text-[#C0BDB5] whitespace-nowrap">
                  ({catTools.length})
                </span>
                <div className="flex-1 h-px bg-[#E2E0D8]" />
                <Chevron open={isOpen} />
              </button>

              {/* Tool grid — animated collapse */}
              {isOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catTools.map((tool) => {
                    const { used, limit } = getUsage(tool.id)
                    return <ToolCard key={tool.id} tool={tool} used={used} limit={limit} isLoading={isLoading} />
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
