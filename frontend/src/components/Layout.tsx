import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'

export function Layout() {
  const { user } = useAuthStore()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#1D9E75] transition-colors"
          >
            <Logo height={32} />
          </button>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                )
              }
            >
              Araçlar
            </NavLink>
            <NavLink
              to="/hesabim"
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                )
              }
            >
              Hesabım
            </NavLink>
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">© 2026 KolayKOBİ — kolaykobi.com</span>
          <span className="text-xs text-gray-400">Dijital ajansınız artık bir yazılım</span>
        </div>
      </footer>
    </div>
  )
}
