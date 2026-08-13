import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: number
  type: string
  name: string
  description: string
  priceMonthly: number
  usagePerToolPerMonth: number | null
}

interface Subscription {
  plan: string
  planName: string
  status: string     // 'active' | 'expired'
  expiresAt?: string
}

// ─── Plan feature lists ───────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '3 araç kullanım hakkı / araç / ay',
    'Tüm 11 araca erişim',
    'Temel rapor çıktısı',
    'E-posta desteği',
  ],
  standard: [
    '10 araç kullanım hakkı / araç / ay',
    'Tüm 11 araca erişim',
    'PDF rapor indirme',
    'Yapay zeka destekli analiz',
    'Uygulama kullanım desteği',
  ],
  premium: [
    '25 araç kullanım hakkı / araç / ay',
    'Tüm 11 araca erişim',
    'PDF rapor indirme',
    'Yapay zeka destekli analiz',
    'Öncelikli uygulama desteği',
    'Geçmiş veri analizi',
    'Profesyonel rapor çıktısı',
  ],
  enterprise: [
    'Firmaya özel araç oluşturma',
    'Kullanılacak araçların seçimi',
    'Özel entegrasyonlar',
    'Eğitim ve danışmanlık',
    'Özel geliştirmeler',
    'SLA Garantisi',
    'Özelleştirilebilir raporlar',
    'Özel destek ekibi',
  ],
}

const PLAN_ICONS: Record<string, string> = {
  free:       '🎁',
  standard:   '⭐',
  premium:    '💎',
  enterprise: '🏢',
}

// Abonelik tier sırası — düşük sayı = düşük plan
const PLAN_TIER: Record<string, number> = {
  free:       0,
  standard:   1,
  premium:    2,
  enterprise: 3,
}

