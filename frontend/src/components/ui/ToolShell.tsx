import { type ReactNode, useEffect, useState } from 'react'
import { useToolUsageById } from '@/hooks/useToolUsage'
import { UsageBar } from './UsageBar'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

interface ToolShellProps {
  toolId: string
  title: string
  icon: string
  description: string
  /** Sonuç mevcut mu? → formu otomatik daraltır */
  hasResult: boolean
  /** Form doluysa beforeunload uyarısı aktifleşir */
  formHasInput: boolean
  /** Render prop: isFormOpen durumu child'a iletilir */
  children: (props: { isFormOpen: boolean }) => ReactNode
}

/**
 * Tüm araç sayfaları için ortak kabuk:
 *  - Başlık + açıklama
 *  - Aylık kullanım çubuğu (UsageBar)
 *  - Form daralt / genişlet yönetimi
 *  - Sayfa terk uyarısı (beforeunload)
 *  - Print: .tool-results dışındaki alanları gizler (@media print)
 */
export function ToolShell({
  toolId,
  title,
  icon,
  description,
  hasResult,
  formHasInput,
  children,
}: ToolShellProps) {
  const { usage } = useToolUsageById(toolId)
  const [isFormOpen, setIsFormOpen] = useState(true)

  // Sonuç gelince formu otomatik daralt
  useEffect(() => {
    if (hasResult) setIsFormOpen(false)
  }, [hasResult])

  // Form doluyken sayfa terk uyarısı
  useBeforeUnload(formHasInput && !hasResult)

  const isAtLimit = usage != null && usage.limit != null && usage.usedCount >= usage.limit

  return (
    <div className="w-full max-w-2xl px-4 py-8">
      {/* ── Başlık ────────────────────────────────────────── */}
      <div className="mb-6 no-print">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Kullanım Çubuğu ───────────────────────────────── */}
      {usage != null && (
        <div className="mb-5 no-print">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm
              ${isAtLimit
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200'}`}
          >
            {/* Renk noktaları */}
            <span className="flex gap-1">
              {Array.from({ length: usage.limit ?? 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < usage.usedCount
                      ? isAtLimit ? 'bg-red-500' : 'bg-[#1D9E75]'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </span>
            <UsageBar
              used={usage.usedCount}
              limit={usage.limit}
              showLabel={false}
              className="w-24"
            />
            <span className={isAtLimit ? 'text-red-600 font-medium' : 'text-gray-500'}>
              Aylık{' '}
              <strong className="text-gray-700">
                {usage.usedCount} / {usage.limit ?? '∞'}
              </strong>{' '}
              kullanım hakkınız var
            </span>
            {isAtLimit && (
              <span className="ml-auto text-xs text-red-600 font-medium">
                Limit doldu — Planı Yükselt
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Form Aç/Kapat toggle (sonuç varken) ──────────── */}
      {hasResult && (
        <div className="mb-4 no-print">
          <button
            type="button"
            onClick={() => setIsFormOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-sm text-[#1D9E75] font-medium hover:underline"
          >
            {isFormOpen ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                Formu Kapat
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                Formu Aç / Değiştir
              </>
            )}
          </button>
        </div>
      )}

      {/* ── İçerik (form + sonuç) ─────────────────────────── */}
      {children({ isFormOpen })}

      {/* ── PDF / Yazdır butonu ───────────────────────────── */}
      {hasResult && (
        <div className="mt-6 flex justify-end no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200
              text-sm font-medium text-gray-600 bg-white hover:bg-gray-50
              hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            PDF / Yazdır
          </button>
        </div>
      )}
    </div>
  )
}
