import { useQuery } from '@tanstack/react-query'
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

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
  })

  const { data: usages } = useToolUsage()

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

    </div>
  )
}
