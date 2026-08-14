import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useLogout } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: 'profil',          label: 'Profil Bilgileri',     icon: '👤' },
  { to: 'abonelik',        label: 'Paket Bilgilerim',     icon: '📦' },
  { to: 'paket-sec',       label: 'Paket Yükselt',        icon: '⬆️' },
  { to: 'araclarim',       label: 'Araç Satın Al',        icon: '🛒' },
  { to: 'odeme-gecmisi',   label: 'Ödeme Geçmişi',        icon: '💳' },
  { to: 'gecmis-ciktilar', label: 'Geçmiş Çıktılarım',   icon: '📋' },
  { to: 'arac-kullanim',   label: 'Araç Kullanımı',       icon: '📈' },
  { to: 'kullanim-gecmisi',label: 'Kullanım Geçmişi',     icon: '📊' },
  { to: 'sifre',           label: 'Şifre Değiştir',       icon: '🔒' },
] as const

export function HesabimLayout() {
  const { pathname } = useLocation()
  const logout = useLogout()

  // /hesabim → /hesabim/abonelik
  if (pathname === '/hesabim' || pathname === '/hesabim/') {
    return <Navigate to="/hesabim/abonelik" replace />
  }

  return (
    <div className="w-full max-w-[1100px] px-6 py-8 flex gap-6 items-start">
      {/* ── Sidebar ── */}
      <aside className="shrink-0 w-[210px]">
        <div className="bg-white rounded-2xl border border-[#E2E0D8]">
          <div className="px-4 pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9792]">
              ⚙️ Hesap Ayarları
            </p>
          </div>
          <nav className="flex flex-col gap-[2px] px-2 pb-2">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium transition-colors select-none ${
                    isActive
                      ? 'bg-[#1D9E75] text-white'
                      : 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]'
                  }`
                }
              >
                <span className="text-[15px] leading-none">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Çıkış Yap */}
          <div className="border-t border-[#F2F1ED] px-2 pb-2 pt-1">
            <button
              onClick={logout}
              className="flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <span className="text-[15px] leading-none">🚪</span>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
