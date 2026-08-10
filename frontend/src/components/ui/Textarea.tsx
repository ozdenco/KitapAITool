interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className = '', ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-[6px]">
      {label && (
        <label className="text-[13px] font-medium text-[#6B6963]">{label}</label>
      )}
      {hint && <p className="text-[12px] text-[#9A9792]">{hint}</p>}
      <textarea
        rows={4}
        className={`rounded-lg border px-[12px] py-[10px] text-[14px] text-[#1C1B19] bg-white outline-none transition resize-y leading-relaxed min-h-[80px]
          focus:ring-2 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75]
          placeholder:text-[#A9A8A3]
          ${error ? 'border-red-400' : 'border-[#D3D1C7]'}
          ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
