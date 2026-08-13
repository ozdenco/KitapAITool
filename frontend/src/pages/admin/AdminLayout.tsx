import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'

const ADMIN_NAV_ITEMS = [
  { to: '/admin/istatistikler',      label: 'İstatistikler',      icon: '📊' },
  { to: '/admin/kullanici-listesi',  label: 'Kullanıcı Listesi',  icon: '👥' },
  { to: '/admin/kullanici-islemleri',label: 'Kullanıcı İşlemleri',icon: '⚙️' },
  { to: '/admin/paket-islemleri',    label: 'Paket İşlemleri',    icon: '📦' },
  { to: '/admin/arac-fiyatlari',     label: 'Araç Fiyatları',     icon: '🏷️' },
  { to: '/admin/kullanim-raporu',    label: 'Kullanım Raporu',    icon: '📋' },
] as const

export function AdminLayout() {
  const { pathname } = useLocation()

  // /admin → /admin/istatistikler
  if (pathname === '/admin' || pathname === '/admin/') {
    return <Navigate to="/admin/istatistikler" replace />
  }

  return (
    <div className="w-full max-w-[1200px] px-6 py-8 flex gap-6 items-start">
      {/* ── Sidebar ── */}
      <aside className="shrink-0 w-[210px]">
        <div className="bg-white rounded-2xl border border-[#E2E0D8]">
          <div className="px-4 pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9792]">
              🔐 Yönetici İşlemleri
            </p>
          </div>
          <nav className="flex flex-col gap-[2px] px-2 pb-3">
            {ADMIN_NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium transition-colors select-none ${
                    isActive
                      ? 'bg-amber-500 text-white'
                      : 'text-[#3A3935] hover:bg-amber-50 hover:text-amber-800'
                  }`
                }
              >
                <span className="text-[15px] leading-none">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
