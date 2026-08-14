import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'

const ACCOUNT_ITEMS = [
  { to: '/hesabim/profil',          label: 'Profil Bilgileri',     icon: '👤' },
  { to: '/hesabim/abonelik',        label: 'Paket Bilgilerim',     icon: '📦' },
  { to: '/hesabim/paket-sec',       label: 'Paket Yükselt',        icon: '⬆️' },
  { to: '/hesabim/araclarim',       label: 'Araç Satın Al',        icon: '🛒' },
  { to: '/hesabim/odeme-gecmisi',   label: 'Ödeme Geçmişi',        icon: '💳' },
  { to: '/hesabim/gecmis-ciktilar', label: 'Geçmiş Çıktılarım',   icon: '📋' },
  { to: '/hesabim/arac-kullanim',   label: 'Araç Kullanımı',       icon: '📈' },
  { to: '/hesabim/kullanim-gecmisi',label: 'Kullanım Geçmişi',     icon: '📊' },
  { to: '/hesabim/sifre',           label: 'Şifre Değiştir',       icon: '🔒' },
] as const

const ADMIN_ITEMS = [
  { to: '/admin/istatistikler',       label: 'İstatistikler',       icon: '📊' },
  { to: '/admin/kullanici-listesi',   label: 'Kullanıcı Listesi',   icon: '👥' },
  { to: '/admin/kullanici-islemleri', label: 'Kullanıcı İşlemleri', icon: '⚙️' },
  { to: '/admin/paket-islemleri',     label: 'Paket İşlemleri',     icon: '📦' },
] as const

// ─── Generic dropdown ─────────────────────────────────────────────────────────

interface DropdownItem {
  to: string
  label: string
  icon: string
}

interface DropdownProps {
  trigger: React.ReactNode
  items: readonly DropdownItem[]
  footer?: React.ReactNode
  align?: 'left' | 'right'
}

function Dropdown({ trigger, items, footer, align = 'right' }: DropdownProps) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const navigate          = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v) }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </div>

      {open && (
        <div
          className={clsx(
            'absolute top-full mt-2 z-50 bg-white border border-[#E2E0D8] rounded-2xl shadow-lg overflow-hidden min-w-[200px]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <nav className="flex flex-col gap-[2px] p-2">
            {items.map(({ to, label, icon }) => (
              <button
                key={to}
                onClick={() => { setOpen(false); navigate(to) }}
                className="flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041] transition-colors text-left w-full"
              >
                <span className="text-[14px] leading-none">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
          {footer && (
            <div className="border-t border-[#F2F1ED] p-2">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Layout() {
  const { user } = useAuthStore()
  const logout   = useLogout()

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
            <Logo height={40} />
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

            {user?.isAdmin && (
              <Dropdown
                align="left"
                trigger={
                  <span className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5',
                    'text-amber-700 hover:text-amber-800 hover:bg-amber-50',
                  )}>
                    🔐 Yönetici İşlemleri
                    <svg className="w-3 h-3 opacity-60" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                    </svg>
                  </span>
                }
                items={ADMIN_ITEMS}
              />
            )}
          </nav>

          {/* User dropdown */}
          <Dropdown
            align="right"
            trigger={
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                <span className="hidden sm:block">{user?.name}</span>
                <svg className="w-3 h-3 opacity-50" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              </span>
            }
            items={ACCOUNT_ITEMS}
            footer={
              <button
                onClick={logout}
                className="flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <span className="text-[14px] leading-none">🚪</span>
                <span>Çıkış Yap</span>
              </button>
            }
          />
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
