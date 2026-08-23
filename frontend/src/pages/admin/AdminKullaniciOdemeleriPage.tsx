import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: string
  amount: number
  status: string
  planName: string | null
  toolId: string | null
  toolIds: string[] | null
  usesPerTool: number | null
  createdAt: string
  completedAt: string | null
}

interface PaymentsResponse {
  success: boolean
  data: PaymentRow[]
  meta: { userName: string; userEmail: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed:  { label: 'Tamamlandı', cls: 'bg-emerald-50 text-emerald-700' },
  pending:    { label: 'Bekliyor',   cls: 'bg-amber-50  text-amber-700'   },
  failed:     { label: 'Başarısız',  cls: 'bg-red-50    text-red-700'     },
  refunded:   { label: 'İade',       cls: 'bg-gray-100  text-gray-600'    },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTL(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminKullaniciOdemeleriPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate   = useNavigate()

  const { data, isLoading } = useQuery<PaymentsResponse>({
    queryKey: ['admin-user-payments', userId],
    queryFn: () =>
      api.get<PaymentsResponse>(`/admin/users/${userId}/payments`).then(r => r.data),
    enabled: !!userId,
  })

  const payments = data?.data ?? []
  const meta     = data?.meta

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + p.amount, 0)

  return (
    <div className="w-full max-w-[1100px] px-4 py-5 mx-auto flex flex-col gap-5">
      {/* ── Üst bar ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-[12px] text-[#9A9792] hover:text-[#1D9E75] transition-colors"
        >
          ← Geri
        </button>
        <div>
          <h1 className="text-[16px] font-semibold text-[#1C1B19]">
            💳 Ödeme Geçmişi
          </h1>
          {meta && (
            <p className="text-[12px] text-[#6B6963] mt-0.5">
              {meta.userName} · {meta.userEmail}
            </p>
          )}
        </div>
      </div>

      {/* ── Özet kartlar ── */}
      {!isLoading && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-white rounded-xl border border-[#E2E0D8] px-4 py-3 min-w-[140px]">
            <p className="text-[10px] text-[#9A9792] uppercase tracking-wider">Toplam işlem</p>
            <p className="text-[20px] font-bold text-[#1C1B19] mt-1">{payments.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E0D8] px-4 py-3 min-w-[140px]">
            <p className="text-[10px] text-[#9A9792] uppercase tracking-wider">Tamamlanan</p>
            <p className="text-[20px] font-bold text-emerald-600 mt-1">
              {payments.filter(p => p.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E0D8] px-4 py-3 min-w-[140px]">
            <p className="text-[10px] text-[#9A9792] uppercase tracking-wider">Toplam tahsilat</p>
            <p className="text-[20px] font-bold text-[#1D9E75] mt-1">{formatTL(totalPaid)}</p>
          </div>
        </div>
      )}

      {/* ── Tablo ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-1 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#F7F6F2] rounded animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-[#9A9792] text-[13px]">
            Bu kullanıcıya ait ödeme kaydı bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#F7F6F2] border-b border-[#E2E0D8]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Tarih</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Paket / Araç</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Tutar</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Durum</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Tamamlanma</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const statusInfo = STATUS_MAP[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
                  const desc = p.planName
                    ?? (p.toolId ? `Tekil araç: ${p.toolId}` : '—')

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#F1EFE8] hover:bg-[#F7F6F2]/60 transition-colors"
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-[#9A9792]">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[#1C1B19]">{desc}</p>
                        {p.usesPerTool && (
                          <p className="text-[10px] text-[#9A9792]">{p.usesPerTool} kullanım/araç</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#1C1B19] tabular-nums">
                        {formatTL(p.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-[#9A9792]">
                        {p.completedAt ? formatDate(p.completedAt) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
