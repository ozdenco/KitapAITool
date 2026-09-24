import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'
import { ACTIVE_TOOLS, TOOL_CATEGORIES } from '@/lib/tools'
import { SiteFooter } from '@/components/SiteFooter'

const ACCOUNT_ITEMS = [
  { to: '/hesabim/profil',          label: 'Profil Bilgileri',     icon: '👤' },
  { to: '/hesabim/isletme-bilgilerim', label: 'İşletme Bilgilerim', icon: '🏢' },
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
  { to: '/admin/arac-fiyatlari',      label: 'Araç Fiyatları',      icon: '🏷️' },
  { to: '/admin/kullanim-raporu',     label: 'Kullanım Raporu',     icon: '📋' },
  { to: '/admin/kullanim-gecmisi',    label: 'Kullanım Geçmişi',    icon: '📊' },
  { to: '/admin/tum-ciktilar',        label: 'Tüm Çıktılar',        icon: '📄' },
] as const

// ─── Tools dropdown ───────────────────────────────────────────────────────────

function ToolsDropdown() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const grouped = Object.entries(TOOL_CATEGORIES)
    .map(([key, label]) => ({
      key,
      label,
      tools: ACTIVE_TOOLS.filter((t) => t.category === key),
    }))
    .filter((g) => g.tools.length > 0)

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Metin → dashboard'a gider */}
      <button
        onClick={() => { setOpen(false); navigate('/dashboard') }}
        className={clsx(
          'pl-3 pr-1 py-1.5 rounded-l-lg text-sm font-medium transition-colors',
          open ? 'text-[#1D9E75]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        )}
      >
        Araçlar
      </button>

      {/* Ok → dropdown'ı açar/kapar */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={clsx(
          'pr-2 pl-0.5 py-1.5 rounded-r-lg transition-colors',
          open ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
        )}
      >
        <svg
          className={clsx('w-3 h-3 transition-transform', open && 'rotate-180')}
          viewBox="0 0 10 6" fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-[#E2E0D8] rounded-2xl shadow-lg overflow-hidden min-w-[240px]">
          {grouped.map(({ key, label, tools }) => (
            <div key={key}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">
                {label}
              </p>
              <nav className="flex flex-col gap-[2px] px-2 pb-2">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => { setOpen(false); navigate(`/arac/${tool.id}`) }}
                    className="flex items-center gap-[9px] px-[11px] py-[7px] rounded-xl text-[13px] font-medium text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041] transition-colors text-left w-full"
                  >
                    <span className="text-[14px] leading-none">{tool.icon}</span>
                    <span>{tool.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          ))}
          <div className="border-t border-[#F2F1ED] p-2">
            <button
              onClick={() => { setOpen(false); navigate('/dashboard') }}
              className="flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium text-[#1D9E75] hover:bg-[#F0FAF6] transition-colors w-full"
            >
              <span className="text-[14px]">🏠</span>
              <span>Tüm Araçlar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin dropdown (split: metin → /admin, ok → menü) ───────────────────────

function AdminDropdown() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Metin → /admin */}
      <button
        onClick={() => { setOpen(false); navigate('/admin') }}
        className={clsx(
          'pl-3 pr-1 py-1.5 rounded-l-lg text-sm font-medium transition-colors',
          open
            ? 'text-amber-700'
            : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50',
        )}
      >
        🔐 Yönetici İşlemleri
      </button>

      {/* Ok → dropdown */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={clsx(
          'pr-2 pl-0.5 py-1.5 rounded-r-lg transition-colors',
          open
            ? 'bg-amber-500/10 text-amber-700'
            : 'text-amber-500 hover:text-amber-700 hover:bg-amber-50',
        )}
      >
        <svg
          className={clsx('w-3 h-3 transition-transform', open && 'rotate-180')}
          viewBox="0 0 10 6" fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-[#E2E0D8] rounded-2xl shadow-lg overflow-hidden min-w-[220px]">
          <nav className="flex flex-col gap-[2px] p-2">
            {ADMIN_ITEMS.map(({ to, label, icon }) => (
              <button
                key={to}
                onClick={() => { setOpen(false); navigate(to) }}
                className="flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium text-[#3A3935] hover:bg-amber-50 hover:text-amber-800 transition-colors text-left w-full"
              >
                <span className="text-[14px] leading-none">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}

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

          {/*
            Logo → Dashboard.

            Önceden tanıtım sitesine (kolaykobi.com) ve YENİ SEKMEDE gidiyordu.
            Giriş yapmış kullanıcı logoya uygulamanın ana sayfasına dönmek için
            tıklar; bu beklenti karşılanmayınca kullanıcı yanlışlıkla siteden
            çıkıyordu (29 Ağu 2026 kullanıcı geri bildirimi).
          */}
          <Link to="/dashboard" className="flex items-center" aria-label="Panele dön">
            <Logo height={34} adiGoster />
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <ToolsDropdown />

            {user?.isAdmin && <AdminDropdown />}
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
      <SiteFooter />
    </div>
  )
}
