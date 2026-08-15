import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentOrder {
  id: string
  amount: number
  status: 0 | 1 | 2   // 0=Pending, 1=Completed, 2=Failed
  planName: string | null
  toolId: string | null
  toolIds: string | null    // JSON array for bulk tool orders
  usesPerTool: number | null
  createdAt: string
  completedAt: string | null
}

interface ToolPrice {
  toolId: string
  toolName: string
  priceMonthly: number
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  0: { label: 'Bekliyor',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  1: { label: 'Tamamlandı', cls: 'bg-[#E6F9F2] text-[#085041] border-[#9FE1CB]' },
  2: { label: 'İptal',      cls: 'bg-red-50 text-red-700 border-red-200' },
} as const

const TOOL_NAME: Record<string, string> = {
  'gorunurluk-skoru':   '📊 İşletme Görünürlük Skoru',
  'musteri-persona':    '👤 Müşteri Persona Oluşturucu',
  'icerik-takvimi':     '📅 30 Günlük İçerik Takvimi',
  'whatsapp-satis':     '💬 WhatsApp Satış Script Üretici',
  'reklam-butce':       '💰 Reklam Bütçe Dağıtıcı',
  'musteri-geri-donus': '🔄 Müşteri Geri Dönüş Senaryosu',
  'rakip-analiz':       '🔍 Rakip Analiz Panosu',
  'chatbot-senaryo':    '🤖 Chatbot Senaryo Hazırlayıcı',
  'ai-gorunurluk':      '✨ AI Görünürlük Takipçisi',
  'viral-video':        '🎬 Viral Video Uyarlayıcı',
  'trend-video':        '📱 Trend Video Bulucu',
}

const PLAN_ICON: Record<string, string> = {
  'Ücretsiz': '🎁',
  'Standart':  '⭐',
  'Premium':   '💎',
  'Kurumsal':  '🏢',
}

const PLAN_FEATURES: Record<string, string[]> = {
  'Standart':  ['10 kullanım hakkı / araç / ay', 'Tüm 11 araca erişim', 'PDF rapor indirme', 'Yapay zeka destekli analiz'],
  'Premium':   ['25 kullanım hakkı / araç / ay', 'Tüm 11 araca erişim', 'PDF rapor indirme', 'Geçmiş veri analizi', 'Profesyonel rapor'],
  'Kurumsal':  ['Firmaya özel araç oluşturma', 'Özel entegrasyonlar', 'SLA Garantisi', 'Özel destek ekibi'],
  'Ücretsiz':  ['3 kullanım hakkı / araç / ay', 'Tüm 11 araca erişim'],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addOneMonth(iso: string): Date {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + 1)
  return d
}

function fmtDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function fmtAmount(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Araç başına fiyat hesapla: base fiyat × (usesPerTool / 10)
function computeToolAmount(
  toolId: string,
  usesPerTool: number | null,
  priceMap: Record<string, number>,
): number | null {
  const base = priceMap[toolId]
  if (base == null) return null
  const multiplier = usesPerTool != null ? usesPerTool / 10 : 1
  return Math.round(base * multiplier * 100) / 100
}

// Araç veya plan detaylarını döndürür
function getOrderDetails(order: PaymentOrder): {
  icon: string
  label: string
  isTool: boolean
  toolIdList: string[]
} {
  // Tekil araç
  if (order.toolId) {
    return {
      icon: '🔧',
      label: 'Araç Aboneliği',
      isTool: true,
      toolIdList: [order.toolId],
    }
  }

  // Toplu araç
  if (order.toolIds) {
    let ids: string[] = []
    try {
      const parsed = JSON.parse(order.toolIds) as unknown
      if (Array.isArray(parsed)) ids = parsed as string[]
    } catch { /* ignore */ }

    const uses = order.usesPerTool ?? 10
    return {
      icon: '🔧',
      label: `${ids.length > 0 ? ids.length : '?'} Araç Aboneliği — ${uses} Kullanım/Ay`,
      isTool: true,
      toolIdList: ids,
    }
  }

  // Abonelik paketi
  const planName = order.planName ?? '?'
  return {
    icon: PLAN_ICON[planName] ?? '📦',
    label: `${planName} Paketi`,
    isTool: false,
    toolIdList: [],
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OdemeGecmisiPage() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: orders, isLoading } = useQuery<PaymentOrder[]>({
    queryKey: ['payment-orders'],
    queryFn: () =>
      api.get<{ success: boolean; data: PaymentOrder[] }>('/payments/orders')
         .then((r: { data: { success: boolean; data: PaymentOrder[] } }) => r.data.data),
  })

  const { data: toolPricesData } = useQuery<ToolPrice[]>({
    queryKey: ['tool-prices'],
    queryFn: () =>
      api.get<{ success: boolean; data: ToolPrice[] }>('/payments/tool-prices')
         .then((r: { data: { success: boolean; data: ToolPrice[] } }) => r.data.data),
  })

  // toolId → priceMonthly map
  const priceMap: Record<string, number> = {}
  for (const tp of toolPricesData ?? []) {
    priceMap[tp.toolId] = tp.priceMonthly
  }

  const completedOrders = orders?.filter((o) => o.status === 1) ?? []

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">💳</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Ödeme Geçmişi</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Tamamlanan ödeme işlemleriniz</p>
      </div>

      {/* ── Orders list ── */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[100px] bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
            ))}
          </>
        ) : completedOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E0D8] flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-[48px]">🧾</span>
            <p className="text-[15px] font-medium text-[#1C1B19]">Henüz ödeme yapılmadı</p>
            <p className="text-[13px] text-[#9A9792]">İlk paketinizi satın aldığınızda burada görünecek</p>
          </div>
        ) : (
          completedOrders.map((order) => {
            const status                              = STATUS_CONFIG[order.status]
            const { icon, label, isTool, toolIdList } = getOrderDetails(order)
            const startDate                           = new Date(order.createdAt)
            const endDate                             = addOneMonth(order.createdAt)
            const isExpanded                          = expandedIds.has(order.id)

            // Kart açılabilir mi? Araç siparişleri için
            const isExpandable = isTool && toolIdList.length > 0

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden"
              >
                {/* ── Ana satır ── */}
                <button
                  className={`w-full text-left px-5 py-4 transition-colors ${
                    isExpandable ? 'hover:bg-[#FAFAF7] cursor-pointer' : 'cursor-default'
                  }`}
                  onClick={() => isExpandable && toggleExpand(order.id)}
                  disabled={!isExpandable}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[22px] leading-none shrink-0 mt-0.5">{icon}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        {/* Sol: başlık + id */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-[#1C1B19] leading-snug">{label}</p>
                            {isExpandable && (
                              <span className={`text-[11px] text-[#9A9792] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                ▾
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9A9792] font-mono mt-0.5">
                            #{String(order.id).slice(0, 8).toUpperCase()}
                          </p>
                        </div>

                        {/* Sağ: tutar + durum */}
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-[15px] font-bold text-[#1C1B19] tabular-nums">
                            ₺{fmtAmount(order.amount)}
                          </p>
                          <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-full border ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Tarih aralığı */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[11px] text-[#9A9792]">
                          {fmtDate(startDate)} {fmtTime(order.createdAt)}
                        </span>
                        <span className="text-[11px] text-[#D3D1C7]">→</span>
                        <span className="text-[11px] text-[#9A9792]">{fmtDate(endDate)}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* ── Genişletilmiş içerik ── */}
                {isTool ? (
                  // Araç detayları — tıklanınca açılır
                  isExpanded && toolIdList.length > 0 && (
                    <div className="border-t border-[#F0EFE9] px-5 py-3 bg-[#FAFAF7]">
                      <div className="flex flex-col gap-1.5">
                        {toolIdList.map((tid) => {
                          const name   = TOOL_NAME[tid] ?? `🔧 ${tid}`
                          const amount = computeToolAmount(tid, order.usesPerTool, priceMap)
                          const uses   = order.usesPerTool != null ? `${order.usesPerTool} kullanım/ay` : null
                          return (
                            <div key={tid} className="flex items-center justify-between gap-3">
                              <span className="text-[12px] text-[#3A3935]">{name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {uses && (
                                  <span className="text-[11px] text-[#9A9792]">{uses}</span>
                                )}
                                {amount != null && (
                                  <span className="text-[12px] font-semibold text-[#1C1B19] tabular-nums">
                                    ₺{fmtAmount(amount)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {/* Toplam satırı (birden fazla araç varsa) */}
                        {toolIdList.length > 1 && (
                          <div className="flex items-center justify-between gap-3 pt-1.5 mt-0.5 border-t border-[#E2E0D8]">
                            <span className="text-[11px] font-semibold text-[#6B6963]">Toplam</span>
                            <span className="text-[13px] font-bold text-[#1C1B19] tabular-nums">
                              ₺{fmtAmount(order.amount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  // Paket özellikleri — her zaman görünür
                  (() => {
                    const planFeatures = PLAN_FEATURES[order.planName ?? ''] ?? []
                    return planFeatures.length > 0 ? (
                      <div className="border-t border-[#F0EFE9] px-5 py-2.5">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {planFeatures.map((f) => (
                            <span key={f} className="flex items-center gap-1 text-[11px] text-[#6B6963]">
                              <span className="text-[#1D9E75] font-bold">✓</span> {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()
                )}
              </div>
            )
          })
        )}
      </div>

      <p className="text-[12px] text-[#9A9792] text-center">
        Ödeme sorunları için{' '}
        <a href="mailto:destek@kolaykobi.com" className="text-[#1D9E75] hover:underline">
          destek@kolaykobi.com
        </a>{' '}
        adresine ulaşabilirsiniz.
      </p>
    </div>
  )
}
