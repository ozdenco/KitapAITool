import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToolUsage } from '@/hooks/useToolUsage'
import { UsageBar } from '@/components/ui/UsageBar'
import { Button } from '@/components/ui/Button'
import { TOOLS } from '@/lib/tools'
import type { ToolId } from '@/types'

interface Subscription {
  plan: string
  planName: string
  status: string
  startedAt: string
  expiresAt: string | null
  usagePerToolPerMonth: number | null
}

interface Plan {
  id: number
  type: string
  name: string
  description: string
  priceMonthly: number
  usagePerToolPerMonth: number | null
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  standard: 'bg-blue-50 text-blue-700',
  premium: 'bg-purple-50 text-purple-700',
  enterprise: 'bg-amber-50 text-amber-700',
}

export function HesabimPage() {
  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
  })

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/subscriptions/plans').then((r: { data: Plan[] }) => r.data),
  })

  const { data: usages } = useToolUsage()

  const getUsage = (toolId: ToolId) => {
    const u = usages?.find((u) => u.toolId === toolId)
    return { used: u?.usedCount ?? 0, limit: u?.limit ?? 3 }
  }

  if (subLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  const planColor = PLAN_COLORS[sub?.plan ?? 'free'] ?? PLAN_COLORS.free

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Hesabım</h1>

      {/* Current plan */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Mevcut Plan
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${planColor}`}>
                {sub?.planName ?? 'Ücretsiz'}
              </span>
              <p className="text-gray-600 text-sm">
                {sub?.usagePerToolPerMonth
                  ? `Her araç için ayda ${sub.usagePerToolPerMonth} kullanım hakkı`
                  : 'Her araç için ayda 3 kullanım hakkı'}
              </p>
              {sub?.expiresAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Bitiş: {new Date(sub.expiresAt).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>
            {sub?.plan === 'free' && (
              <Button size="sm" onClick={() => {}}>Planı Yükselt</Button>
            )}
          </div>
        </div>
      </section>

      {/* Usage this month */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Bu Ayki Kullanım
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            {TOOLS.map((tool) => {
              const { used, limit } = getUsage(tool.id)
              return (
                <div key={tool.id} className="flex items-center gap-4">
                  <span className="text-xl w-8 shrink-0">{tool.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tool.name}</p>
                    <UsageBar used={used} limit={limit} className="mt-1" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Available plans */}
      {plans && plans.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Planlar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan: Plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 ${sub?.plan === plan.type
                  ? 'border-[#1D9E75] bg-[#1D9E75]/5'
                  : 'border-gray-200 bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {sub?.plan === plan.type && (
                    <span className="text-xs text-[#1D9E75] font-medium">Aktif</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                <p className="text-lg font-bold text-gray-900 mb-4">
                  {plan.priceMonthly === 0
                    ? 'Ücretsiz'
                    : `₺${plan.priceMonthly.toLocaleString('tr-TR')}/ay`}
                </p>
                {sub?.plan !== plan.type && (
                  <Button size="sm" variant={plan.type === 'premium' ? 'primary' : 'secondary'}>
                    {plan.type === 'free' ? 'Düşür' : 'Seç'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
