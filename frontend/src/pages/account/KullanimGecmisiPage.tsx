import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyUsage {
  monthYear: string   // "2026-08"
  totalUsed: number
  totalLimit: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(monthYear: string, short = false) {
  const [year, month] = monthYear.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return short
    ? date.toLocaleDateString('tr-TR', { month: 'short' })
    : date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────

interface BarChartProps {
  data: MonthlyUsage[]
}

function BarChart({ data }: BarChartProps) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map((d) => d.totalUsed), 1)
  const chartH = 130
  const barW = 36
  const gap = 20
  const paddingX = 10
  const totalW = data.length * (barW + gap) - gap + paddingX * 2

  return (
    <svg
      viewBox={`0 0 ${totalW} ${chartH + 36}`}
      className="w-full overflow-visible"
      aria-label="Aylık kullanım grafiği"
    >
      {/* Baseline */}
      <line
        x1={paddingX}
        y1={chartH}
        x2={totalW - paddingX}
        y2={chartH}
        stroke="#E2E0D8"
        strokeWidth={1}
      />

      {data.map((d, i) => {
        const x = paddingX + i * (barW + gap)
        const barH = Math.max((d.totalUsed / maxVal) * chartH, d.totalUsed > 0 ? 4 : 0)
        const y = chartH - barH
        const pct = d.totalLimit > 0 ? Math.round((d.totalUsed / d.totalLimit) * 100) : 0
        const isHigh = pct >= 80

        return (
          <g key={d.monthYear}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={isHigh ? '#F59E0B' : '#1D9E75'}
              opacity={0.85}
            />

            {/* Value label above bar */}
            {d.totalUsed > 0 && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={10}
                fill="#6B6963"
                fontFamily="inherit"
              >
                {d.totalUsed}
              </text>
            )}

            {/* Month label below baseline */}
            <text
              x={x + barW / 2}
              y={chartH + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#9A9792"
              fontFamily="inherit"
            >
              {formatMonth(d.monthYear, true)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KullanimGecmisiPage() {
  const { data: history, isLoading, isError } = useQuery<MonthlyUsage[]>({
    queryKey: ['usage-history'],
    queryFn: () =>
      api.get<MonthlyUsage[]>('/tools/usage/history?months=6').then(
        (r: { data: MonthlyUsage[] }) => r.data
      ),
  })

  // Derived stats
  const totalUsed = history?.reduce((s, m) => s + m.totalUsed, 0) ?? 0
  const activeMonths = history?.filter((m) => m.totalUsed > 0).length ?? 0
  const monthlyAvg =
    activeMonths > 0 ? Math.round(totalUsed / activeMonths) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📊</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Kullanım Geçmişi</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Son 6 aylık araç kullanım istatistikleriniz</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Toplam Kullanım',
            value: isLoading ? '—' : String(totalUsed),
            sub: 'son 6 ay',
          },
          {
            label: 'Aktif Kullanım Süresi',
            value: isLoading ? '—' : `${activeMonths} ay`,
            sub: 'aktif ay',
          },
          {
            label: 'Aylık Ortalama',
            value: isLoading ? '—' : String(monthlyAvg),
            sub: 'kullanım/ay',
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
            <p className="text-[11px] text-[#9A9792] mb-1">{label}</p>
            <p className="text-[24px] font-bold text-[#1C1B19] leading-none mb-1">{value}</p>
            <p className="text-[11px] text-[#9A9792]">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-4">
          Aylık Kullanım
        </h2>

        {isLoading && (
          <div className="h-[166px] bg-[#F7F6F2] rounded-lg animate-pulse" />
        )}

        {isError && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">
            Veriler yüklenirken hata oluştu.
          </p>
        )}

        {!isLoading && !isError && (!history || history.length === 0) && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">
            Henüz kullanım verisi bulunmuyor.
          </p>
        )}

        {history && history.length > 0 && <BarChart data={history} />}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider">
            Aylık Detay
          </h2>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-9 bg-[#F7F6F2] rounded animate-pulse" />
            ))}
          </div>
        )}

        {history && history.length > 0 && (
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
                      <td className="px-5 py-3 text-[#1C1B19] font-medium">
                        {formatMonth(row.monthYear)}
                      </td>
                      <td className="px-5 py-3 text-right text-[#1C1B19]">
                        {row.totalUsed}
                      </td>
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
                                className={`h-full rounded-full transition-all ${
                                  isHigh ? 'bg-amber-400' : 'bg-[#1D9E75]'
                                }`}
                                style={{ width: `${pct ?? 0}%` }}
                              />
                            </div>
                            <span
                              className={`text-[12px] font-medium w-8 text-right tabular-nums ${
                                isHigh ? 'text-amber-600' : 'text-[#6B6963]'
                              }`}
                            >
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

        {!isLoading && (!history || history.length === 0) && !isError && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">
            Henüz kullanım verisi bulunmuyor.
          </p>
        )}
      </div>
    </div>
  )
}
