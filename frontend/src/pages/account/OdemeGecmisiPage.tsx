import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentOrder {
  id: string
  amount: number
  status: 0 | 1 | 2   // 0=Pending, 1=Completed, 2=Failed
  planName: string | null
  toolId: string | null
  createdAt: string
  completedAt: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  0: { label: 'Bekliyor',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  1: { label: 'Tamamlandı', cls: 'bg-[#E6F9F2] text-[#085041] border-[#9FE1CB]' },
  2: { label: 'İptal',      cls: 'bg-red-50 text-red-700 border-red-200' },
} as const

const PLAN_ICON: Record<string, string> = {
  'Ücretsiz': '🎁',
  'Standart':  '⭐',
  'Premium':   '💎',
  'Kurumsal':  '🏢',
}

const TOOL_ICON: Record<string, string> = {
  'gorunurluk-skoru':  '📊',
  'musteri-persona':   '👤',
  'icerik-takvimi':    '📅',
  'whatsapp-satis':    '💬',
  'reklam-butce':      '💰',
  'musteri-geri-donus':'🔄',
  'rakip-analiz':      '🔍',
  'chatbot-senaryo':   '🤖',
  'ai-gorunurluk':     '✨',
  'viral-video':       '🎬',
  'trend-video':       '📱',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function getOrderLabel(order: PaymentOrder): { icon: string; label: string } {
  if (order.toolId) {
    return {
      icon: TOOL_ICON[order.toolId] ?? '🔧',
      label: 'Araç Aboneliği',
    }
  }
  return {
    icon: PLAN_ICON[order.planName ?? ''] ?? '📦',
    label: `${order.planName ?? '?'} Paketi`,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OdemeGecmisiPage() {
  const { data: orders, isLoading } = useQuery<PaymentOrder[]>({
    queryKey: ['payment-orders'],
    queryFn: () =>
      api.get<{ success: boolean; data: PaymentOrder[] }>('/payments/orders')
         .then((r: { data: { success: boolean; data: PaymentOrder[] } }) => r.data.data),
  })

  const completedCount = orders?.filter((o) => o.status === 1).length ?? 0

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
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-[1px]">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[68px] bg-[#F7F6F2] animate-pulse border-b border-[#E2E0D8]" />
            ))}
          </div>
        ) : completedCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-[48px]">🧾</span>
            <p className="text-[15px] font-medium text-[#1C1B19]">Henüz ödeme yapılmadı</p>
            <p className="text-[13px] text-[#9A9792]">İlk paketinizi satın aldığınızda burada görünecek</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_90px_80px_88px] gap-3 px-5 py-3 bg-[#F7F6F2] border-b border-[#E2E0D8]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Ürün</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Tarih</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right">Tutar</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right">Durum</span>
            </div>

            {orders!
              .filter((o) => o.status === 1)   // sadece tamamlananlar
              .map((order) => {
                const status = STATUS_CONFIG[order.status]
                const { icon, label } = getOrderLabel(order)

                return (
                  <div
                    key={order.id}
                    className="grid grid-cols-[1fr_90px_80px_88px] gap-3 px-5 py-4 items-center border-b border-[#F0EFE9] last:border-b-0 hover:bg-[#FAFAF7] transition-colors"
                  >
                    {/* Ürün */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[18px] shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1C1B19] truncate">{label}</p>
                        <p className="text-[11px] text-[#9A9792] font-mono">
                          #{String(order.id).slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Tarih */}
                    <div>
                      <p className="text-[12px] text-[#3A3935]">{formatDate(order.createdAt)}</p>
                      <p className="text-[11px] text-[#9A9792]">{formatTime(order.createdAt)}</p>
                    </div>

                    {/* Tutar */}
                    <p className="text-[14px] font-semibold text-[#1C1B19] text-right tabular-nums">
                      ₺{order.amount.toLocaleString('tr-TR')}
                    </p>

                    {/* Durum */}
                    <div className="flex justify-end">
                      <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-full border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                )
              })}
          </>
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
