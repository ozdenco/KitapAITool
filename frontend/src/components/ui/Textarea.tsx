interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className = '', ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <textarea
        rows={4}
        className={`rounded-lg border px-3 py-2.5 text-sm shadow-sm outline-none transition resize-none
          focus:ring-2 focus:ring-[#1D9E75]/40
          ${error ? 'border-red-400' : 'border-gray-300 focus:border-[#1D9E75]'}
          ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
