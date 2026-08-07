import { useAuthStore } from '@/store/auth'
import { useToolUsage } from '@/hooks/useToolUsage'
import { ToolCard } from '@/components/ui/ToolCard'
import { TOOLS, TOOL_CATEGORIES } from '@/lib/tools'
import type { ToolId } from '@/types'

const CATEGORIES = Object.keys(TOOL_CATEGORIES) as Array<keyof typeof TOOL_CATEGORIES>

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: usages, isLoading } = useToolUsage()

  const getUsage = (toolId: ToolId) => {
    const u = usages?.find((u) => u.toolId === toolId)
    return { used: u?.usedCount ?? 0, limit: u?.limit ?? 3 }
  }

  const firstName = user?.name?.split(' ')[0] ?? 'kullanıcı'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-gray-500 text-sm">
          Dijital pazarlama araçlarınız hazır. Hangi işi halledelim bugün?
        </p>
      </div>

      {/* Plan banner */}
      <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-[#1D9E75]/10 to-[#1D9E75]/5 border border-[#1D9E75]/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-sm font-semibold text-[#1D9E75]">Ücretsiz Plan</span>
            <p className="text-xs text-gray-600 mt-0.5">Her araç için ayda 3 kullanım hakkı</p>
          </div>
          <button className="text-sm font-medium text-[#1D9E75] hover:underline">
            Planı Yükselt →
          </button>
        </div>
      </div>

      {/* Tools by category */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {CATEGORIES.map((cat) => {
            const catTools = TOOLS.filter((t) => t.category === cat)
            return (
              <section key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  {TOOL_CATEGORIES[cat]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catTools.map((tool) => {
                    const { used, limit } = getUsage(tool.id)
                    return <ToolCard key={tool.id} tool={tool} used={used} limit={limit} />
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
