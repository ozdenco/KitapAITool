import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { AdminStats } from './adminConstants'

// ─── Section cards ────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    to: '/admin/istatistikler',
    icon: '📊',
    label: 'İstatistikler',
    description: 'Aylık kullanım grafikleri, araç dağılımı ve büyüme trendleri',
    color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    to: '/admin/kullanici-listesi',
    icon: '👥',
    label: 'Kullanıcı Listesi',
    description: 'Kayıtlı kullanıcıları listele, filtrele ve detaylarına bak',
    color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  {
    to: '/admin/kullanici-islemleri',
    icon: '⚙️',
    label: 'Kullanıcı İşlemleri',
    description: 'Kullanıcı planlarını güncelle, paket ver, hesap yönet',
    color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
    iconBg: 'bg-violet-100 text-violet-700',
  },
  {
    to: '/admin/paket-islemleri',
    icon: '📦',
    label: 'Paket İşlemleri',
    description: 'Abonelik planlarını düzenle, fiyat ve limit ayarla',
    color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    to: '/admin/arac-fiyatlari',
    icon: '🏷️',
    label: 'Araç Fiyatları',
    description: 'Tekil araç abonelik fiyatlarını ve limitlerini güncelle',
    color: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
    iconBg: 'bg-orange-100 text-orange-700',
  },
  {
    to: '/admin/kullanim-raporu',
    icon: '📋',
    label: 'Kullanım Raporu',
    description: 'Araç çıktılarını gör, logları takip et, detaylara eriş',
    color: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50',
    iconBg: 'bg-rose-100 text-rose-700',
  },
] as const

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 text-center">
      <p className="text-[11px] text-[#9A9792] uppercase tracking-wider mb-2">{label}</p>
      <p className="text-[30px] font-bold text-[#1C1B19] leading-none mb-1">{value}</p>
      <p className="text-[11px] text-[#9A9792]">{sub}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminAnaSayfaPage() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AdminStats }>('/admin/stats')
      if (!res.data.success) throw new Error('İstatistikler yüklenemedi')
      return res.data.data
    },
  })

  // This month's usage from monthlyStats
  const monthlyStats = stats?.monthlyStats ?? []
  const thisMonth = monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1] : undefined

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">🔐</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Yönetici Paneli</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">
          Platform yönetimi — kullanıcılar, paketler, araçlar ve raporlar
        </p>
      </div>

      {/* ── Stats ── */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-[108px] bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Toplam Kullanıcı"   value={stats.totalUsers}       sub="kayıtlı" />
          <StatCard label="Aktif Kullanıcı"    value={stats.activeUsers}      sub="bu ay" />
          <StatCard label="Toplam Kullanım"    value={stats.totalEvaluations} sub="tüm zamanlar" />
          <StatCard
            label="Bu Ay"
            value={thisMonth?.totalUsed ?? 0}
            sub="araç kullanımı"
          />
        </div>
      ) : null}

      {/* ── Sections grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {SECTIONS.map(({ to, icon, label, description, color, iconBg }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`flex items-start gap-4 bg-white rounded-2xl border p-5 text-left transition-all group ${color}`}
          >
            <span className={`w-10 h-10 flex items-center justify-center rounded-xl text-[18px] shrink-0 ${iconBg}`}>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#1C1B19] mb-1 group-hover:text-[#085041] transition-colors">
                {label}
              </p>
              <p className="text-[12px] text-[#9A9792] leading-relaxed">
                {description}
              </p>
            </div>
            <span className="text-[#C0BDB5] group-hover:text-[#1D9E75] transition-colors mt-0.5 shrink-0">
              →
            </span>
          </button>
        ))}
      </div>

    </div>
  )
}
