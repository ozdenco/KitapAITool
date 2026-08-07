interface ResultCardProps {
  children: React.ReactNode
  className?: string
}

export function ResultCard({ children, className = '' }: ResultCardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

interface ResultSectionProps {
  title: string
  children: React.ReactNode
}

export function ResultSection({ title, children }: ResultSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  )
}
