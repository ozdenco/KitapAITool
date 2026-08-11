import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse } from '@/types'
import { EditModal, ResetPasswordModal, CreateUserModal } from './AdminModals'
import type { AdminUser } from './AdminModals'

// ─── Stats types ──────────────────────────────────────────────────────────────

interface MonthlyStat {
  monthYear: string
  totalUsed: number
  activeUsers: number
  newRegistrations: number
}

interface ToolBreakdown {
  toolId: string
  totalUsed: number
}

interface AdminStats {
  totalUsers: number
  totalEvaluations: number
  activeUsers: number
  monthlyStats: MonthlyStat[]
  toolBreakdown: ToolBreakdown[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  'gorunurluk-skoru':   'Görünürlük Skoru',
  'musteri-persona':    'Müşteri Persona',
  'icerik-takvimi':     'İçerik Takvimi',
  'whatsapp-satis':     'WhatsApp Script',
  'reklam-butce':       'Reklam Bütçe',
  'musteri-geri-donus': 'Geri Dönüş',
  'rakip-analiz':       'Rakip Analiz',
  'chatbot-senaryo':    'Chatbot Senaryo',
  'ai-gorunurluk':      'AI Görünürlük',
  'viral-video':        'Viral Video',
  'trend-video':        'Trend Video',
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Ücretsiz', standard: 'Standart', premium: 'Premium', enterprise: 'Kurumsal',
}

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-gray-100 text-gray-600',
  standard:   'bg-blue-100 text-blue-700',
  premium:    'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms  = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1)  return 'Az önce'
  if (min < 60) return `${min} dk önce`
  const hr  = Math.floor(min / 60)
  if (hr  < 24) return `${hr} saat önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} gün önce`
  return formatDate(iso)
}

function shortMonth(monthYear: string) {
  const [y, m] = monthYear.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
}

// ─── Chart 1: Aktif + Yeni Kayıt grouped bars ────────────────────────────────

