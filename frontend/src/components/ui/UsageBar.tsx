import { clsx } from 'clsx'

interface UsageBarProps {
  used: number
  limit: number | null
  className?: string
  showLabel?: boolean
}

export function UsageBar({ used, limit, className, showLabel = true }: UsageBarProps) {
  const isUnlimited = limit === null
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100)
  const isNearLimit = !isUnlimited && pct >= 80
  const isAtLimit = !isUnlimited && used >= limit

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {!isUnlimited && (
        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-[#1D9E75]',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {showLabel && (
        <span className={clsx('text-xs', isAtLimit ? 'text-red-600 font-medium' : 'text-gray-500')}>
          {isUnlimited ? '∞ kullanım' : `${used}/${limit} kullanım`}
        </span>
      )}
    </div>
  )
}
