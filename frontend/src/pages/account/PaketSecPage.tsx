import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ACTIVE_TOOLS } from '@/lib/tools'

/*
 * Standart/Premium paketlere dahil araçlar — LİSTEDEN TÜRETİLİR, elle sayılmaz.
 * Dışarıda kalanlar: `active:false` olanlar (müşteriye kapalı) ve
 * `purchasable:false` olanlar (Trend Video — Apify maliyeti nedeniyle paket dışı).
 * 12 Eyl 2026: Trend Video Bulucu müşteriye kapatıldı. Özellik listesindeki araç
 * sayısı SABİT ("10 araç*") yazıldığı için böyle değişikliklerde yanlış kalıyordu;
 * artık bu listenin uzunluğundan basılıyor ve kendiliğinden düzeliyor.
 */
const KAPSANAN_ARAC_ADLARI = ACTIVE_TOOLS
  .filter((t) => t.purchasable !== false)
  .map((t) => t.name)

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
  autoRenew: boolean
}

// ─── Plan feature lists ───────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '3 araç kullanım hakkı / araç / ay',
    `${KAPSANAN_ARAC_ADLARI.length} araç*`,
    'Temel rapor çıktısı',
    'E-posta desteği',
  ],
  standard: [
    '10 araç kullanım hakkı / araç / ay',
    `${KAPSANAN_ARAC_ADLARI.length} araç*`,
    'PDF rapor indirme',
    'Yapay zeka destekli analiz',
    'Uygulama kullanım desteği',
  ],
  premium: [
    '25 araç kullanım hakkı / araç / ay',
    `${KAPSANAN_ARAC_ADLARI.length} araç*`,
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
  admin:      99,  // admin tüm ücretli planların üstünde
}