function UserActivityChart({ data }: { data: MonthlyStat[] }) {
  if (data.length === 0) return null

  const barW    = 13
  const gapIn   = 3            // gap between bars in a group
  const gapOut  = 14           // gap between groups
  const groupW  = barW * 2 + gapIn
  const padX    = 28
  const chartH  = 90
  const totalW  = data.length * (groupW + gapOut) - gapOut + padX * 2

  const maxVal  = Math.max(...data.flatMap((d) => [d.activeUsers, d.newRegistrations]), 1)
  const toBarH  = (v: number) => Math.max((v / maxVal) * chartH, v > 0 ? 3 : 0)

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 44}`} className="w-full overflow-visible">
      {/* Legend */}
      <g transform={`translate(${padX}, 0)`}>
        <rect width={10} height={10} rx={2} fill="#1D9E75" />
        <text x={14} y={9} fontSize={9} fill="#6B6963" fontFamily="inherit">Aktif Kullanıcı</text>
        <rect x={110} width={10} height={10} rx={2} fill="#3B82F6" />
        <text x={124} y={9} fontSize={9} fill="#6B6963" fontFamily="inherit">Yeni Kayıt</text>
      </g>
      {/* Baseline */}
      <line x1={padX} y1={chartH + 14} x2={totalW - padX} y2={chartH + 14} stroke="#E2E0D8" strokeWidth={1} />
      {data.map((d, i) => {
        const gx     = padX + i * (groupW + gapOut)
        const hActive = toBarH(d.activeUsers)
        const hNew    = toBarH(d.newRegistrations)
        return (
          <g key={d.monthYear}>
            {/* Active bar */}
            <rect x={gx} y={chartH + 14 - hActive} width={barW} height={hActive} rx={3} fill="#1D9E75" opacity={0.85} />
            {d.activeUsers > 0 && (
              <text x={gx + barW / 2} y={chartH + 14 - hActive - 3} textAnchor="middle" fontSize={8} fill="#1D9E75" fontFamily="inherit">{d.activeUsers}</text>
            )}
            {/* New registrations bar */}
            <rect x={gx + barW + gapIn} y={chartH + 14 - hNew} width={barW} height={hNew} rx={3} fill="#3B82F6" opacity={0.85} />
            {d.newRegistrations > 0 && (
              <text x={gx + barW + gapIn + barW / 2} y={chartH + 14 - hNew - 3} textAnchor="middle" fontSize={8} fill="#3B82F6" fontFamily="inherit">{d.newRegistrations}</text>
            )}
            {/* Month label */}
            <text x={gx + groupW / 2} y={chartH + 27} textAnchor="middle" fontSize={9} fill="#9A9792" fontFamily="inherit">
              {shortMonth(d.monthYear)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Chart 2: Tool breakdown horizontal bars ──────────────────────────────────

function ToolBreakdownChart({ data }: { data: ToolBreakdown[] }) {
  if (data.length === 0) return (
    <p className="text-[12px] text-[#9A9792] text-center py-6">Henüz kullanım verisi yok.</p>
  )

  const rowH   = 22
  const labelW = 120
  const padX   = 8
  const maxVal = Math.max(...data.map((d) => d.totalUsed), 1)
  const svgW   = 320
  const barMaxW = svgW - labelW - padX * 2 - 30
  const svgH   = data.length * rowH

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full overflow-visible">
      {data.map((d, i) => {
        const y      = i * rowH
        const barW   = Math.max((d.totalUsed / maxVal) * barMaxW, d.totalUsed > 0 ? 4 : 0)
        const label  = TOOL_LABELS[d.toolId] ?? d.toolId
        return (
          <g key={d.toolId}>
            <text x={padX} y={y + rowH * 0.7} fontSize={9} fill="#6B6963" fontFamily="inherit">{label}</text>
            <rect x={labelW} y={y + 4} width={barW} height={rowH - 10} rx={3} fill="#1D9E75" opacity={0.75} />
            {d.totalUsed > 0 && (
              <text x={labelW + barW + 4} y={y + rowH * 0.7} fontSize={9} fill="#1D9E75" fontFamily="inherit" fontWeight={600}>{d.totalUsed}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Tool Badges ──────────────────────────────────────────────────────────────

function ToolBadges({ toolIds }: { toolIds: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (toolIds.length === 0) return <span className="text-gray-400 text-xs">—</span>
  const shown     = expanded ? toolIds : toolIds.slice(0, 2)
  const remaining = toolIds.length - 2
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((id) => (
        <span key={id} className="px-2 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#085041] text-xs">
          {TOOL_LABELS[id] ?? id}
        </span>
      ))}
      {!expanded && remaining > 0 && (
        <button onClick={() => setExpanded(true)} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">+{remaining}</button>
      )}
      {expanded && toolIds.length > 2 && (
        <button onClick={() => setExpanded(false)} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">gizle</button>
      )}
    </div>
  )
}

// ─── User Action Sidebar ──────────────────────────────────────────────────────

interface UserActionSidebarProps {
  user: AdminUser | null
  onEdit: () => void
  onResetPassword: () => void
  onToggleStatus: () => void
  onDelete: () => void
  onDetail: () => void
  isPending: boolean
}

function UserActionSidebar({ user, onEdit, onResetPassword, onToggleStatus, onDelete, onDetail, isPending }: UserActionSidebarProps) {
  return (
    <aside className="shrink-0 w-[190px] sticky top-4">
      <div className="bg-white rounded-2xl border border-[#E2E0D8]">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9792]">
            👤 Kullanıcı İşlemleri
          </p>
        </div>

        {!user ? (
          <p className="px-4 pb-4 text-[12px] text-[#9A9792]">Bir kullanıcıya tıklayın</p>
        ) : (
          <>
            {/* Selected user info */}
            <div className="px-4 pb-3 border-b border-[#F2F1ED]">
              <p className="text-[12px] font-medium text-[#1C1B19] truncate">{user.name}</p>
              <p className="text-[11px] text-[#9A9792] truncate">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-[10px] text-[#9A9792]">{user.isActive ? 'Aktif' : 'Pasif'}</span>
                {user.isAdmin && <span className="ml-1 text-[10px] text-[#1D9E75] font-semibold">Admin</span>}
              </div>
            </div>

            {/* Action buttons */}
            <nav className="flex flex-col gap-[2px] px-2 pb-3 pt-2">
              {[
                { icon: '✎', label: 'Düzenle',          onClick: onEdit,           cls: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
                { icon: '📊', label: 'Kullanım Geçmişi', onClick: onDetail,         cls: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
                { icon: '🔑', label: 'Şifre Sıfırla',    onClick: onResetPassword,  cls: 'text-amber-700 hover:bg-amber-50' },
                {
                  icon:  user.isActive ? '⏸' : '▶',
                  label: user.isActive ? 'Pasife Al'  : 'Aktif Et',
                  onClick: onToggleStatus,
                  cls:   user.isActive ? 'text-amber-700 hover:bg-amber-50 disabled:opacity-50' : 'text-green-700 hover:bg-green-50 disabled:opacity-50',
                  disabled: isPending,
                },
                { icon: '🗑', label: 'Kullanıcıyı Sil', onClick: onDelete,         cls: 'text-red-600 hover:bg-red-50' },
              ].map(({ icon, label, onClick, cls, disabled }) => (
                <button
                  key={label}
                  onClick={onClick}
                  disabled={disabled}
                  className={`flex items-center gap-[9px] px-[11px] py-[8px] rounded-xl text-[12px] font-medium transition-colors select-none ${cls}`}
                >
                  <span className="text-[14px] leading-none">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </aside>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminKullanicilarPage() {
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

  const [selectedUser,  setSelectedUser]  = useState<AdminUser | null>(null)
  const [editUser,      setEditUser]      = useState<AdminUser | null>(null)
  const [resetUser,     setResetUser]     = useState<AdminUser | null>(null)
  const [createOpen,    setCreateOpen]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null)
  const [search,        setSearch]        = useState('')

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AdminStats }>('/admin/stats')
      if (!res.data.success) throw new Error('İstatistikler yüklenemedi')
      return res.data.data
    },
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>('/admin/users')
      if (!res.data.success) throw new Error('Kullanıcılar yüklenemedi')
      return res.data.data ?? []
    },
  })

  const filtered = (data ?? []).filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.company && u.company.toLowerCase().includes(q))
  })

  const handleSaved = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    setSelectedUser(null)
  }

  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: res } = await api.patch<ApiResponse>(`/admin/users/${userId}/status`)
      if (!res.success) throw new Error((res as { error?: string }).error ?? 'Durum güncellenemedi')
    },
    onSuccess: handleSaved,
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: res } = await api.delete<ApiResponse>(`/admin/users/${userId}`)
      if (!res.success) throw new Error((res as { error?: string }).error ?? 'Kullanıcı silinemedi')
    },
    onSuccess: () => { setDeleteConfirm(null); handleSaved() },
  })

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Tüm Kullanıcılar</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem geneli kullanım istatistikleri</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input type="text" placeholder="Ad, e-posta veya şirket ara…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm flex-1 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40" />
          <button onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors whitespace-nowrap shrink-0">
            ➕ Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: '👤', label: 'Toplam Kullanıcı', value: stats?.totalUsers       ?? '—' },
          { icon: '📊', label: 'Toplam Kullanım',  value: stats?.totalEvaluations ?? '—' },
          { icon: '📈', label: 'Aktif Kullanıcı',  value: stats?.activeUsers      ?? '—' },
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
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Chart 1: User activity */}
          <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4">
            <h2 className="text-[11px] font-semibold text-[#9A9792] uppercase tracking-wider mb-3">
              Kullanıcı Aktivitesi (Aylık)
            </h2>
            <UserActivityChart data={stats.monthlyStats} />
          </div>

          {/* Chart 2: Tool breakdown */}
          <div className="bg-white rounded-2xl border border-[#E2E0D8] p-4">
            <h2 className="text-[11px] font-semibold text-[#9A9792] uppercase tracking-wider mb-3">
              Araç Bazlı Kullanım
            </h2>
            <ToolBreakdownChart data={stats.toolBreakdown ?? []} />
          </div>
        </div>
      )}

      {/* ── Table + Sidebar ── */}
      <div className="flex items-start gap-4">

        {/* Table */}
        <div className="flex-1 min-w-0">
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">
              Kullanıcılar yüklenemedi. Lütfen sayfayı yenileyin.
            </div>
          )}
          {!isLoading && !isError && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                      {['Ad / E-posta', 'Şirket', 'Plan', 'Kayıt', 'Son Giriş', 'Kullandığı Araçlar', 'Toplam', 'Durum / Rol'].map((col) => (
                        <th key={col} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-400">
                          {search ? 'Arama sonucu bulunamadı.' : 'Henüz kayıtlı kullanıcı yok.'}
                        </td>
                      </tr>
                    ) : filtered.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser((prev) => prev?.id === user.id ? null : user)}
                        className={`border-b border-[#F1EFE8] cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? 'bg-[#F0FAF6] hover:bg-[#E8F7F2]'
                            : `hover:bg-[#F7F6F2]/60 ${!user.isActive ? 'opacity-50' : ''}`
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.company || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[user.planType] ?? 'bg-gray-100 text-gray-600'}`}>
                            {PLAN_LABELS[user.planType] ?? user.planType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap" title={formatDate(user.lastLoginAt)}>{timeAgo(user.lastLoginAt)}</td>
                        <td className="px-4 py-3 max-w-[180px]"><ToolBadges toolIds={user.toolsUsed} /></td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-700">{user.totalToolUses}</span>
                          <div className="text-[10px] text-gray-400">kullanım</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                              {user.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                            {user.isAdmin
                              ? <span className="flex items-center gap-1 text-[#1D9E75] font-medium text-xs">🔐 Admin</span>
                              : <span className="text-gray-400 text-xs">User</span>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action sidebar */}
        <UserActionSidebar
          user={selectedUser}
          isPending={toggleStatusMutation.isPending}
          onEdit={() => { if (selectedUser) setEditUser(selectedUser) }}
          onResetPassword={() => { if (selectedUser) setResetUser(selectedUser) }}
          onToggleStatus={() => { if (selectedUser) toggleStatusMutation.mutate(selectedUser.id) }}
          onDelete={() => { if (selectedUser) setDeleteConfirm(selectedUser) }}
          onDetail={() => { if (selectedUser) navigate(`/admin/kullanici/${selectedUser.id}/gecmis`) }}
        />
      </div>

      {/* ── Modals ── */}
      {editUser  && <EditModal user={editUser} onClose={() => setEditUser(null)} onSaved={handleSaved} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onCreated={handleSaved} />}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-lg font-bold text-gray-900">Kullanıcıyı Sil</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email}) kullanıcısını silmek istediğinizden emin misiniz?
            </p>
            <p className="text-xs text-red-500 mb-6">Bu işlem geri alınamaz. Kullanıcının tüm verileri (abonelik, kullanım geçmişi) silinecektir.</p>
            {deleteMutation.isError && (
              <p className="text-sm text-red-500 mb-4">{(deleteMutation.error as Error)?.message ?? 'Silme işlemi başarısız.'}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleteMutation.isPending ? 'Siliniyor…' : '🗑 Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
