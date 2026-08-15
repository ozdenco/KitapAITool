import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodUsage {
  periodStart: string  // "2026-07-14"
  periodEnd:   string  // "2026-08-14"
  totalUsed:   number
}

interface SubInfo {
  startedAt: string
}

interface ToolPurchase {
  purchasedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TR_MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
const TR_MONTHS_LONG  = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

function parseDateParts(iso: string): { day: number; month: number; year: number } {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  return { day: d, month: m, year: y }
}

/** "14 Ağustos – 14 Eylül 2026" */
function longPeriodLabel(periodStart: string, periodEnd: string): string {
  const s = parseDateParts(periodStart)
  const e = parseDateParts(periodEnd)
  const endStr   = `${e.day} ${TR_MONTHS_LONG[e.month - 1]} ${e.year}`
  const startStr = s.year === e.year
    ? `${s.day} ${TR_MONTHS_LONG[s.month - 1]}`
    : `${s.day} ${TR_MONTHS_LONG[s.month - 1]} ${s.year}`
  return `${startStr} – ${endStr}`
}

/** Kullanıcının fatura gününü al — subscription startedAt veya araç purchasedAt */
function getBillingDay(subStartedAt?: string, toolPurchasedAt?: string): number {
  const raw = subStartedAt ?? toolPurchasedAt
  if (!raw) return 1
  const { day } = parseDateParts(raw)
  return Math.min(day, 28)
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────

interface BarChartProps {
  data: PeriodUsage[]
}

function BarChart({ data }: BarChartProps) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map((d) => d.totalUsed), 1)
  const chartH = 130
  const barW   = 36
  const gap    = 20
  const padX   = 10
  const totalW = data.length * (barW + gap) - gap + padX * 2

