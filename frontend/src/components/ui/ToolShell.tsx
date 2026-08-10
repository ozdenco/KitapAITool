import { type ReactNode, useEffect, useState } from 'react'
import { useToolUsageById } from '@/hooks/useToolUsage'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

interface ToolShellProps {
  toolId: string
  title: string
  icon: string
  description: string
  hasResult: boolean
  formHasInput: boolean
  children: (props: { isFormOpen: boolean; header: ReactNode; rateBar: ReactNode }) => ReactNode
}

export function ToolShell({
  toolId,
  title,
  icon,
  description,
  hasResult,
  formHasInput,
  children,
}: ToolShellProps) {
  const { usage } = useToolUsageById(toolId)
  const [isFormOpen, setIsFormOpen] = useState(true)

  useEffect(() => {
    if (hasResult) setIsFormOpen(false)
  }, [hasResult])

  useBeforeUnload(formHasInput && !hasResult)

  const isAtLimit = usage != null && usage.limit != null && usage.usedCount >= usage.limit

  // ── header: title + description, rendered at the top of each page's form card ─
  const header: ReactNode = (
    <div className="mb-[1.5rem]">
      {/* Emoji icon + title row */}
      <div className="flex items-center gap-[10px] mb-[6px]">
        <span className="text-[26px] leading-none">{icon}</span>
        <h1 className="text-[22px] font-medium text-[#1C1B19]">{title}</h1>
      </div>
      <p className="text-[14px] text-[#6B6963] leading-relaxed">{description}</p>
    </div>
  )

  // ── rateBar: abonelik modeline göre dinamik kullanım göstergesi ──────────────
  const rateBar: ReactNode = usage != null ? (() => {
    const limit = usage.limit
    const used = usage.usedCount

    // Sınırsız plan (Enterprise / null limit)
    if (limit == null) {
      return (
        <div className="flex items-center gap-[12px] px-[14px] py-[9px] rounded-lg border border-[#E2E0D8] bg-[#F7F6F2] text-[12px]">
          <span className="text-[16px]">∞</span>
          <span className="text-[#6B6963]">
            Bu ay <strong className="text-[#1C1B19]">{used}</strong> kullanım · Sınırsız plan
          </span>
        </div>
      )
    }

    const pct = Math.min((used / limit) * 100, 100)
    const barColor = isAtLimit ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-[#1D9E75]'
    const containerCls = `flex items-center gap-[12px] px-[14px] py-[9px] rounded-lg border text-[12px] ${
      isAtLimit ? 'bg-red-50 border-red-200' : 'bg-[#F7F6F2] border-[#E2E0D8]'
    }`
    const labelCls = isAtLimit ? 'text-red-600 font-medium flex-1' : 'text-[#6B6963] flex-1'

    // Nokta gösterimi: limit ≤ 10 (Ücretsiz / Standart)
    if (limit <= 10) {
      return (
        <div className={containerCls}>
          <span className="flex gap-[5px]">
            {Array.from({ length: limit }).map((_, i) => (
              <span
                key={i}
                className={`w-[10px] h-[10px] rounded-full transition-colors ${
                  i < used ? (isAtLimit ? 'bg-red-500' : 'bg-[#1D9E75]') : 'bg-[#D3D1C7]'
                }`}
              />
            ))}
          </span>
          <span className={labelCls}>
            Aylık <strong className="text-[#1C1B19]">{used} / {limit}</strong> kullanım
          </span>
          {isAtLimit && <span className="text-[11px] text-red-600 font-medium whitespace-nowrap">Limit doldu</span>}
        </div>
      )
    }

    // Progress bar: limit > 10 (Premium ve üzeri)
    return (
      <div className={containerCls}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-[5px]">
            <span className={labelCls}>
              Aylık <strong className="text-[#1C1B19]">{used} / {limit}</strong> kullanım
            </span>
            {isAtLimit && <span className="text-[11px] text-red-600 font-medium whitespace-nowrap ml-2">Limit doldu</span>}
          </div>
          <div className="h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    )
  })() : null

  return (
    <div className="w-full max-w-[720px] px-4 py-8">
      {/* Collapsed bar — shown when form is closed and result exists */}
      {hasResult && !isFormOpen && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] px-6 py-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <p className="text-[14px] font-medium text-[#1C1B19]">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-[5px] px-[14px] py-[7px] bg-[#F0FAF6] border border-[#9FE1CB] rounded-lg text-[13px] font-medium text-[#085041] whitespace-nowrap hover:bg-[#E1F5EE]"
          >
            Formu Düzenle
          </button>
        </div>
      )}

      {/* Children (form + results) */}
      {children({ isFormOpen, header, rateBar })}

      {/* Print button */}
      {hasResult && (
        <div className="mt-6 flex justify-end no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-[14px] py-[8px] rounded-lg border border-[#D3D1C7]
              text-[13px] font-medium text-[#6B6963] bg-white hover:bg-[#F7F6F2] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            PDF / Yazdır
          </button>
        </div>
      )}
    </div>
  )
}
