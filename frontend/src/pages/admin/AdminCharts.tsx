import { TOOL_LABELS, type MonthlyStat, type ToolBreakdown, shortMonth } from './adminConstants'

// ─── Chart 1: Aktif + Yeni Kayıt grouped bars ────────────────────────────────

export function UserActivityChart({ data }: { data: MonthlyStat[] }) {
  if (data.length === 0) return null

  const barW    = 13
  const gapIn   = 3            // gap between bars in a group
  const gapOut  = 14           // gap between groups
  const groupW  = barW * 2 + gapIn
  const padX    = 28
  const chartH  = 90
  const totalW  = data.length * (groupW + gapOut) - gapOut + padX * 2

  const maxVal  = Math.max(...data.flatMap((d) => [d.activeUsers, d.newRegistrations]), 1)
  const toBarH  = (v: number) => Math.max((v / maxVal) * chartH, v > 0 ? 3 : 0)

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 44}`} className="w-full overflow-visible">
      {/* Legend */}
      <g transform={`translate(${padX}, 0)`}>
        <rect width={10} height={10} rx={2} fill="#1D9E75" />
        <text x={14} y={9} fontSize={9} fill="#6B6963" fontFamily="inherit">Aktif Kullanıcı</text>
        <rect x={110} width={10} height={10} rx={2} fill="#3B82F6" />
        <text x={124} y={9} fontSize={9} fill="#6B6963" fontFamily="inherit">Yeni Kayıt</text>
      </g>
      {/* Baseline */}
      <line x1={padX} y1={chartH + 14} x2={totalW - padX} y2={chartH + 14} stroke="#E2E0D8" strokeWidth={1} />
      {data.map((d, i) => {
        const gx      = padX + i * (groupW + gapOut)
        const hActive = toBarH(d.activeUsers)
        const hNew    = toBarH(d.newRegistrations)
        return (
          <g key={d.monthYear}>
            <rect x={gx} y={chartH + 14 - hActive} width={barW} height={hActive} rx={3} fill="#1D9E75" opacity={0.85} />
            {d.activeUsers > 0 && (
              <text x={gx + barW / 2} y={chartH + 14 - hActive - 3} textAnchor="middle" fontSize={8} fill="#1D9E75" fontFamily="inherit">
                {d.activeUsers}
              </text>
            )}
            <rect x={gx + barW + gapIn} y={chartH + 14 - hNew} width={barW} height={hNew} rx={3} fill="#3B82F6" opacity={0.85} />
            {d.newRegistrations > 0 && (
              <text x={gx + barW + gapIn + barW / 2} y={chartH + 14 - hNew - 3} textAnchor="middle" fontSize={8} fill="#3B82F6" fontFamily="inherit">
                {d.newRegistrations}
              </text>
            )}
            <text x={gx + groupW / 2} y={chartH + 27} textAnchor="middle" fontSize={9} fill="#9A9792" fontFamily="inherit">
              {shortMonth(d.monthYear)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Chart 2: Tool breakdown horizontal bars ──────────────────────────────────

export function ToolBreakdownChart({ data }: { data: ToolBreakdown[] }) {
  if (data.length === 0) return (
    <p className="text-[12px] text-[#9A9792] text-center py-6">Henüz kullanım verisi yok.</p>
  )

  const rowH    = 22
  const labelW  = 120
  const padX    = 8
  const maxVal  = Math.max(...data.map((d) => d.totalUsed), 1)
  const svgW    = 320
  const barMaxW = svgW - labelW - padX * 2 - 30
  const svgH    = data.length * rowH

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible">
      {data.map((d, i) => {
        const y     = i * rowH
        const barW  = Math.max((d.totalUsed / maxVal) * barMaxW, d.totalUsed > 0 ? 4 : 0)
        const label = TOOL_LABELS[d.toolId] ?? d.toolId
        return (
          <g key={d.toolId}>
            <text x={padX} y={y + rowH * 0.7} fontSize={9} fill="#6B6963" fontFamily="inherit">{label}</text>
            <rect x={labelW} y={y + 4} width={barW} height={rowH - 10} rx={3} fill="#1D9E75" opacity={0.75} />
            {d.totalUsed > 0 && (
              <text x={labelW + barW + 4} y={y + rowH * 0.7} fontSize={9} fill="#1D9E75" fontFamily="inherit" fontWeight={600}>
                {d.totalUsed}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