  return (
    <svg
      viewBox={`0 0 ${totalW} ${chartH + 44}`}
      className="w-full overflow-visible"
      aria-label="Fatura dönemi kullanım grafiği"
    >
      {/* Baseline */}
      <line x1={padX} y1={chartH} x2={totalW - padX} y2={chartH} stroke="#E2E0D8" strokeWidth={1} />

      {data.map((d, i) => {
        const x    = padX + i * (barW + gap)
        const barH = Math.max((d.totalUsed / maxVal) * chartH, d.totalUsed > 0 ? 4 : 0)
        const y    = chartH - barH
        const { day, month, year } = parseDateParts(d.periodStart)
        const isNewYear = i > 0 && parseDateParts(data[i - 1].periodStart).year !== year

        return (
          <g key={d.periodStart}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="#1D9E75" opacity={0.85} />

            {d.totalUsed > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="#6B6963" fontFamily="inherit">
                {d.totalUsed}
              </text>
            )}

            {/* Gün + ay — font size küçültüldü */}
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={8} fill="#9A9792" fontFamily="inherit">
              {`${day} ${TR_MONTHS_SHORT[month - 1]}`}
            </text>

            {/* Yıl — yalnızca yıl değişiminde */}
            {(i === 0 || isNewYear) && (
              <text x={x + barW / 2} y={chartH + 26} textAnchor="middle" fontSize={8} fill="#C0BDB5" fontFamily="inherit">
                {year}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KullanimGecmisiPage() {
  const { data: sub } = useQuery<SubInfo>({
    queryKey: ['subscription'],
    queryFn: () =>
      api.get<SubInfo>('/subscriptions/me').then((r: { data: SubInfo }) => r.data),
  })

  const { data: myTools } = useQuery<ToolPurchase[]>({
    queryKey: ['my-tools'],
    queryFn: () =>
      api.get<{ success: boolean; data: ToolPurchase[] }>('/payments/my-tools')
         .then((r: { data: { success: boolean; data: ToolPurchase[] } }) => r.data.data),
  })

  const earliestToolDate = myTools && myTools.length > 0
    ? myTools.reduce((min, t) => t.purchasedAt < min ? t.purchasedAt : min, myTools[0].purchasedAt)
    : undefined

  const billingDay = getBillingDay(sub?.startedAt, earliestToolDate)

  const { data: history, isLoading, isError } = useQuery<PeriodUsage[]>({
    queryKey: ['usage-history', billingDay],
    queryFn: () =>
      api.get<PeriodUsage[]>(`/tools/usage/history?months=6&startDay=${billingDay}`).then(
        (r: { data: PeriodUsage[] }) => r.data
      ),
    enabled: sub !== undefined || myTools !== undefined,
  })

  // Derived stats
  const totalUsed    = history?.reduce((s, m) => s + m.totalUsed, 0) ?? 0
  const activeMonths = history?.filter((m) => m.totalUsed > 0).length ?? 0
  const monthlyAvg   = activeMonths > 0 ? Math.round(totalUsed / activeMonths) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📊</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Kullanım Geçmişi</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">
          Son 6 fatura dönemi araç kullanım istatistikleriniz
          {billingDay > 1 && (
            <span className="ml-1 text-[#9A9792]">· fatura günü: her ayın {billingDay}. günü</span>
          )}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
          <p className="text-[11px] text-[#9A9792] mb-1">Toplam Kullanım</p>
          <p className="text-[24px] font-bold text-[#1C1B19] leading-none mb-1">
            {isLoading ? '—' : String(totalUsed)}
          </p>
          <p className="text-[11px] text-[#9A9792]">son 6 dönem</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
          <p className="text-[11px] text-[#9A9792] mb-1">Aktif Dönem</p>
          {isLoading ? (
            <p className="text-[24px] font-bold text-[#1C1B19] leading-none mb-1">—</p>
          ) : activeMonths === 0 ? (
            <>
              <p className="text-[24px] font-bold text-[#C0BDB5] leading-none mb-1">—</p>
              <p className="text-[11px] text-[#C0BDB5]">henüz kullanım yok</p>
            </>
          ) : (
            <>
              <p className="text-[24px] font-bold text-[#1C1B19] leading-none mb-1">{activeMonths}</p>
              <p className="text-[11px] text-[#9A9792]">{activeMonths === 1 ? 'dönem' : 'dönem'} kullanım var</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 text-center">
          <p className="text-[11px] text-[#9A9792] mb-1">Dönem Ortalaması</p>
          <p className="text-[24px] font-bold text-[#1C1B19] leading-none mb-1">
            {isLoading ? '—' : activeMonths === 0 ? '—' : String(monthlyAvg)}
          </p>
          <p className="text-[11px] text-[#9A9792]">kullanım/dönem</p>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-4">
          Dönem Başına Kullanım
        </h2>

        {isLoading && <div className="h-[166px] bg-[#F7F6F2] rounded-lg animate-pulse" />}
        {isError && <p className="text-[13px] text-[#9A9792] text-center py-8">Veriler yüklenirken hata oluştu.</p>}
        {!isLoading && !isError && (!history || history.length === 0) && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">Henüz kullanım verisi bulunmuyor.</p>
        )}
        {history && history.length > 0 && <BarChart data={history} />}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider">
            Dönem Detayı
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
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-left">
                    Dönem
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right">
                    Kullanım
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right">
                    İlerleme
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((row) => {
                  // İlerleme: dönemler arası göreli (en yoğun döneme göre %)
                  const maxUsed = Math.max(...history.map((d) => d.totalUsed), 1)
                  const pct     = Math.round((row.totalUsed / maxUsed) * 100)
                  const label   = longPeriodLabel(row.periodStart, row.periodEnd)

                  return (
                    <tr
                      key={row.periodStart}
                      className="border-b border-[#F2F1ED] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                    >
                      {/* Dönem */}
                      <td className="px-5 py-3 text-[#1C1B19] font-medium whitespace-nowrap">
                        {label}
                      </td>

                      {/* Kullanım — sadece toplam sayı */}
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className={row.totalUsed > 0 ? 'text-[#1C1B19] font-semibold' : 'text-[#9A9792]'}>
                          {row.totalUsed}
                        </span>
                      </td>

                      {/* İlerleme bar */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-[#1D9E75]'
                              }`}
                              style={{ width: `${row.totalUsed > 0 ? Math.max(pct, 6) : 0}%` }}
                            />
                          </div>
                          <span className="text-[12px] text-[#9A9792] w-8 text-right tabular-nums">
                            {row.totalUsed > 0 ? `%${pct}` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && (!history || history.length === 0) && !isError && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">Henüz kullanım verisi bulunmuyor.</p>
        )}

        {/* Dipnot */}
        <div className="px-5 pb-4 pt-2 border-t border-[#F2F1ED]">
          <p className="text-[11px] text-[#9A9792]">
            💡 Araç başına kullanım limitiniz için{' '}
            <a href="/hesabim/arac-kullanim" className="text-[#1D9E75] hover:underline">Araç Başına Kullanım</a>{' '}
            sayfasına bakabilirsiniz. Araç aboneliğiniz varsa o araçlar için farklı limit geçerlidir.
          </p>
        </div>
      </div>
    </div>
  )
}
