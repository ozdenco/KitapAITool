import { useToolUsage } from '@/hooks/useToolUsage'
import { TOOLS } from '@/lib/tools'

// ─── Component ────────────────────────────────────────────────────────────────

export function AracKullanimPage() {
  const { data: usages, isLoading, isError } = useToolUsage()

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">📊</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Araç Başına Kullanım</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Bu ayki kullanım hakkınız araç bazında</p>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_110px_80px] gap-3 px-5 py-3 bg-[#F7F6F2] border-b border-[#E2E0D8]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Araç</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-center">Kullanım</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] text-right">Durum</span>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-[1px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
              <div key={n} className="h-[58px] bg-white border-b border-[#F0EFE9] last:border-b-0 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-[13px] text-[#9A9792] text-center py-10">
            Veriler yüklenemedi.
          </p>
        )}

        {!isLoading && !isError && TOOLS.map((tool) => {
          const usage = usages?.find((u) => u.toolId === tool.id)
          const used    = usage?.usedCount ?? 0
          const limit   = usage?.limit ?? null
          const pct     = limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null
          const isHigh  = (pct ?? 0) >= 80
          const isFull  = pct === 100

          return (
            <div
              key={tool.id}
              className="grid grid-cols-[1fr_110px_80px] gap-3 px-5 py-[14px] items-center border-b border-[#F0EFE9] last:border-b-0 hover:bg-[#FAFAF7] transition-colors"
            >
              {/* Araç adı */}
              <div className="flex items-center gap-[10px] min-w-0">
                <span className="text-[20px] shrink-0 leading-none">{tool.icon}</span>
                <p className="text-[13px] font-medium text-[#1C1B19] truncate">{tool.name}</p>
              </div>

              {/* Progress bar + count */}
              <div className="flex flex-col gap-1 items-center">
                {limit == null ? (
                  <span className="text-[13px] font-semibold text-[#1D9E75]">∞</span>
                ) : (
                  <>
                    <div className="w-full h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? 'bg-red-400' : isHigh ? 'bg-amber-400' : 'bg-[#1D9E75]'
                        }`}
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#9A9792] tabular-nums">
                      {used} / {limit}
                    </span>
                  </>
                )}
              </div>

              {/* Durum badge */}
              <div className="flex justify-end">
                {limit == null ? (
                  <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full bg-[#E6F9F2] text-[#085041] border border-[#9FE1CB]">
                    Admin
                  </span>
                ) : isFull ? (
                  <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full bg-red-50 text-red-700 border border-red-200">
                    Doldu
                  </span>
                ) : isHigh ? (
                  <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    %{pct}
                  </span>
                ) : used === 0 ? (
                  <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full bg-[#F2F1ED] text-[#9A9792] border border-[#D3D1C7]">
                    Kullanılmadı
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-[3px] rounded-full bg-[#E6F9F2] text-[#085041] border border-[#9FE1CB]">
                    Aktif
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-[#9A9792] text-center">
        Kullanım sayaçları her ayın 1'inde sıfırlanır.
      </p>
    </div>
  )
}
