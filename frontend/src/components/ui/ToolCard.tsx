import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import type { Tool } from '@/types'
import { UsageBar } from './UsageBar'

interface ToolCardProps {
  tool: Tool
  used: number
  limit: number | null
  isLoading?: boolean
}

export function ToolCard({ tool, used, limit, isLoading }: ToolCardProps) {
  const navigate = useNavigate()
  const isAtLimit = limit !== null && used >= limit

  return (
    <button
      onClick={() => !isAtLimit && navigate(`/arac/${tool.id}`)}
      disabled={isAtLimit}
      className={clsx(
        'group w-full text-left rounded-xl border p-4 transition-all duration-200',
        'flex flex-col gap-2',
        isAtLimit
          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
          : 'border-gray-200 bg-white hover:border-[#1D9E75]/40 hover:shadow-md cursor-pointer',
      )}
    >
      {/* Header: icon + title inline */}
      <div className="flex items-start gap-2.5">
        <span className="text-[18px] leading-none shrink-0 mt-0.5">{tool.icon}</span>
        <h3 className="text-[13px] font-semibold text-gray-900 leading-snug group-hover:text-[#1D9E75] transition-colors">
          {tool.name}
        </h3>
      </div>

      {/* Description */}
      <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">{tool.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
        {isLoading ? (
          <div className="w-24 h-2 bg-gray-200 rounded-full animate-pulse" />
        ) : (
          <UsageBar used={used} limit={limit} />
        )}
        {!isLoading && isAtLimit && (
          <span className="text-xs text-red-500 font-medium">Limit doldu</span>
        )}
      </div>
    </button>
  )
}
