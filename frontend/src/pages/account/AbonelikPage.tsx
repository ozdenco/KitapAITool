import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToolUsage } from '@/hooks/useToolUsage'
import { UsageBar } from '@/components/ui/UsageBar'
import { useAuthStore } from '@/store/auth'
import { TOOLS } from '@/lib/tools'
import type { ApiResponse, ToolId } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  plan: string
  planName: string
  status: 'active' | 'paused' | 'cancelled' | 'expired'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-[#F2F1ED] text-[#6B6963] border border-[#D3D1C7]',
  standard: 'bg-blue-50 text-blue-700 border border-blue-200',
  premium: 'bg-violet-50 text-violet-700 border border-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 border border-amber-200',
  admin: 'bg-[#E6F9F2] text-[#085041] border border-[#9FE1CB]',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  paused: 'Duraklatıldı',
  cancelled: 'İptal Edildi',
  expired: 'Süresi Doldu',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AbonelikPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
  })

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () =>
      api.get<Plan[]>('/subscriptions/plans').then((r: { data: Plan[] }) => r.data),
  })

  const { data: usages } = useToolUsage()

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.post<ApiResponse>('/subscriptions/cancel').then((r: { data: ApiResponse }) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: () =>
      api.post<ApiResponse>('/subscriptions/pause').then((r: { data: ApiResponse }) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  })

  // Derived stats
  const toolLimit = user?.isAdmin ? null : (sub?.usagePerToolPerMonth ?? 3)
  const totalUsed = usages?.reduce((s, u) => s + u.usedCount, 0) ?? 0
  const totalLimit = toolLimit != null ? (TOOLS.length * toolLimit) : null
  const totalRemaining = totalLimit != null ? Math.max(0, totalLimit - totalUsed) : null

  const getToolUsage = (toolId: ToolId) => {
    const u = usages?.find((u) => u.toolId === toolId)
    return { used: u?.usedCount ?? 0, limit: toolLimit }
  }

  if (subLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-7 w-52 bg-[#E2E0D8] rounded animate-pulse" />
        <div className="h-32 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
        <div className="h-24 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
      </div>
    )
  }

  const planKey = user?.isAdmin ? 'admin' : (sub?.plan ?? 'free')
  const badgeCls = PLAN_BADGE[planKey] ?? PLAN_BADGE.free

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📦</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Paket Bilgilerim</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Aktif paketiniz ve kullanım detaylarınız</p>
      </div>

      {/* ── Current plan card ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${badgeCls}`}>
              {toolLimit == null && <span>∞</span>}
              {sub?.planName ?? (user?.isAdmin ? 'Admin' : 'Ücretsiz')} Paketi
            </span>
            {sub?.status && sub.status !== 'active' && (
              <span className="text-[12px] text-amber-600 font-medium">
                {STATUS_LABEL[sub.status]}
              </span>
            )}
          </div>
          {user?.isAdmin && (
            <span className="text-[15px] font-semibold text-[#1D9E75]">Admin Hesabı</span>
          )}
          {sub?.expiresAt && (
            <span className="text-[12px] text-[#9A9792]">
              Bitiş: {new Date(sub.expiresAt).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Bu Ay Kullanılan',
            value: totalUsed === 0 ? '0' : String(totalUsed),
            highlight: totalUsed > 0,
          },
          {
            label: 'Toplam Hak',
            value: totalLimit == null ? '∞' : String(totalLimit),
            highlight: false,
          },
          {
            label: 'Kalan Hak',
            value: totalRemaining == null ? '∞' : String(totalRemaining),
            highlight: false,
          },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
            <p className="text-[11px] text-[#9A9792] mb-1">{label}</p>
            <p className={`text-[26px] font-bold ${highlight ? 'text-[#1D9E75]' : 'text-[#1C1B19]'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Per-tool usage ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-4">
          Araç Başına Kullanım
        </h2>
        <div className="flex flex-col gap-3">
          {TOOLS.map((tool) => {
            const { used, limit } = getToolUsage(tool.id)
            return (
              <div key={tool.id} className="flex items-center gap-3">
                <span className="text-[18px] w-7 shrink-0 leading-none">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#3A3935] truncate leading-snug">{tool.name}</p>
                  <UsageBar used={used} limit={limit} className="mt-[3px]" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Plan options ── */}
      {plans && plans.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9792] mb-3">
            Paket Seçenekleri
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan: Plan) => {
              const isActive = sub?.plan === plan.type
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-4 ${
                    isActive
                      ? 'border-[#1D9E75] bg-[#F0FAF6]'
                      : 'border-[#E2E0D8] bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[14px] font-semibold text-[#1C1B19]">{plan.name}</h3>
                    {isActive && (
                      <span className="text-[11px] text-[#1D9E75] font-semibold">Aktif</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6B6963] mb-2 leading-snug">{plan.description}</p>
                  <p className="text-[16px] font-bold text-[#1C1B19] mb-3">
                    {plan.priceMonthly === 0
                      ? 'Ücretsiz'
                      : `₺${plan.priceMonthly.toLocaleString('tr-TR')}/ay`}
                  </p>
                  {!isActive && (
                    <button
                      type="button"
                      className={`w-full py-[7px] rounded-lg text-[12px] font-medium transition-colors ${
                        plan.type === 'premium'
                          ? 'bg-[#1D9E75] text-white hover:bg-[#178a65]'
                          : 'bg-[#F7F6F2] border border-[#D3D1C7] text-[#1C1B19] hover:bg-[#EDECE6]'
                      }`}
                    >
                      {plan.priceMonthly < (sub?.usagePerToolPerMonth ?? 0)
                        ? 'Düşür'
                        : 'Yükselt'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Danger zone ── */}
      {sub?.status === 'active' && !user?.isAdmin && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
          <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-3">
            Abonelik Yönetimi
          </h2>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              disabled={pauseMutation.isPending}
              onClick={() => {
                if (confirm('Aboneliğinizi duraklatmak istediğinize emin misiniz?')) {
                  pauseMutation.mutate()
                }
              }}
              className="px-[14px] py-[7px] rounded-lg border border-[#D3D1C7] text-[13px] font-medium text-[#6B6963] bg-white hover:bg-[#F7F6F2] disabled:opacity-50 transition-colors"
            >
              {pauseMutation.isPending ? 'Duraklatılıyor…' : 'Aboneliği Duraklat'}
            </button>
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (confirm('Aboneliğinizi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                  cancelMutation.mutate()
                }
              }}
              className="px-[14px] py-[7px] rounded-lg border border-red-200 text-[13px] font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {cancelMutation.isPending ? 'İptal ediliyor…' : 'Aboneliği İptal Et'}
            </button>
          </div>
          {(cancelMutation.isError || pauseMutation.isError) && (
            <p className="mt-2 text-[12px] text-red-600">İşlem başarısız. Lütfen tekrar deneyin.</p>
          )}
        </div>
      )}
    </div>
  )
}
