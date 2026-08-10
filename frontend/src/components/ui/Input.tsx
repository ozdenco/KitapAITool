import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#6B6963]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'w-full px-3 py-2.5 rounded-lg border text-sm text-[#1C1B19]',
            'transition-all duration-150',
            'placeholder:text-[#9A9792]',
            'focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]',
            error
              ? 'border-red-400 bg-red-50'
              : 'border-[#D3D1C7] bg-white hover:border-[#B4B2A9]',
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
