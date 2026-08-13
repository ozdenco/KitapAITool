import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveToolPurchase {
  id: string
  toolId: string
  amountPaid: number
  purchasedAt: string
  expiresAt: string | null
}

interface ToolPrice {
  toolId: string
  toolName: string
  priceMonthly: number
}

interface Subscription {
  plan: string
  planName: string
  expiresAt: string | null
}

type UsageTier = 10 | 25

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function tierPrice(basePrice: number, tier: UsageTier): number {
  return tier === 25 ? basePrice * 2 : basePrice
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AraclarimPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tier, setTier] = useState<UsageTier>(10)
  const [isChecking, setIsChecking] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Aktif abonelik bilgisi — ücretli abonelik varken araç alımı kapalı
  const { data: sub, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () =>
      api
        .get<Subscription>('/subscriptions/me')
        .then((r: { data: Subscription }) => r.data),
  })

  const { data: purchases, isLoading: purchasesLoading } = useQuery<ActiveToolPurchase[]>({
    queryKey: ['my-tools'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: ActiveToolPurchase[] }>('/payments/my-tools')
        .then((r: { data: { success: boolean; data: ActiveToolPurchase[] } }) => r.data.data ?? []),
  })

  const { data: toolPrices, isLoading: pricesLoading } = useQuery<ToolPrice[]>({
    queryKey: ['tool-prices'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: ToolPrice[] }>('/payments/tool-prices')
        .then((r: { data: { success: boolean; data: ToolPrice[] } }) => r.data.data ?? []),
  })

  const isLoading = subLoading || purchasesLoading || pricesLoading

  // Aktif ücretli abonelik mi var?
  const hasActivePaidSub =
    sub != null &&
    sub.plan !== 'free' &&
    sub.expiresAt != null &&
    new Date(sub.expiresAt) > new Date()

  const activePurchaseMap = new Map(
    (purchases ?? []).map((p) => [p.toolId, p])
  )
  const priceMap = new Map(
    (toolPrices ?? []).map((tp) => [tp.toolId, tp.priceMonthly])
  )

  const totalPrice = [...selected].reduce(
    (sum, toolId) => sum + tierPrice(priceMap.get(toolId) ?? 0, tier),
    0
  )

  const toggleSelect = (toolId: string) => {
    if (hasActivePaidSub) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(toolId)) next.delete(toolId)
      else next.add(toolId)
      return next
    })
  }

  const handleCheckout = async () => {
    if (selected.size === 0 || isChecking || hasActivePaidSub) return
    setCheckoutError(null)
    setIsChecking(true)
    try {
      const res = await api.post<{ paymentPageUrl: string }>(
        '/payments/bulk-tool-checkout',
        { toolIds: [...selected], usesPerTool: tier }
      )
      window.location.href = res.data.paymentPageUrl
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Ödeme başlatılamadı. Lütfen tekrar deneyin.'
      setCheckoutError(msg)
      setIsChecking(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-32">
        {/* ── Title ── */}
        <div>
          <div className="flex items-center gap-[10px] mb-[4px]">
            <span className="text-[22px] leading-none">🛒</span>
            <h1 className="text-[20px] font-medium text-[#1C1B19]">Araç Satın Al</h1>
          </div>
          <p className="text-[13px] text-[#6B6963]">
            İstediğiniz araçları seçin, aylık kullanım miktarını belirleyin — tek seferde ödeyin
          </p>
        </div>

        {/* ── Aktif abonelik engeli ── */}
        {!isLoading && hasActivePaidSub && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3">
            <span className="text-[22px] leading-none shrink-0">📦</span>
            <div>
              <p className="text-[13px] font-semibold text-amber-800 leading-snug">
                Aktif paket aboneliğiniz devam ediyor
              </p>
              <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
                <span className="font-medium">{sub?.planName}</span> paketiniz{' '}
                <span className="font-semibold">
                  {formatDate(sub!.expiresAt!)}
                </span>{' '}
                tarihinde sona erecek. Araç satın alımı bu tarihten itibaren kullanılabilir olacaktır.
              </p>
            </div>
          </div>
        )}

        {/* ── Hata ── */}
        {checkoutError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
            ⚠️ {checkoutError}
          </div>
        )}

        {/* ── Nasıl çalışır? ── */}
        {!hasActivePaidSub && (
          <div className="bg-[#F7F6F2] rounded-2xl px-5 py-4 flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-[#3A3935]">📌 Nasıl çalışır?</p>
            <ul className="flex flex-col gap-1">
              {[
                'İstediğiniz araçları seçin (1 veya daha fazla)',
                'Aylık kullanım miktarı seçin: 10 veya 25 kullanım/araç',
                'Seçilmeyen araçlar ücretsiz limitte kalır (3/ay)',
                'Tek ödemeyle tüm seçili araçlara erişim sağlanır',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-[#6B6963]">
                  <span className="text-[#1D9E75] font-bold shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Card grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-[120px] bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${hasActivePaidSub ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            {TOOLS.map((tool) => {
              const purchase   = activePurchaseMap.get(tool.id)
              const basePrice  = priceMap.get(tool.id)
              const isActive   = Boolean(purchase)
              const isSelected = selected.has(tool.id)
              const days       = purchase ? daysLeft(purchase.expiresAt) : null
              const isUrgent   = days !== null && days <= 5

              if (isActive) {
                return (
                  <div
                    key={tool.id}
                    className="relative bg-white rounded-2xl border-2 border-[#1D9E75]/50 p-4 flex items-start gap-3"
                  >
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full bg-[#E6F9F2] text-[#085041] border border-[#9FE1CB]">
                        ✓ Aktif
                      </span>
                    </div>
                    <span className="text-[28px] leading-none shrink-0 mt-0.5">{tool.icon}</span>
                    <div className="flex-1 min-w-0 pr-12">
                      <p className="text-[13px] font-semibold text-[#1C1B19] leading-snug">{tool.name}</p>
                      {purchase?.expiresAt && (
                        <p className={`text-[11px] mt-1 ${isUrgent ? 'text-amber-600 font-medium' : 'text-[#9A9792]'}`}>
                          {isUrgent && days === 0
                            ? '⚠️ Bugün bitiyor!'
                            : isUrgent && days !== null
                            ? `⚠️ ${days} gün kaldı`
                            : `${new Date(purchase.expiresAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })} tarihine kadar`}
                        </p>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleSelect(tool.id)}
                  className={`relative text-left bg-white rounded-2xl border-2 p-4 flex items-start gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/40 ${
                    isSelected
                      ? 'border-[#1D9E75] shadow-md shadow-[#1D9E75]/10'
                      : 'border-[#E2E0D8] hover:border-[#9FE1CB] hover:shadow-sm'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`absolute top-3 right-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-[#1D9E75] bg-[#1D9E75]' : 'border-[#D3D1C7] bg-white'
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 10 8" className="w-[10px] h-[8px]">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <span className="text-[28px] leading-none shrink-0 mt-0.5">{tool.icon}</span>
                  <div className="flex-1 min-w-0 pr-10">
                    <p className="text-[13px] font-semibold text-[#1C1B19] leading-snug">{tool.name}</p>
                    <p className="text-[11px] text-[#9A9792] mt-0.5 leading-relaxed line-clamp-2">
                      {tool.description}
                    </p>
                    {basePrice != null && (
                      <p className="text-[12px] text-[#6B6963] mt-2 tabular-nums">
                        10 kullanım/ay:{' '}
                        <span className="font-semibold text-[#1C1B19]">₺{basePrice.toLocaleString('tr-TR')}</span>
                        <span className="mx-2 text-[#D3D1C7]">·</span>
                        25 kullanım/ay:{' '}
                        <span className="font-semibold text-[#1C1B19]">₺{(basePrice * 2).toLocaleString('tr-TR')}</span>
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <p className="text-[12px] text-[#9A9792] text-center">
          Araç abonelikleri satın alındığı tarihten itibaren 1 ay geçerlidir.
        </p>
      </div>

      {/* ── Sticky bottom bar — sadece araç seçildiyse ve aktif abonelik yoksa ── */}
      {selected.size > 0 && !hasActivePaidSub && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full max-w-[1100px] px-6 pb-5 pointer-events-auto">
            <div className="bg-[#1C1B19] rounded-2xl px-5 py-4 flex flex-col gap-3 shadow-2xl">

              {/* Adım göstergesi */}
              <div className="flex items-center gap-2 text-[11px] text-[#9A9792]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2C2B27] text-[#9A9792] text-[10px] font-bold shrink-0">1</span>
                <span className="line-through opacity-50">Araçları seç</span>
                <span className="text-[#2C2B27] mx-1">›</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1D9E75] text-white text-[10px] font-bold shrink-0">2</span>
                <span className="text-white font-medium">Kullanım miktarı</span>
                <span className="text-[#2C2B27] mx-1">›</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2C2B27] text-[#9A9792] text-[10px] font-bold shrink-0">3</span>
                <span>Ödeme</span>
              </div>

              <div className="h-px bg-[#2C2B27]" />

              {/* Tier seçimi — tüm araçlar için geçerli */}
              <div>
                <p className="text-[11px] text-[#9A9792] mb-2">
                  Seçilen <span className="text-white font-medium">{selected.size} araç</span> için
                  araç başına aylık kullanım miktarı:
                </p>
                <div className="flex items-center gap-2">
                  {([10, 25] as UsageTier[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors border ${
                        tier === t
                          ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                          : 'bg-[#2C2B27] text-[#9A9792] border-[#2C2B27] hover:text-white'
                      }`}
                    >
                      {t} kullanım / araç / ay
                    </button>
                  ))}
                </div>
              </div>

              {/* Fiyat özeti + buton */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[22px] font-bold text-white tabular-nums leading-none">
                    ₺{totalPrice.toLocaleString('tr-TR')}
                    <span className="text-[12px] font-normal text-[#9A9792] ml-1">/ay</span>
                  </p>
                  <p className="text-[11px] text-[#9A9792] mt-0.5">
                    {selected.size === 1
                      ? `1 araç × ${tier} kullanım/ay = ₺${totalPrice.toLocaleString('tr-TR')}`
                      : `${selected.size} araç × ${tier} kullanım/araç/ay`}
                  </p>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isChecking}
                  className="px-6 py-3 rounded-xl text-[13px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-60 disabled:cursor-wait flex items-center gap-2 shrink-0"
                >
                  {isChecking ? '⏳ Yönlendiriliyor...' : '🛒 Ödemeye Geç →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
