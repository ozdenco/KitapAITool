import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { useToolUsage } from '@/hooks/useToolUsage'
import { useAuthStore } from '@/store/auth'
import { TOOLS } from '@/lib/tools'
import type { ApiResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  plan: string
  planName: string
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  previousPlan?: string
  startedAt: string
  expiresAt: string | null
  usagePerToolPerMonth: number | null
  autoRenew: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-[#F2F1ED] text-[#6B6963] border border-[#D3D1C7]',
  standard:   'bg-blue-50 text-blue-700 border border-blue-200',
  premium:    'bg-violet-50 text-violet-700 border border-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 border border-amber-200',
  admin:      'bg-[#E6F9F2] text-[#085041] border border-[#9FE1CB]',
}

// ─── AutoRenew Toggle ─────────────────────────────────────────────────────────

function AutoRenewToggle({ value, onChange, disabled }: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/40 disabled:opacity-50 ${
        value ? 'bg-[#1D9E75]' : 'bg-[#D3D1C7]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AbonelikPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: sub, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
  })

  const { data: usages } = useToolUsage()

  const autoRenewMutation = useMutation({
    mutationFn: (autoRenew: boolean) =>
      api.put('/subscriptions/me/auto-renew', { autoRenew }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  const isExpired  = sub?.status === 'expired'
  const isActive   = sub?.status === 'active'
  const planKey    = user?.isAdmin ? 'admin' : (sub?.plan ?? 'free')
  const toolLimit  = user?.isAdmin ? null : (sub?.usagePerToolPerMonth ?? 3)
  const totalUsed  = usages?.reduce((s, u) => s + u.usedCount, 0) ?? 0
  const isFreeOrExpired = planKey === 'free' || isExpired
  // Expired/free plan: show per-tool stats (not misleading totals)
  const totalLimit = toolLimit != null ? (isFreeOrExpired ? toolLimit : TOOLS.length * toolLimit) : null
  const totalRem   = totalLimit != null
    ? (isFreeOrExpired ? Math.max(0, toolLimit! - Math.max(...(usages?.map(u => u.usedCount) ?? [0]))) : Math.max(0, TOOLS.length * toolLimit! - totalUsed))
    : null
  const badgeCls   = PLAN_BADGE[planKey] ?? PLAN_BADGE.free

  if (subLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-7 w-52 bg-[#E2E0D8] rounded animate-pulse" />
        <div className="h-32 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
        <div className="h-24 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📦</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Paket Bilgilerim</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Aktif paketiniz ve kullanım detaylarınız</p>
      </div>

      {/* ── Süresi doldu uyarısı ── */}
      {isExpired && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-[20px] shrink-0">⏰</span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-amber-900 mb-1">
                {sub?.previousPlan ? `${sub.previousPlan} Paketiniz` : 'Paketiniz'} Sona Erdi
              </p>
              <p className="text-[12px] text-amber-800 mb-3">
                Ücretsiz plana geçildi — araç başına 3 kullanım hakkınız var. İstediğiniz zaman yeni paket satın alabilir veya tekil araç aboneliği yapabilirsiniz.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link
                  to="/hesabim/paket-sec"
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
                >
                  📦 Paket Satın Al
                </Link>
                <Link
                  to="/hesabim/araclarim"
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-white border border-[#D3D1C7] text-[#3A3935] hover:bg-[#F7F6F2] transition-colors"
                >
                  🔧 Araç Satın Al
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan kartı ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        {/* Başlık satırı: plan badge + otomatik yenileme */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${badgeCls}`}>
              {toolLimit == null && <span>∞</span>}
              {sub?.planName ?? (user?.isAdmin ? 'Admin' : 'Ücretsiz')} Paketi
            </span>
            {isExpired && (
              <span className="text-[12px] text-amber-600 font-medium">Süresi Doldu</span>
            )}
            {sub?.expiresAt && (
              <span className={`text-[12px] ${isExpired ? 'text-amber-600 font-medium' : 'text-[#9A9792]'}`}>
                {isExpired ? 'Bitti: ' : 'Bitiş: '}
                {new Date(sub.expiresAt).toLocaleDateString('tr-TR')}
              </span>
            )}
            {user?.isAdmin && (
              <span className="text-[12px] font-semibold text-[#1D9E75]">Admin Hesabı</span>
            )}
          </div>

          {/* Otomatik yenileme — aktif paket için yanında göster */}
          {!user?.isAdmin && sub && sub.plan !== 'free' && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[12px] font-medium text-[#1C1B19]">Otomatik Yenileme</p>
                <p className="text-[11px] text-[#9A9792]">
                  {sub.autoRenew ? 'Açık' : 'Kapalı'}
                </p>
              </div>
              <AutoRenewToggle
                value={sub.autoRenew}
                onChange={(v) => autoRenewMutation.mutate(v)}
                disabled={autoRenewMutation.isPending}
              />
            </div>
          )}
        </div>

        {/* Açıklama — sadece toggle varsa göster */}
        {!user?.isAdmin && sub && sub.plan !== 'free' && (
          <p className="mt-3 text-[11px] text-[#9A9792]">
            {isExpired
              ? (sub.autoRenew
                  ? '✅ Yeni paket alındığında otomatik yenileme aktif olacak'
                  : 'ℹ️ Yeni paket alındığında devre dışı kalacak')
              : (sub.autoRenew
                  ? '✅ Paket bitiş tarihinde otomatik olarak yenilenir ve başarı/hata durumunda e-posta alırsınız'
                  : 'ℹ️ Paket bittikten sonra ücretsiz plana geçilecek')}
          </p>
        )}
      </div>

      {/* ── İstatistik row ── */}
      <div className="grid grid-cols-3 gap-3">
        {isFreeOrExpired ? (
          // Free/expired: show per-tool stats (3 per tool) — clearer than "33 total"
          <>
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
              <p className="text-[11px] text-[#9A9792] mb-1">Bu Ay Kullanılan</p>
              <p className={`text-[26px] font-bold ${totalUsed > 0 ? 'text-[#1D9E75]' : 'text-[#1C1B19]'}`}>{totalUsed}</p>
              <p className="text-[10px] text-[#9A9792]">tüm araçlar</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
              <p className="text-[11px] text-[#9A9792] mb-1">Hak / Araç</p>
              <p className="text-[26px] font-bold text-[#1C1B19]">3</p>
              <p className="text-[10px] text-[#9A9792]">ücretsiz plan</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
              <p className="text-[11px] text-[#9A9792] mb-1">Kalan / Araç</p>
              <p className="text-[26px] font-bold text-[#1C1B19]">{totalRem ?? 3}</p>
              <p className="text-[10px] text-[#9A9792]">bu ay</p>
            </div>
          </>
        ) : (
          // Paid plan: show totals
          <>
            {[
              { label: 'Bu Ay Kullanılan', value: String(totalUsed),      sub: 'tüm araçlar',  highlight: totalUsed > 0 },
              { label: 'Toplam Hak',       value: totalLimit == null ? '∞' : String(totalLimit), sub: `${toolLimit}/araç`, highlight: false },
              { label: 'Kalan Hak',        value: totalRem   == null ? '∞' : String(totalRem),   sub: 'bu ay',            highlight: false },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
                <p className="text-[11px] text-[#9A9792] mb-1">{label}</p>
                <p className={`text-[26px] font-bold ${highlight ? 'text-[#1D9E75]' : 'text-[#1C1B19]'}`}>{value}</p>
                <p className="text-[10px] text-[#9A9792]">{sub}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Araç kullanımı linki ── */}
      <Link
        to="/hesabim/arac-kullanim"
        className="flex items-center justify-between bg-white rounded-2xl border border-[#E2E0D8] px-5 py-4 hover:bg-[#FAFAF7] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-[20px]">📊</span>
          <div>
            <p className="text-[13px] font-medium text-[#1C1B19]">Araç Başına Kullanım</p>
            <p className="text-[12px] text-[#9A9792]">Her araç için bu ayki kullanım detayı</p>
          </div>
        </div>
        <span className="text-[#9A9792] group-hover:text-[#1D9E75] transition-colors text-lg">→</span>
      </Link>
    </div>
  )
}
