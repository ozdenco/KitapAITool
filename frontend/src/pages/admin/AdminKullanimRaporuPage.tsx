import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsageLogEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  toolId: string
  usedAt: string
  success: boolean
  inputSummary: string
  toolResultId?: string
  // Kayıt anındaki snapshot değerleri
  planNameAtTime: string
  planType: string
  usageCountBefore: number   // bu çalıştırmadan önceki kullanım sayısı
  usageCountAfter: number    // bu çalıştırmadan sonraki kullanım sayısı
  limitAtTime: number | null // null = sınırsız
}

interface UserMeta {
  id: string
  name: string
  email: string
}

interface ApiResponse {
  data: UsageLogEntry[]
  meta: { users: UserMeta[] }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.id, { name: t.name, icon: t.icon }]))

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  free:        { label: 'Ücretsiz', cls: 'bg-[#F2F1ED] text-[#6B6963]' },
  standard:    { label: 'Standart', cls: 'bg-blue-50 text-blue-700' },
  premium:     { label: 'Premium',  cls: 'bg-purple-50 text-purple-700' },
  enterprise:  { label: 'Kurumsal', cls: 'bg-amber-50 text-amber-700' },
}

const DATE_FILTERS = [
  { value: 'all', label: 'Tüm zamanlar' },
  { value: '7d',  label: 'Son 7 gün'    },
  { value: '30d', label: 'Son 30 gün'   },
  { value: '90d', label: 'Son 3 ay'     },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  )
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminKullanimRaporuPage() {
  const navigate = useNavigate()
  const [filterUser, setFilterUser] = useState('all')
  const [filterTool, setFilterTool] = useState('all')
  const [filterDate, setFilterDate] = useState('all')

  const { data: apiData, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ['admin-usage-log'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: UsageLogEntry[]; meta: { users: UserMeta[] } }>(
        '/admin/usage-log?limit=500'
      )
      if (!res.data.success) throw new Error('Veriler yüklenemedi')
      return { data: res.data.data, meta: res.data.meta }
    },
    staleTime: 60_000,
  })

  const allEntries = apiData?.data ?? []
  const users      = apiData?.meta.users ?? []

  // Client-side filters
  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      if (filterUser !== 'all' && e.userId !== filterUser) return false
      if (filterTool !== 'all' && e.toolId !== filterTool) return false
      if (filterDate !== 'all') {
        const days = daysSince(e.usedAt)
        if (filterDate === '7d'  && days > 7)  return false
        if (filterDate === '30d' && days > 30) return false
        if (filterDate === '90d' && days > 90) return false
      }
      return true
    })
  }, [allEntries, filterUser, filterTool, filterDate])

  const clearFilters = () => { setFilterUser('all'); setFilterTool('all'); setFilterDate('all') }
  const isFiltered   = filterUser !== 'all' || filterTool !== 'all' || filterDate !== 'all'

  return (
    <div className="flex flex-col gap-5">

      {/* ── Başlık ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-[10px] mb-[4px]">
            <span className="text-[22px] leading-none">📋</span>
            <h1 className="text-[20px] font-medium text-[#1C1B19]">Kullanım Raporu</h1>
          </div>
          <p className="text-[13px] text-[#6B6963]">
            Araç çalıştırma logları · paket · limit · rapor özeti
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="shrink-0 text-[12px] px-3 py-2 rounded-xl border border-[#D3D1C7] bg-white text-[#6B6963] hover:bg-[#F7F6F2] transition-colors"
        >
          ↻ Yenile
        </button>
      </div>

      {/* ── Filtreler ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4 flex flex-wrap items-center gap-3">

        {/* Kişi filtresi */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Kişi</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="text-[12px] px-3 py-2 border border-[#D3D1C7] rounded-xl bg-white text-[#3A3935] focus:outline-none focus:ring-2 focus:ring-amber-400/40 min-w-[180px]"
          >
            <option value="all">Tüm kullanıcılar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Araç filtresi */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Araç</label>
          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="text-[12px] px-3 py-2 border border-[#D3D1C7] rounded-xl bg-white text-[#3A3935] focus:outline-none focus:ring-2 focus:ring-amber-400/40 min-w-[200px]"
          >
            <option value="all">Tüm araçlar</option>
            {TOOLS.map((t) => (
              <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
            ))}
          </select>
        </div>

        {/* Tarih filtresi */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Tarih</label>
          <div className="flex gap-1">
            {DATE_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterDate(opt.value)}
                className={`text-[11px] px-3 py-2 rounded-xl border transition-colors ${
                  filterDate === opt.value
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                    : 'border-[#D3D1C7] bg-white text-[#6B6963] hover:border-[#B4B2A9]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Temizle + sayaç */}
        <div className="ml-auto flex items-end gap-3 pb-0.5">
          {isFiltered && (
            <>
              <span className="text-[11px] text-[#9A9792]">
                {filtered.length} / {allEntries.length} kayıt
              </span>
              <button
                onClick={clearFilters}
                className="text-[11px] text-[#9A9792] hover:text-red-500 transition-colors"
              >
                ✕ Temizle
              </button>
            </>
          )}
          {!isFiltered && !isLoading && (
            <span className="text-[11px] text-[#9A9792]">{allEntries.length} kayıt</span>
          )}
        </div>
      </div>

      {/* ── Tablo ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">

        {isLoading && (
          <div className="flex flex-col gap-2 p-5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-10 bg-[#F7F6F2] rounded animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-[13px] text-red-600 text-center py-10">
            Veriler yüklenirken hata oluştu.
          </p>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-[13px] text-[#9A9792]">Kayıt bulunamadı</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                  {[
                    { label: 'Kişi',               align: 'left'  },
                    { label: 'Araç',               align: 'left'  },
                    { label: 'Tarih / Saat',       align: 'left'  },
                    { label: 'Rapor',              align: 'left'  },
                    { label: 'Paketi (o an)',      align: 'center'},
                    { label: 'Limit/Araç (o an)', align: 'right' },
                    { label: 'Önce → Sonra',      align: 'right' },
                    { label: 'Durum',              align: 'center'},
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9A9792] text-${align}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const tool    = TOOL_MAP[e.toolId]
                  const badge   = PLAN_BADGE[e.planType] ?? PLAN_BADGE.free
                  const limit   = e.limitAtTime
                  const before  = e.usageCountBefore
                  const after   = e.usageCountAfter
                  const pctAfter = limit != null && limit > 0
                    ? Math.min(100, Math.round((after / limit) * 100))
                    : null
                  const isHigh  = (pctAfter ?? 0) >= 80

                  return (
                    <tr
                      key={e.id}
                      className="border-b border-[#F2F1ED] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                    >
                      {/* Kişi */}
                      <td className="px-4 py-3 min-w-[150px]">
                        <p className="font-medium text-[#1C1B19] leading-tight">{e.userName}</p>
                        <p className="text-[11px] text-[#9A9792] leading-tight">{e.userEmail}</p>
                      </td>

                      {/* Araç */}
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] leading-none">{tool?.icon ?? '🔧'}</span>
                          <span className="text-[#3A3935] font-medium leading-tight">
                            {tool?.name ?? e.toolId}
                          </span>
                        </div>
                      </td>

                      {/* Tarih/Saat */}
                      <td className="px-4 py-3 whitespace-nowrap text-[#6B6963] tabular-nums">
                        {formatDateTime(e.usedAt)}
                      </td>

                      {/* Rapor */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {e.toolResultId ? (
                          <button
                            onClick={() => navigate(`/admin/rapor/${e.toolResultId}`)}
                            className="text-left text-[12px] text-amber-700 underline underline-offset-2 decoration-amber-300 hover:decoration-amber-500 hover:text-amber-800 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Raporu görüntüle →
                          </button>
                        ) : (
                          <span className="text-[#C5C3BB]">—</span>
                        )}
                      </td>

                      {/* Paketi (o an) */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <p className="text-[10px] text-[#9A9792] mt-0.5 leading-tight">{e.planNameAtTime}</p>
                      </td>

                      {/* Limit/Araç (o an) */}
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {limit == null ? (
                          <span className="text-[#1D9E75]">∞</span>
                        ) : (
                          <span className="text-[#3A3935]">{limit}</span>
                        )}
                      </td>

                      {/* Önce → Sonra */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="tabular-nums text-[#9A9792]">{before}</span>
                          <span className="text-[#C5C3BB] text-[10px]">→</span>
                          <span className={`tabular-nums font-semibold ${isHigh ? 'text-amber-600' : 'text-[#1C1B19]'}`}>
                            {after}
                          </span>
                          {pctAfter != null && (
                            <div className="flex items-center gap-1 ml-1">
                              <div className="w-10 h-[4px] bg-[#E2E0D8] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isHigh ? 'bg-amber-400' : 'bg-[#1D9E75]'}`}
                                  style={{ width: `${pctAfter}%` }}
                                />
                              </div>
                              <span className={`text-[10px] tabular-nums ${isHigh ? 'text-amber-500' : 'text-[#9A9792]'}`}>
                                {pctAfter}%
                              </span>
                            </div>
                          )}
                          {limit == null && (
                            <span className="text-[10px] text-[#1D9E75] ml-1">∞</span>
                          )}
                        </div>
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-3 text-center">
                        {e.success ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FAF6] text-[#085041]">
                            ✓ Başarılı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                            ✗ Hata
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {allEntries.length >= 500 && (
        <p className="text-center text-[11px] text-[#9A9792]">
          Son 500 kayıt gösteriliyor — daha eski verilere ulaşmak için filtreleri kullanın
        </p>
      )}
    </div>
  )
}
