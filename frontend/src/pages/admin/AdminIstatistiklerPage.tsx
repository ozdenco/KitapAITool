import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { UserActivityChart, ToolBreakdownChart } from './AdminCharts'
import type { AdminStats } from './adminConstants'

export function AdminIstatistiklerPage() {
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AdminStats }>('/admin/stats')
      if (!res.data.success) throw new Error('İstatistikler yüklenemedi')
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">
        İstatistikler yüklenemedi. Lütfen sayfayı yenileyin.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-[#1C1B19]">📊 İstatistikler</h1>
        <p className="text-[13px] text-[#6B6963] mt-0.5">Sistem geneli kullanım özeti</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '👤', label: 'Toplam Kullanıcı', value: stats.totalUsers },
          { icon: '📊', label: 'Toplam Kullanım',  value: stats.totalEvaluations },
          { icon: '📈', label: 'Aktif Kullanıcı',  value: stats.activeUsers },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#E2E0D8] p-4 flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-[22px] font-bold text-[#1C1B19] leading-none">{value}</p>
              <p className="text-[11px] text-[#9A9792] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4">
          <h2 className="text-[11px] font-semibold text-[#9A9792] uppercase tracking-wider mb-3">
            Kullanıcı Aktivitesi (Aylık)
          </h2>
          <UserActivityChart data={stats.monthlyStats} />
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4">
          <h2 className="text-[11px] font-semibold text-[#9A9792] uppercase tracking-wider mb-3">
            Araç Bazlı Kullanım
          </h2>
          <ToolBreakdownChart data={stats.toolBreakdown ?? []} />
        </div>
      </div>
    </div>
  )
}
