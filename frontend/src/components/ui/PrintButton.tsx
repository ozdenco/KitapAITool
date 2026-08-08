interface PrintButtonProps {
  className?: string
  label?: string
}

/**
 * Tarayıcının yazdır/PDF diyaloğunu açar.
 * @media print kuralları Layout.tsx'de — sadece .print-result alanı görünür.
 */
export function PrintButton({ className = '', label = '🖨️ PDF / Yazdır' }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200
        text-sm font-medium text-gray-600 bg-white hover:bg-gray-50
        hover:border-gray-300 transition-colors ${className}`}
    >
      {label}
    </button>
  )
}
