import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-[6px]">
        {label && (
          <label htmlFor={id} className="text-[13px] font-medium text-[#6B6963]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'w-full px-[12px] py-[10px] rounded-lg border text-[14px] text-[#1C1B19]',
            'transition-all duration-150',
            'placeholder:text-[#A9A8A3]',
            'focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75]',
            error
              ? 'border-red-400 bg-red-50'
              : 'border-[#D3D1C7] bg-white',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
