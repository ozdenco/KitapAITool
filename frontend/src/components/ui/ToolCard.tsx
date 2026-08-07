import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import type { Tool } from '@/types'
import { UsageBar } from './UsageBar'
import { TOOL_CATEGORIES } from '@/lib/tools'

interface ToolCardProps {
  tool: Tool
  used: number
  limit: number | null
}

export function ToolCard({ tool, used, limit }: ToolCardProps) {
  const navigate = useNavigate()
  const isAtLimit = limit !== null && used >= limit
  const categoryLabel = TOOL_CATEGORIES[tool.category]

  return (
    <button
      onClick={() => !isAtLimit && navigate(`/arac/${tool.id}`)}
      disabled={isAtLimit}
      className={clsx(
        'group w-full text-left rounded-xl border p-5 transition-all duration-200',
        'flex flex-col gap-3',
        isAtLimit
          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
          : 'border-gray-200 bg-white hover:border-[#1D9E75]/40 hover:shadow-md cursor-pointer',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{tool.icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {categoryLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-[#1D9E75] transition-colors">
          {tool.name}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{tool.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
        <UsageBar used={used} limit={limit} />
        {isAtLimit && (
          <span className="text-xs text-red-500 font-medium">Limit doldu</span>
        )}
      </div>
    </button>
  )
}
