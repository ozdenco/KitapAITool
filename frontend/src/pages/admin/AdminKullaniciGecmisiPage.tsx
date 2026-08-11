import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyUsage {
  monthYear: string
  totalUsed: number
  totalLimit: number
}

interface UserHistoryData {
  name: string
  email: string
  history: MonthlyUsage[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(monthYear: string, short = false) {
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return short
    ? date.toLocaleDateString('tr-TR', { month: 'short' })
    : date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: MonthlyUsage[] }) {
  if (data.length === 0) return null

  const maxVal  = Math.max(...data.map((d) => d.totalUsed), 1)
  const chartH  = 130
  const barW    = 36
  const gap     = 20
  const padX    = 10
  const totalW  = data.length * (barW + gap) - gap + padX * 2

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 36}`} className="w-full overflow-visible">
      <line x1={padX} y1={chartH} x2={totalW - padX} y2={chartH} stroke="#E2E0D8" strokeWidth={1} />
      {data.map((d, i) => {
        const x    = padX + i * (barW + gap)
        const barH = Math.max((d.totalUsed / maxVal) * chartH, d.totalUsed > 0 ? 4 : 0)
        const y    = chartH - barH
        return (
          <g key={d.monthYear}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="#1D9E75" opacity={0.85} />
            {d.totalUsed > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="#6B6963" fontFamily="inherit">
                {d.totalUsed}
              </text>
            )}
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="#9A9792" fontFamily="inherit">
              {formatMonth(d.monthYear, true)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminKullaniciGecmisiPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate   = useNavigate()

  const { data, isLoading, isError } = useQuery<UserHistoryData>({
    queryKey: ['admin-user-history', userId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: UserHistoryData }>(
        `/admin/users/${userId}/usage-history?months=6`
      )
      if (!res.data.success) throw new Error('Veri yüklenemedi')
      return res.data.data
    },
    enabled: !!userId,
  })

  const history     = data?.history ?? []
  const totalUsed   = history.reduce((s, m) => s + m.totalUsed, 0)
  const activeMonths = history.filter((m) => m.totalUsed > 0).length
  const monthlyAvg  = activeMonths > 0 ? Math.round(totalUsed / activeMonths) : 0

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">

      {/* ── Back + header ── */}
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-[13px] text-[#6B6963] hover:text-[#1C1B19] mb-5 transition-colors"
      >
        ← Kullanıcı Listesine Dön
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-[10px] mb-1">
          <span className="text-[22px] leading-none">📊</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Kullanım Geçmişi</h1>
        </div>
        {data && (
          <p className="text-[13px] text-[#6B6963]">
            <strong className="text-[#1C1B19]">{data.name}</strong> — {data.email}
          </p>
        )}
        {isLoading && <div className="h-4 w-48 bg-[#E2E0D8] rounded animate-pulse mt-1" />}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Toplam Kullanım', value: isLoading ? '—' : String(totalUsed), sub: 'son 6 ay' },
          { label: 'Aktif Kullanım Süresi', value: isLoading ? '—' : `${activeMonths} ay`, sub: 'aktif ay' },
          { label: 'Aylık Ortalama', value: isLoading ? '—' : String(monthlyAvg), sub: 'kullanım/ay' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
            <p className="text-[11px] text-[#9A9792] mb-1">{label}</p>
            <p className="text-[24px] font-bold text-[#1C1B19] leading-none mb-1">{value}</p>
            <p className="text-[11px] text-[#9A9792]">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 mb-5">
        <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-4">
          Aylık Kullanım Grafiği
        </h2>
        {isLoading && <div className="h-[166px] bg-[#F7F6F2] rounded-lg animate-pulse" />}
        {isError && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">Veriler yüklenirken hata oluştu.</p>
        )}
        {!isLoading && !isError && history.length > 0 && <BarChart data={history} />}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider">
            Detaylı Kullanım Geçmişi
          </h2>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-9 bg-[#F7F6F2] rounded animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                  {['Ay', 'Kullanılan', 'Limit', 'Kalan', 'Kullanım Oranı'].map((col) => (
                    <th
                      key={col}
                      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] ${
                        col === 'Ay' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((row) => {
                  const unlimited = row.totalLimit === 0
                  const remaining = unlimited ? null : Math.max(0, row.totalLimit - row.totalUsed)
                  const pct = !unlimited && row.totalLimit > 0
                    ? Math.min(100, Math.round((row.totalUsed / row.totalLimit) * 100))
                    : null
                  const isHigh = (pct ?? 0) >= 80

                  return (
                    <tr
                      key={row.monthYear}
                      className="border-b border-[#F2F1ED] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                    >
                      <td className="px-5 py-3 text-[#1C1B19] font-medium">{formatMonth(row.monthYear)}</td>
                      <td className="px-5 py-3 text-right text-[#1C1B19]">{row.totalUsed}</td>
                      <td className="px-5 py-3 text-right text-[#6B6963]">
                        {unlimited ? <span className="text-[#1D9E75] font-medium">∞</span> : row.totalLimit}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-[#1D9E75]">
                        {unlimited ? '∞' : remaining}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {unlimited ? (
                          <span className="text-[12px] text-[#1D9E75] font-medium">Sınırsız</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-400' : 'bg-[#1D9E75]'}`}
                                style={{ width: `${pct ?? 0}%` }}
                              />
                            </div>
                            <span className={`text-[12px] font-medium w-8 text-right tabular-nums ${isHigh ? 'text-amber-600' : 'text-[#6B6963]'}`}>
                              {pct ?? 0}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && history.length === 0 && !isError && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">
            Bu kullanıcıya ait kullanım verisi bulunamadı.
          </p>
        )}
      </div>
    </div>
  )
}