const PLAN_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  free:       { bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200' },
  standard:   { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  premium:    { bg: 'bg-[#F0FAF6]',   text: 'text-[#085041]',   border: 'border-[#1D9E75]' },
  enterprise: { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-300' },
  admin:      { bg: 'bg-[#F0FAF6]',   text: 'text-[#085041]',   border: 'border-[#1D9E75]' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Active subscription banner ───────────────────────────────────────────────

function ActiveSubBanner({
  sub,
  onToggleAutoRenew,
  toggling,
}: {
  sub: Subscription
  onToggleAutoRenew: () => void
  toggling: boolean
}) {
  const dateStr = formatDate(sub.expiresAt)
  const planLabel = sub.planName ?? sub.plan

  if (sub.autoRenew) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-[13px] text-blue-900">
        <p className="font-semibold mb-1">🔄 {planLabel} otomatik yenilenecek</p>
        <p className="text-blue-800">
          Aboneliğiniz <strong>{dateStr}</strong> tarihinde otomatik olarak yenilenecektir.
        </p>
        <button
          onClick={onToggleAutoRenew}
          disabled={toggling}
          className="mt-2 text-[12px] font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 disabled:opacity-60"
        >
          {toggling ? '⏳ Güncelleniyor...' : 'Otomatik yenilemeyi kapatmak için tıklayınız'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-[13px] text-amber-900">
      <p className="font-semibold mb-1">📦 {planLabel} devam ediyor</p>
      <p className="text-amber-800">
        <strong>{planLabel}</strong> aboneliğiniz <strong>{dateStr}</strong> tarihinde sona erecek.
        {' '}Daha yüksek bir pakete <strong>şimdi yükseltebilirsiniz</strong> — aynı veya daha düşük paket süresi dolunca seçilebilir.
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaketSecPage() {
  const { user }      = useAuthStore()
  const queryClient   = useQueryClient()

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () =>
      api.get<Plan[]>('/subscriptions/plans').then((r: { data: Plan[] }) => r.data),
  })

  const { data: sub } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<Subscription>('/subscriptions/me').then((r: { data: Subscription }) => r.data),
    staleTime: 0,        // Her mount'ta taze veri — ödeme sonrası eski cache göstermesin
    refetchOnMount: true,
  })

  const autoRenewMutation = useMutation({
    mutationFn: (autoRenew: boolean) =>
      api.put('/subscriptions/me/auto-renew', { autoRenew }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  const isExpired = sub?.status === 'expired'

  // Görsel etiket için (admin rozeti, banner vb.)
  const rawPlan   = user?.isAdmin ? 'admin' : (sub?.plan ?? 'free')
  const currentPlan = isExpired ? 'free' : rawPlan

  // Satın alım kararları için gerçek abonelik planını kullan (admin pseudo-tier değil)
  // Admin flag sadece erişim hakkı verir; paket satın alımında gerçek sub plan baz alınır
  const purchasePlan = isExpired ? 'free' : (sub?.plan ?? 'free')
  const purchaseTier = PLAN_TIER[purchasePlan] ?? 0

  const hasActiveSub = !isExpired && purchaseTier > 0

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
    <div className="flex flex-col gap-4">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">⬆️</span>
          <h1 className="text-[16px] font-medium text-[#1C1B19]">Paket Seçimi</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">İhtiyacınıza uygun paketi seçin ve araçları kullanmaya başlayın</p>
      </div>

      {/* ── Promo / active / expired banner ── */}
      {isExpired ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-[13px] text-amber-800">
          ⏰ <strong>Paketiniz sona erdi.</strong>{' '}
          {sub?.expiresAt ? `${formatDate(sub.expiresAt)} tarihinde ` : ''}
          Ücretsiz plana geçildi — yeni paket seçerek devam edebilirsiniz.
        </div>
      ) : sub && !isExpired && sub.plan !== 'free' ? (
        <ActiveSubBanner
          sub={sub}
          onToggleAutoRenew={() => autoRenewMutation.mutate(!sub.autoRenew)}
          toggling={autoRenewMutation.isPending}
        />
      ) : !hasActiveSub && !isExpired ? (
        <div className="bg-[#1D9E75] text-white rounded-2xl px-5 py-3 text-center text-[13px] font-medium">
          🎉 Yeni aboneliklere özel tanıtım fiyatlarımızdan yararlanın!
        </div>
      ) : null}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(plans ?? []).map((plan) => {
            const planTier      = PLAN_TIER[plan.type] ?? 0
            // Satın alım kısıtlamaları gerçek abonelik tier'ına göre (admin override değil)
            const isActive      = !isExpired && purchasePlan === plan.type
            const isDowngrade   = planTier < purchaseTier
            const isSameTier    = planTier === purchaseTier && !isActive
            const isBlocked     = isActive || isDowngrade || isSameTier
            const isRecommended = plan.type === 'premium'
            const isEnterprise  = plan.type === 'enterprise'
            const badge         = PLAN_BADGE[plan.type] ?? PLAN_BADGE.free
            const features      = PLAN_FEATURES[plan.type] ?? []
            const icon          = PLAN_ICONS[plan.type] ?? '📦'

            // Deaktif buton etiketi — duruma göre
            const disabledLabel = (() => {
              if (plan.type === 'free') return isActive ? 'Aktif Plan' : 'Varsayılan Plan'
              if (isActive) {
                return sub?.autoRenew ? '🔄 Otomatik Olarak Yenileniyor' : 'Aktif Paket'
              }
              if (isDowngrade || isSameTier) {
                return sub?.autoRenew
                  ? 'Mevcut Paket Süresi Dolunca Seçilebilir'
                  : 'Paket Süresi Dolunca Seçilebilir'
              }
              return 'Seçilemez'
            })()

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-4 flex flex-col gap-3 transition-shadow ${
                  isRecommended && !isBlocked
                    ? 'border-[#1D9E75] shadow-lg shadow-[#1D9E75]/10'
                    : isActive
                      ? 'border-[#1D9E75]/40'
                      : 'border-[#E2E0D8]'
                } bg-white`}
              >
                {/* Recommended badge — sadece gerçekten satın alınabilirse göster */}
                {isRecommended && !isBlocked && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#1D9E75] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      ÖNERİLEN
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[18px] leading-none">{icon}</span>
                    <h3 className="text-[13px] font-semibold text-[#1C1B19]">{plan.name}</h3>
                    {isActive && (
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} border ${badge.border}`}>
                        Aktif Paket
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    {isEnterprise ? (
                      <span className="text-[18px] font-bold text-[#B45309]">Özel Fiyat</span>
                    ) : (
                      <>
                        <span className="text-[20px] font-bold text-[#1C1B19]">
                          {plan.priceMonthly === 0
                            ? '₺0'
                            : `₺${plan.priceMonthly.toLocaleString('tr-TR')}`}
                        </span>
                        <span className="text-[12px] text-[#9A9792]">/ ay</span>
                      </>
                    )}
                  </div>

                  {/* Usage summary */}
                  <p className="text-[11px] text-[#6B6963] mt-0.5">
                    {isEnterprise
                      ? 'İhtiyaç analizi ile başlayın'
                      : plan.usagePerToolPerMonth == null
                        ? 'Sınırsız Kullanım'
                        : `${plan.usagePerToolPerMonth} Kullanım Hakkı / Araç / Ay`}
                  </p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-1 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-[#3A3935]">
                      <span className="text-[#1D9E75] font-bold mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.type === 'free' || isBlocked ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl text-[12px] font-medium bg-[#F7F6F2] border border-[#D3D1C7] text-[#9A9792] cursor-default"
                  >
                    {disabledLabel}
                  </button>
                ) : isEnterprise ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full py-2 rounded-xl text-[12px] font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    🤝 İletişime Geç
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={loadingPlanId !== null}
                    className="w-full py-2 rounded-xl text-[12px] font-medium transition-colors disabled:opacity-60 disabled:cursor-wait bg-[#1D9E75] text-white hover:bg-[#178a65]"
                  >
                    {loadingPlanId === plan.id
                      ? '⏳ Yönlendiriliyor...'
                      : purchasePlan !== 'free'
                        ? `⬆️ Yükselt — ₺${plan.priceMonthly.toLocaleString('tr-TR')}`
                        : `🛒 Satın Al — ₺${plan.priceMonthly.toLocaleString('tr-TR')}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Kapsanan araçlar dipnotu ── */}
      {!isLoading && (
        <div className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-2xl px-5 py-4 text-center">
          <p className="text-[12px] font-medium text-[#6B6963] mb-2">
            * Standart ve Premium Paketler kapsamındaki araçlar
          </p>
          <p className="text-[12px] text-[#9A9792] leading-relaxed">
            {KAPSANAN_ARAC_ADLARI.join(' · ')}
          </p>
          <p className="text-[11px] text-[#C0BDB5] mt-2">
            Trend Video Bulucu, Apify altyapı maliyeti nedeniyle paketlere dahil değildir —
            tüm kullanıcılar için ayda 1 kullanım hakkı geçerlidir.
          </p>
        </div>
      )}

      {/* ── Note ── */}
      <p className="text-[12px] text-[#9A9792] text-center">
        Herhangi bir sorunuz için{' '}
        <a href="mailto:destek@kolaykobi.com" className="text-[#1D9E75] hover:underline">
          destek@kolaykobi.com
        </a>{' '}
        adresine yazabilirsiniz.
      </p>
    </div>
  )
}
