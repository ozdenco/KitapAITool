import { Outlet, NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'

export function Layout() {
  const { user } = useAuthStore()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E2E0D8]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <a
            href="https://kolaykobi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Logo height={46} />
          </a>

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

            {user?.isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50',
                  )
                }
              >
                🔐 Admin
              </NavLink>
            )}

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
      <footer className="border-t border-[#E2E0D8] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">© 2026 KolayKOBİ — kolaykobi.com</span>
          <span className="text-xs text-gray-400">Dijital ajansınız artık bir yazılım</span>
        </div>
      </footer>
    </div>
  )
}
