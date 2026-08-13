import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse } from '@/types'
import { EditModal, ResetPasswordModal } from './AdminModals'
import type { AdminUser } from './AdminModals'
import { formatDate, timeAgo, TOOL_LABELS, PLAN_LABELS, PLAN_COLORS } from './adminConstants'

// ─── Plan Change Modal ────────────────────────────────────────────────────────

interface PaketDegistirModalProps {
  user: AdminUser
  onClose: () => void
  onSaved: () => void
}

type PlanAction = 'free' | 'set' | 'expire'

interface PlanOption {
  action: PlanAction
  label: string
  description: string
  cls: string
  planType?: string
}

const PLAN_OPTIONS: PlanOption[] = [
  { action: 'free',   label: '🎁 Ücretsiz',     description: 'Ücretsiz plana al, süresiz',  cls: 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700' },
  { action: 'set',    label: '⭐ Standart',      description: '10 hak/araç, +1 ay',          cls: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',       planType: 'standard' },
  { action: 'set',    label: '💎 Premium',       description: '25 hak/araç, +1 ay',          cls: 'bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-700', planType: 'premium' },
  { action: 'set',    label: '🏢 Kurumsal',      description: 'Sınırsız hak, +1 ay',         cls: 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700',    planType: 'enterprise' },
  { action: 'expire', label: '⏰ Süresi Doldur', description: 'Aboneliği dün bitmiş say',    cls: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700' },
]

function PaketDegistirModal({ user, onClose, onSaved }: PaketDegistirModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Fetch plans to get plan IDs
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get<{ id: number; type: string; name: string }[]>('/subscriptions/plans')
      return res.data
    },
  })

  const getPlanId = (planType: string): number | undefined =>
    plans?.find((p) => p.type === planType)?.id

  const handleAction = async (action: PlanAction, planType?: string) => {
    setError(null)
    const key = action === 'set' ? (planType ?? action) : action
    setLoadingAction(key)

    try {
      const body =
        action === 'set' && planType
          ? { action: 'set', planId: getPlanId(planType) }
          : { action }

      await api.put(`/admin/users/${user.id}/subscription`, body)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'İşlem başarısız oldu.'
      setError(msg)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📦</span>
          <div>
            <h3 className="text-[15px] font-bold text-[#1C1B19]">Paket Değiştir</h3>
            <p className="text-[12px] text-[#9A9792] truncate max-w-[200px]">{user.name} · {user.email}</p>
          </div>
        </div>

        {/* Current plan */}
        <div className="mb-4 px-3 py-2 rounded-xl bg-[#F7F6F2] border border-[#E2E0D8]">
          <p className="text-[11px] text-[#9A9792] uppercase tracking-wider mb-0.5">Mevcut Plan</p>
          <p className="text-[13px] font-semibold text-[#1C1B19]">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${PLAN_COLORS[user.planType] ?? 'bg-gray-100'}`}>
              {PLAN_LABELS[user.planType] ?? user.planType}
            </span>
          </p>
        </div>

        {/* Plan options */}
        <div className="flex flex-col gap-2 mb-4">
          {PLAN_OPTIONS.map(({ action, label, description, cls, planType }) => {
            const key = action === 'set' ? (planType ?? action) : action
            const isLoading = loadingAction === key
            const needsPlanId = action === 'set' && !getPlanId(planType ?? '')
            return (
              <button
                key={key}
                onClick={() => handleAction(action as PlanAction, planType)}
                disabled={loadingAction !== null || needsPlanId}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors disabled:opacity-50 disabled:cursor-wait ${cls}`}
              >
                <div>
                  <p className="text-[13px] font-semibold">{label}</p>
                  <p className="text-[11px] opacity-70">{description}</p>
                </div>
                {isLoading && (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <p className="text-[12px] text-red-600 mb-3">⚠️ {error}</p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-[13px] text-[#6B6963] hover:bg-[#F7F6F2] transition-colors"
        >
          İptal
        </button>
      </div>
    </div>
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
        <button onClick={() => setExpanded(true)}
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">
          +{remaining}
        </button>
      )}
      {expanded && toolIds.length > 2 && (
        <button onClick={() => setExpanded(false)}
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">
          gizle
        </button>
      )}
    </div>
  )
}

// ─── User Action Sidebar ──────────────────────────────────────────────────────

interface UserActionSidebarProps {
  user: AdminUser | null
  isPending: boolean
  onEdit: () => void
  onResetPassword: () => void
  onToggleStatus: () => void
  onDelete: () => void
  onDetail: () => void
  onPaketDegistir: () => void
}

function UserActionSidebar({ user, isPending, onEdit, onResetPassword, onToggleStatus, onDelete, onDetail, onPaketDegistir }: UserActionSidebarProps) {
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
            <div className="px-4 pb-3 border-b border-[#F2F1ED]">
              <p className="text-[12px] font-medium text-[#1C1B19] truncate">{user.name}</p>
              <p className="text-[11px] text-[#9A9792] truncate">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-[10px] text-[#9A9792]">{user.isActive ? 'Aktif' : 'Pasif'}</span>
                {user.isAdmin && <span className="ml-1 text-[10px] text-[#1D9E75] font-semibold">Admin</span>}
              </div>
            </div>

            <nav className="flex flex-col gap-[2px] px-2 pb-3 pt-2">
              {[
                { icon: '✎',  label: 'Düzenle',           onClick: onEdit,          cls: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
                { icon: '📊', label: 'Kullanım Geçmişi',  onClick: onDetail,        cls: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
                { icon: '📦', label: 'Paket Değiştir',    onClick: onPaketDegistir, cls: 'text-[#1D9E75] hover:bg-[#E6F9F2]' },
                { icon: '🔑', label: 'Şifre Sıfırla',     onClick: onResetPassword, cls: 'text-amber-700 hover:bg-amber-50' },
                {
                  icon:    user.isActive ? '⏸' : '▶',
                  label:   user.isActive ? 'Pasife Al' : 'Aktif Et',
                  onClick: onToggleStatus,
                  cls:     user.isActive
                    ? 'text-amber-700 hover:bg-amber-50 disabled:opacity-50'
                    : 'text-green-700 hover:bg-green-50 disabled:opacity-50',
                  disabled: isPending,
                },
                { icon: '🗑', label: 'Kullanıcıyı Sil',  onClick: onDelete,        cls: 'text-red-600 hover:bg-red-50' },
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

export function AdminKullaniciListesiPage() {
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

  const [selectedUser,      setSelectedUser]      = useState<AdminUser | null>(null)
  const [editUser,          setEditUser]          = useState<AdminUser | null>(null)
  const [resetUser,         setResetUser]         = useState<AdminUser | null>(null)
  const [deleteConfirm,     setDeleteConfirm]     = useState<AdminUser | null>(null)
  const [paketDegistirUser, setPaketDegistirUser] = useState<AdminUser | null>(null)
  const [search,            setSearch]            = useState('')

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
    return u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.company && u.company.toLowerCase().includes(q))
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
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1C1B19]">👥 Kullanıcı Listesi</h1>
          <p className="text-[13px] text-[#6B6963] mt-0.5">Tüm kayıtlı kullanıcılar</p>
        </div>
        <input
          type="text"
          placeholder="Ad, e-posta veya şirket ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
        />
      </div>

      {/* ── Table + Sidebar ── */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
                      {['Ad / E-posta', 'Şirket', 'Plan', 'Kayıt', 'Son Giriş', 'Araçlar', 'Toplam', 'Durum'].map((col) => (
                        <th key={col} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
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
                            ? 'bg-amber-50/60 hover:bg-amber-50'
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
                        <td className="px-4 py-3 max-w-[160px]"><ToolBadges toolIds={user.toolsUsed} /></td>
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

        <UserActionSidebar
          user={selectedUser}
          isPending={toggleStatusMutation.isPending}
          onEdit={() => { if (selectedUser) setEditUser(selectedUser) }}
          onResetPassword={() => { if (selectedUser) setResetUser(selectedUser) }}
          onToggleStatus={() => { if (selectedUser) toggleStatusMutation.mutate(selectedUser.id) }}
          onDelete={() => { if (selectedUser) setDeleteConfirm(selectedUser) }}
          onDetail={() => { if (selectedUser) navigate(`/admin/kullanici/${selectedUser.id}/gecmis`) }}
          onPaketDegistir={() => { if (selectedUser) setPaketDegistirUser(selectedUser) }}
        />
      </div>

      {/* ── Modals ── */}
      {editUser          && <EditModal user={editUser} onClose={() => setEditUser(null)} onSaved={handleSaved} />}
      {resetUser         && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {paketDegistirUser && (
        <PaketDegistirModal
          user={paketDegistirUser}
          onClose={() => setPaketDegistirUser(null)}
          onSaved={handleSaved}
        />
      )}

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
            <p className="text-xs text-red-500 mb-6">
              Bu işlem geri alınamaz. Kullanıcının tüm verileri silinecektir.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-red-500 mb-4">{(deleteMutation.error as Error)?.message ?? 'Silme işlemi başarısız.'}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                İptal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Siliniyor…' : '🗑 Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
