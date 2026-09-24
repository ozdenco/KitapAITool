import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

export function LegalLayout() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E2E0D8]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a
            href="https://kolaykobi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Logo height={34} adiGoster />
          </a>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Platforma Dön
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E0D8] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">© 2026 KolayKOBİ — kolaykobi.com</span>
          <div className="flex items-center gap-4">
            <a href="/satis-sozlesmesi" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Satış Sözleşmesi
            </a>
            <a href="/iptal-iade-kosullari" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              İptal &amp; İade
            </a>
            <a href="/kvkk" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              KVKK
            </a>
            <span className="text-xs text-gray-400">İşletmeniz için hazır iş çözümleri</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
