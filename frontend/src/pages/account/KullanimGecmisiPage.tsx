import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodUsage {
  periodStart: string
  periodEnd:   string
  totalUsed:   number
}

interface ToolPeriodUsage {
  toolId:    string
  usedCount: number
  limit:     number | null
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

/**
 * Backend [start, end) yarı-açık aralık kullanır — end dahil değil.
 * Gösterimde end'den 1 gün çıkararak inclusive bitiş tarihi hesaplanır.
 * Örn: periodEnd="2026-09-15" → gösterim "14 Eylül"
 */
function inclusiveEnd(periodEnd: string): { day: number; month: number; year: number } {
  const d = new Date(periodEnd)
  d.setUTCDate(d.getUTCDate() - 1)
  return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

function longPeriodLabel(periodStart: string, periodEnd: string): string {
  const s = parseDateParts(periodStart)
  const e = inclusiveEnd(periodEnd)
  const endStr   = `${e.day} ${TR_MONTHS_LONG[e.month - 1]} ${e.year}`
  const startStr = s.year === e.year
    ? `${s.day} ${TR_MONTHS_LONG[s.month - 1]}`
    : `${s.day} ${TR_MONTHS_LONG[s.month - 1]} ${s.year}`
  return `${startStr} – ${endStr}`
}

function shortPeriodLabel(periodStart: string, periodEnd: string): string {
  const s = parseDateParts(periodStart)
  const e = inclusiveEnd(periodEnd)
  return `${s.day} ${TR_MONTHS_SHORT[s.month - 1]} – ${e.day} ${TR_MONTHS_SHORT[e.month - 1]}`
}

function getBillingDay(subStartedAt?: string, toolPurchasedAt?: string): number {
  const raw = subStartedAt ?? toolPurchasedAt
  if (!raw) return 1
  const { day } = parseDateParts(raw)
  return Math.min(day, 28)
}

// ─── Bar Chart (SVG) ──────────────────────────────────────────────────────────

function BarChart({ data }: { data: PeriodUsage[] }) {
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
      style={{ maxHeight: '220px' }}
      aria-label="Fatura dönemi kullanım grafiği"
    >
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
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={8} fill="#9A9792" fontFamily="inherit">
              {`${day} ${TR_MONTHS_SHORT[month - 1]}`}
            </text>
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

// ─── Period Detail Table ───────────────────────────────────────────────────────

function PeriodDetailTable({
  periodStart,
  periodEnd,
}: {
  periodStart: string
  periodEnd:   string
}) {
  const { data, isLoading } = useQuery<ToolPeriodUsage[]>({
    queryKey: ['usage-period', periodStart, periodEnd],
    queryFn: () =>
      api.get<ToolPeriodUsage[]>(
        `/tools/usage/period?start=${periodStart}&end=${periodEnd}`
      ).then((r: { data: ToolPeriodUsage[] }) => r.data),
  })

  // Araç adını TOOLS listesinden bul
  function toolName(toolId: string): string {
    return TOOLS.find((t) => t.id === toolId)?.name ?? toolId
  }
  function toolIcon(toolId: string): string {
    return TOOLS.find((t) => t.id === toolId)?.icon ?? '🔧'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[1px] px-4 pb-4 pt-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-10 bg-[#F7F6F2] rounded animate-pulse mb-1" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-[13px] text-[#9A9792] text-center py-8">
        Bu dönemde hiç araç kullanılmamış.
      </p>
    )
  }

  // En az 1 kullanımı olan araçlar üstte; 0 olanlarda progress bar çizme
  const usedTools   = data.filter((t) => t.usedCount > 0)
  const unusedTools = data.filter((t) => t.usedCount === 0)
  const rows        = [...usedTools, ...unusedTools]

  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
          <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-left">
            Araç
          </th>
          <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right">
            Kullanım
          </th>
          <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right pr-4" style={{ width: 160 }}>
            Doluluk
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const pct = row.limit != null && row.limit > 0
            ? Math.min(100, Math.round((row.usedCount / row.limit) * 100))
            : row.usedCount > 0 ? 100 : 0
          const isHigh = pct >= 80
          const isFull = pct >= 100

          return (
            <tr
              key={row.toolId}
              className="border-b border-[#F2F1ED] last:border-0 hover:bg-[#FAFAF8] transition-colors"
            >
              {/* Araç adı */}
              <td className="px-4 py-[7px]">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] leading-none shrink-0">{toolIcon(row.toolId)}</span>
                  <span className={`text-[13px] ${row.usedCount > 0 ? 'text-[#1C1B19] font-medium' : 'text-[#9A9792]'}`}>
                    {toolName(row.toolId)}
                  </span>
                </div>
              </td>

              {/* Kullanım: X / Limit */}
              <td className="px-5 py-[11px] text-right tabular-nums whitespace-nowrap">
                {row.limit != null ? (
                  <span>
                    <span className={row.usedCount > 0 ? 'text-[#1C1B19] font-semibold' : 'text-[#9A9792]'}>
                      {row.usedCount}
                    </span>
                    <span className="text-[#C0BDB5]">/{row.limit}</span>
                  </span>
                ) : (
                  <span className="text-[#1C1B19] font-semibold">{row.usedCount}</span>
                )}
              </td>

              {/* Doluluk bar */}
              <td className="px-4 py-[7px]">
                <div className="flex items-center justify-end gap-2">
                  {row.limit != null ? (
                    <>
                      <div className="w-20 h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-red-400' : isHigh ? 'bg-amber-400' : 'bg-[#1D9E75]'
                          }`}
                          style={{ width: `${row.usedCount > 0 ? Math.max(pct, 5) : 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#9A9792] w-8 text-right tabular-nums">
                        {row.usedCount > 0 ? `%${pct}` : '—'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-[#9A9792]">∞</span>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
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

  // Seçili dönem — default: en güncel dönem (son eleman)
  const periods     = history ? [...history].reverse() : []
  const [selectedPeriodStart, setSelectedPeriodStart] = useState<string | null>(null)

  // history yüklendikten sonra default seçimi yap
  const activePeriodStart = selectedPeriodStart ?? periods[0]?.periodStart ?? null
  const activePeriod      = periods.find((p) => p.periodStart === activePeriodStart) ?? periods[0] ?? null

  // Derived stats
  const totalUsed    = history?.reduce((s, m) => s + m.totalUsed, 0) ?? 0
  const activeMonths = history?.filter((m) => m.totalUsed > 0).length ?? 0
  const monthlyAvg   = activeMonths > 0 ? Math.round(totalUsed / activeMonths) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📊</span>
          <h1 className="text-[16px] font-medium text-[#1C1B19]">Kullanım Geçmişi</h1>
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
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-3 text-center">
          <p className="text-[11px] text-[#9A9792] mb-1">Toplam Kullanım</p>
          <p className="text-[20px] font-bold text-[#1C1B19] leading-none mb-1">
            {isLoading ? '—' : String(totalUsed)}
          </p>
          <p className="text-[11px] text-[#9A9792]">son 6 dönem</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-3 text-center">
          <p className="text-[11px] text-[#9A9792] mb-1">Aktif Dönem</p>
          {isLoading ? (
            <p className="text-[20px] font-bold text-[#1C1B19] leading-none mb-1">—</p>
          ) : activeMonths === 0 ? (
            <>
              <p className="text-[20px] font-bold text-[#C0BDB5] leading-none mb-1">—</p>
              <p className="text-[11px] text-[#C0BDB5]">henüz kullanım yok</p>
            </>
          ) : (
            <>
              <p className="text-[20px] font-bold text-[#1C1B19] leading-none mb-1">{activeMonths}</p>
              <p className="text-[11px] text-[#9A9792]">dönem kullanım var</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-3 text-center">
          <p className="text-[11px] text-[#9A9792] mb-1">Dönem Ortalaması</p>
          <p className="text-[20px] font-bold text-[#1C1B19] leading-none mb-1">
            {isLoading ? '—' : activeMonths === 0 ? '—' : String(monthlyAvg)}
          </p>
          <p className="text-[11px] text-[#9A9792]">kullanım/dönem</p>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4">
        <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-3">
          Dönem Başına Kullanım
        </h2>
        {isLoading && <div className="h-[166px] bg-[#F7F6F2] rounded-lg animate-pulse" />}
        {isError && <p className="text-[13px] text-[#9A9792] text-center py-8">Veriler yüklenirken hata oluştu.</p>}
        {!isLoading && !isError && (!history || history.length === 0) && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">Henüz kullanım verisi bulunmuyor.</p>
        )}
        {history && history.length > 0 && <BarChart data={history} />}
      </div>

      {/* ── Dönem Detayı ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {/* Header + dönem seçici */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-4 border-b border-[#F0EFE9]">
          <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider shrink-0">
            Dönem Detayı
          </h2>

          {/* Combo */}
          {periods.length > 0 && (
            <select
              value={activePeriodStart ?? ''}
              onChange={(e) => setSelectedPeriodStart(e.target.value)}
              className="text-[13px] text-[#1C1B19] bg-[#F7F6F2] border border-[#E2E0D8] rounded-lg px-3 py-1.5 pr-7 appearance-none cursor-pointer hover:bg-[#F0EFE9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239A9792' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              {periods.map((p) => (
                <option key={p.periodStart} value={p.periodStart}>
                  {shortPeriodLabel(p.periodStart, p.periodEnd)}
                  {p.totalUsed > 0 ? ` (${p.totalUsed})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tablo */}
        {isLoading && (
          <div className="flex flex-col gap-2 px-5 pb-5 pt-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-10 bg-[#F7F6F2] rounded animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && activePeriod && (
          <div className="overflow-x-auto">
            <PeriodDetailTable
              periodStart={activePeriod.periodStart}
              periodEnd={activePeriod.periodEnd}
            />
          </div>
        )}

        {!isLoading && !activePeriod && (
          <p className="text-[13px] text-[#9A9792] text-center py-8">Henüz kullanım verisi bulunmuyor.</p>
        )}

        {/* Dipnot */}
        {activePeriod && (
          <div className="px-4 pb-3 pt-2 border-t border-[#F2F1ED]">
            <p className="text-[11px] text-[#9A9792]">
              💡 Araç başına kullanım limitiniz için{' '}
              <a href="/hesabim/arac-kullanim" className="text-[#1D9E75] hover:underline">Araç Başına Kullanım</a>{' '}
              sayfasına bakabilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
