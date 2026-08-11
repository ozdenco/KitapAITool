import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchasedTool {
  id: string
  toolId: string
  monthYear: string   // "2026-08"
  totalRights: number
  usedCount: number
  purchasedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToolMeta(toolId: string) {
  return TOOLS.find((t) => t.id === toolId)
}

function formatMonth(monthYear: string) {
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AraclarimPage() {
  const { data: purchases, isLoading, isError } = useQuery<PurchasedTool[]>({
    queryKey: ['user-tool-purchases'],
    queryFn: () =>
      api.get<{ success: boolean; data: PurchasedTool[] }>('/users/me/purchases')
        .then((r) => r.data.data ?? []),
  })

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">🔧</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Satın Alınan Araçlar</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Tekil araç satın alımlarınız ve kalan haklarınız</p>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading && (
          <div className="flex flex-col gap-3 p-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-[#F7F6F2] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-[13px] text-[#9A9792]">
            Veriler yüklenirken hata oluştu.
          </div>
        )}

        {!isLoading && !isError && (!purchases || purchases.length === 0) && (
          <div className="p-10 text-center">
            <p className="text-[32px] mb-3">🛍️</p>
            <p className="text-[14px] font-medium text-[#3A3935] mb-1">Henüz araç satın almadınız</p>
            <p className="text-[12px] text-[#9A9792]">
              Dashboard'dan araçları keşfedip tekil satın alım yapabilirsiniz.
            </p>
          </div>
        )}

        {purchases && purchases.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">
                    Araç
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">
                    Ay
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">
                    Toplam Hak
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">
                    Kullanılan
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">
                    Kalan Hak
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const tool = getToolMeta(p.toolId)
                  const remaining = Math.max(0, p.totalRights - p.usedCount)
                  const pct = Math.min(100, (p.usedCount / p.totalRights) * 100)
                  const isExhausted = remaining === 0

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#F2F1ED] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] leading-none">{tool?.icon ?? '🔧'}</span>
                          <span className="text-[#1C1B19] font-medium">
                            {tool?.name ?? p.toolId}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#6B6963]">{formatMonth(p.monthYear)}</td>
                      <td className="px-5 py-3 text-right text-[#1C1B19] font-medium">
                        {p.totalRights}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExhausted ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-[#1D9E75]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={isExhausted ? 'text-red-600 font-medium' : 'text-[#6B6963]'}>
                            {p.usedCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            isExhausted ? 'text-red-600' : 'text-[#1D9E75]'
                          }`}
                        >
                          {remaining}
                        </span>
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