const PLAN_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  free:       { bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200' },
  standard:   { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  premium:    { bg: 'bg-[#F0FAF6]',   text: 'text-[#085041]',   border: 'border-[#1D9E75]' },
  enterprise: { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-300' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaketSecPage() {
  const { user } = useAuthStore()

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () =>
      api.get<Plan[]>('/subscriptions/plans').then((r: { data: Plan[] }) => r.data),
  })

  const { data: sub } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
  })

  // Expired abonelik → free plan gibi davran (tüm paketler satın alınabilir)
  const isExpired   = sub?.status === 'expired'
  const currentPlan = user?.isAdmin ? 'admin' : (sub?.plan ?? 'free')

  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const handleUpgrade = async (plan: Plan) => {
    if (plan.type === 'enterprise') {
      window.open('https://kolaykobi.com/iletisim/', '_blank', 'noopener,noreferrer')
      return
    }

    setCheckoutError(null)
    setLoadingPlanId(plan.id)

    try {
      const res = await api.post<{ paymentPageUrl: string; token: string }>(
        '/payments/checkout-form',
        { planId: plan.id }
      )
      // iyzico ödeme sayfasına yönlendir
      window.location.href = res.data.paymentPageUrl
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Ödeme başlatılamadı. Lütfen tekrar deneyin.'
      setCheckoutError(msg)
      setLoadingPlanId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">⬆️</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Paket Seçimi</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">İhtiyacınıza uygun paketi seçin ve araçları kullanmaya başlayın</p>
      </div>

      {/* ── Promo / expired banner ── */}
      {isExpired ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-[13px] text-amber-800">
          ⏰ <strong>Paketiniz sona erdi.</strong>{' '}
          {sub?.expiresAt
            ? `${new Date(sub.expiresAt).toLocaleDateString('tr-TR')} tarihinde`
            : ''}{' '}
          Ücretsiz plana geçildi — yeni paket seçerek devam edebilirsiniz.
        </div>
      ) : (
        <div className="bg-[#1D9E75] text-white rounded-2xl px-5 py-3 text-center text-[13px] font-medium">
          🎉 Yeni aboneliklere özel tanıtım fiyatlarımızdan yararlanın!
        </div>
      )}

      {/* ── Hata mesajı ── */}
      {checkoutError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
          ⚠️ {checkoutError}
        </div>
      )}

      {/* ── Plan cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(plans ?? []).map((plan) => {
            const currentTier   = PLAN_TIER[currentPlan] ?? 0
            const planTier      = PLAN_TIER[plan.type]   ?? 0
            const isActive      = currentPlan === plan.type
            const isDowngrade   = planTier < currentTier          // mevcut plandan düşük
            const isRecommended = plan.type === 'premium'
            const isEnterprise  = plan.type === 'enterprise'
            const badge         = PLAN_BADGE[plan.type] ?? PLAN_BADGE.free
            const features      = PLAN_FEATURES[plan.type] ?? []
            const icon          = PLAN_ICONS[plan.type] ?? '📦'

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 transition-shadow ${
                  isRecommended
                    ? 'border-[#1D9E75] shadow-lg shadow-[#1D9E75]/10'
                    : 'border-[#E2E0D8]'
                } bg-white`}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#1D9E75] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      ÖNERİLEN
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{icon}</span>
                    <h3 className="text-[15px] font-semibold text-[#1C1B19]">{plan.name}</h3>
                    {isActive && (
                      <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} border ${badge.border}`}>
                        Aktif Paket
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    {isEnterprise ? (
                      <span className="text-[22px] font-bold text-[#B45309]">Özel Fiyat</span>
                    ) : (
                      <>
                        <span className="text-[26px] font-bold text-[#1C1B19]">
                          {plan.priceMonthly === 0
                            ? '₺0'
                            : `₺${plan.priceMonthly.toLocaleString('tr-TR')}`}
                        </span>
                        <span className="text-[13px] text-[#9A9792]">/ Ay</span>
                      </>
                    )}
                  </div>

                  {/* Usage summary */}
                  <p className="text-[12px] text-[#6B6963] mt-1">
                    {isEnterprise
                      ? 'İhtiyaç analizi ile başlayın'
                      : plan.usagePerToolPerMonth == null
                        ? 'Sınırsız Kullanım'
                        : `${plan.usagePerToolPerMonth} Kullanım Hakkı / Araç / Ay`}
                  </p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-[#3A3935]">
                      <span className="text-[#1D9E75] font-bold mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isActive ? (
                  // Aktif plan — deaktive
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-[#F7F6F2] border border-[#D3D1C7] text-[#9A9792] cursor-default"
                  >
                    Aktif Paket
                  </button>
                ) : isDowngrade ? (
                  // Mevcut plandan düşük — satın alma engellendi
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-[#F7F6F2] border border-[#D3D1C7] text-[#9A9792] cursor-default"
                  >
                    Paket Süresi Dolunca Seçilebilir
                  </button>
                ) : isEnterprise ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    🤝 İletişime Geç
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={loadingPlanId !== null}
                    className={`w-full py-2.5 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-60 disabled:cursor-wait ${
                      isRecommended
                        ? 'bg-[#1D9E75] text-white hover:bg-[#178a65]'
                        : 'bg-[#1C1B19] text-white hover:bg-[#2C2B27]'
                    }`}
                  >
                    {loadingPlanId === plan.id
                      ? '⏳ Yönlendiriliyor...'
                      : currentPlan !== 'free'
                        ? `⬆️ Yükselt — ₺${plan.priceMonthly.toLocaleString('tr-TR')}`
                        : `🛒 Satın Al — ₺${plan.priceMonthly.toLocaleString('tr-TR')}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Note ── */}
      <p className="text-[12px] text-[#9A9792] text-center">
        Tüm paketler tüm araçlara erişim içerir. Herhangi bir sorunuz için{' '}
        <a href="mailto:destek@kolaykobi.com" className="text-[#1D9E75] hover:underline">
          destek@kolaykobi.com
        </a>{' '}
        adresine yazabilirsiniz.
      </p>
    </div>
  )
}
