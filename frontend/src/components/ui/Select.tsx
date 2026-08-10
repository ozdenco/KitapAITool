interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-[6px]">
      {label && (
        <label className="text-[13px] font-medium text-[#6B6963]">{label}</label>
      )}
      <select
        className={`rounded-lg border-[0.5px] px-[12px] py-[10px] text-[14px] text-[#1C1B19] bg-white outline-none transition
          focus:ring-2 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75]
          ${error ? 'border-red-400' : 'border-[#D3D1C7]'}
          ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
