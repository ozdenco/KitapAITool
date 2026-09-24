import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse } from '@/types'
import { EditModal, ResetPasswordModal } from './AdminModals'
import type { AdminUser } from './AdminModals'
import { formatDate, formatDateShort, timeAgo, TOOL_LABELS, PLAN_LABELS, PLAN_COLORS } from './adminConstants'

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

/**
 * Kullanıcının çalıştırdığı araçlar.
 *
 * Her rozet TIKLANABİLİR: Tüm Çıktılar sayfasını hem kullanıcı hem araç
 * filtresiyle açar. Admin "bu kişi bu araçla ne üretmiş?" sorusunu iki
 * filtreyi elle seçmeden yanıtlayabiliyor.
 */
function ToolBadges({ toolIds, userId }: { toolIds: string[]; userId: string }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  if (toolIds.length === 0) return <span className="text-gray-400 text-xs">—</span>
  const shown     = expanded ? toolIds : toolIds.slice(0, 2)
  const remaining = toolIds.length - 2
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((id) => (
        <button
          key={id}
          type="button"
          title={`${TOOL_LABELS[id] ?? id} çıktılarını gör`}
          onClick={() => navigate(`/admin/tum-ciktilar?userId=${userId}&toolId=${id}`)}
          className="px-1.5 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#085041] text-[10px]
                     hover:bg-[#1D9E75]/25 hover:underline transition-colors cursor-pointer"
        >
          {TOOL_LABELS[id] ?? id}
        </button>
      ))}
      {!expanded && remaining > 0 && (
        <button onClick={() => setExpanded(true)}
          className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] hover:bg-gray-200">
          +{remaining}
        </button>
      )}
      {expanded && toolIds.length > 2 && (
        <button onClick={() => setExpanded(false)}
          className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] hover:bg-gray-200">
          gizle
        </button>
      )}
    </div>
  )
}

// ─── Satır içi işlem menüsü ───────────────────────────────────────────────────

interface IslemMenusuProps {
  user: AdminUser
  isPending: boolean
  onEdit: () => void
  onResetPassword: () => void
  onToggleStatus: () => void
  onDelete: () => void
  onDetail: () => void
  onCiktilar: () => void
  onOdemeler: () => void
  onPaketDegistir: () => void
}

const MENU_GENISLIK = 186

/**
 * Kullanıcı satırındaki ⚙ düğmesi ve açtığı işlem menüsü.
 *
 * NEDEN SAĞDAKİ PANELİN YERİNE: Panel seçili kullanıcı olmasa bile 160px
 * yer tutuyordu ve tablo sekiz kolonla sığmıyordu. Ayrıca "hangi kullanıcı
 * seçili" belirsizliği vardı. Menü satıra bağlı olduğu için o soru kalkıyor.
 *
 * NEDEN PORTAL: Tablo `overflow-x-auto` bir kutunun içinde; menü normal
 * akışta açılsaydı o kutu tarafından kırpılırdı. Gövdeye taşınıp butonun
 * ekran koordinatına sabitleniyor.
 */
function IslemMenusu({
  user, isPending,
  onEdit, onResetPassword, onToggleStatus, onDelete,
  onDetail, onCiktilar, onOdemeler, onPaketDegistir,
}: IslemMenusuProps) {
  const [acik, setAcik] = useState(false)
  const butonRef = useRef<HTMLButtonElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)
  const [konum, setKonum] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  /**
   * Konum, menü AÇILMADAN ÖNCE hesaplanır. Açıldıktan sonra ölçseydik menü
   * ilk karede (0,0) konumunda çizilip sonra yerine zıplardı.
   */
  const menuyuAc = () => {
    const r = butonRef.current?.getBoundingClientRect()
    if (!r) return
    const solaTasar = r.right - MENU_GENISLIK < 8
    setKonum({
      top:  r.bottom + 6,
      left: solaTasar ? 8 : r.right - MENU_GENISLIK,
    })
    setAcik(true)
  }

  // Dışarı tıklama, Escape, kaydırma ve yeniden boyutlandırma menüyü kapatır.
  // Sayfa kayınca menü butondan ayrı düşeceği için kapatmak en doğrusu.
  useEffect(() => {
    if (!acik) return

    const disaridaMi = (e: MouseEvent) => {
      const h = e.target as Node
      if (menuRef.current?.contains(h) || butonRef.current?.contains(h)) return
      setAcik(false)
    }
    const escBasildi = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false) }
    const kapat = () => setAcik(false)

    document.addEventListener('mousedown', disaridaMi)
    document.addEventListener('keydown', escBasildi)
    window.addEventListener('scroll', kapat, true)
    window.addEventListener('resize', kapat)
    return () => {
      document.removeEventListener('mousedown', disaridaMi)
      document.removeEventListener('keydown', escBasildi)
      window.removeEventListener('scroll', kapat, true)
      window.removeEventListener('resize', kapat)
    }
  }, [acik])

  const secenekler = [
    { ikon: '✎',  etiket: 'Düzenle',          calistir: onEdit,          renk: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
    { ikon: '📊', etiket: 'Kullanım Geçmişi', calistir: onDetail,        renk: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
    { ikon: '📄', etiket: 'Geçmiş Çıktılar',  calistir: onCiktilar,      renk: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
    { ikon: '💳', etiket: 'Ödeme Geçmişi',    calistir: onOdemeler,      renk: 'text-[#3A3935] hover:bg-[#F0FAF6] hover:text-[#085041]' },
    { ikon: '📦', etiket: 'Paket Değiştir',   calistir: onPaketDegistir, renk: 'text-[#1D9E75] hover:bg-[#E6F9F2]' },
    { ikon: '🔑', etiket: 'Şifre Sıfırla',    calistir: onResetPassword, renk: 'text-amber-700 hover:bg-amber-50' },
    {
      ikon:     user.isActive ? '⏸' : '▶',
      etiket:   user.isActive ? 'Pasife Al' : 'Aktif Et',
      calistir: onToggleStatus,
      renk:     user.isActive ? 'text-amber-700 hover:bg-amber-50' : 'text-green-700 hover:bg-green-50',
      pasif:    isPending,
      ayirici:  true,
    },
    { ikon: '🗑', etiket: 'Kullanıcıyı Sil', calistir: onDelete, renk: 'text-red-600 hover:bg-red-50' },
  ]

  return (
    <>
      <button
        ref={butonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`${user.name} için işlemler`}
        onClick={(e) => { e.stopPropagation(); acik ? setAcik(false) : menuyuAc() }}
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[15px] leading-none
                    transition-colors border ${
          acik
            ? 'bg-[#F0FAF6] border-[#9FE1CB] text-[#085041]'
            : 'bg-white border-[#E2E0D8] text-[#6B6963] hover:bg-[#F7F6F2] hover:text-[#1C1B19]'
        }`}
      >
        ⚙
      </button>

      {acik && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: konum.top, left: konum.left, width: MENU_GENISLIK }}
          className="fixed z-50 bg-white rounded-xl border border-[#E2E0D8] shadow-lg py-1.5"
        >
          <div className="px-3 pb-2 mb-1 border-b border-[#F2F1ED]">
            <p className="text-[12px] font-medium text-[#1C1B19] truncate">{user.name}</p>
            <p className="text-[11px] text-[#9A9792] truncate">{user.email}</p>
          </div>

          {secenekler.map(({ ikon, etiket, calistir, renk, pasif, ayirici }) => (
            <button
              key={etiket}
              role="menuitem"
              type="button"
              disabled={pasif}
              onClick={(e) => { e.stopPropagation(); setAcik(false); calistir() }}
              className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-[12px] font-medium
                          text-left transition-colors disabled:opacity-50 ${renk} ${
                ayirici ? 'mt-1 border-t border-[#F2F1ED] pt-2' : ''
              }`}
            >
              <span className="text-[13px] leading-none w-4 text-center">{ikon}</span>
              <span>{etiket}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminKullaniciListesiPage() {
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

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
          <h1 className="text-[16px] font-semibold text-[#1C1B19]">👥 Kullanıcı Listesi</h1>
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
      <div>
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
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                      {['Ad / E-posta', 'Şirket', 'Plan', 'Kayıt', 'Son Giriş', 'Araçlar', 'Kullanım', 'Durum', 'Kullanıcı İşlemleri'].map((col) => (
                        <th
                          key={col}
                          className={
                            'px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap' +
                            // İşlem kolonu en sağa SABİTLENİR: dokuz kolon dar
                            // ekranlarda sığmıyor, tablo yatay kayıyor ve son
                            // kolon görüş dışında kalıyordu. Sabitlenince
                            // işlemlere her zaman ulaşılabiliyor.
                            (col === 'Kullanıcı İşlemleri'
                              ? ' text-center sticky right-0 z-10 bg-[#F7F6F2] border-l border-[#E2E0D8]'
                              : ' text-left')
                          }
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-gray-400">
                          {search ? 'Arama sonucu bulunamadı.' : 'Henüz kayıtlı kullanıcı yok.'}
                        </td>
                      </tr>
                    ) : filtered.map((user) => (
                      // Satır artık tıklanabilir DEĞİL: işlemler ⚙ menüsünden
                      // yapılıyor, "seçili kullanıcı" kavramına gerek kalmadı.
                      <tr
                        key={user.id}
                        className={`group border-b border-[#F1EFE8] transition-colors hover:bg-[#F7F6F2]/60 ${
                          !user.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-2 py-2">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-[11px] text-gray-400">{user.email}</div>
                        </td>
                        <td className="px-2 py-2 text-gray-600">{user.company || <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${PLAN_COLORS[user.planType] ?? 'bg-gray-100 text-gray-600'}`}>
                            {PLAN_LABELS[user.planType] ?? user.planType}
                          </span>
                        </td>
                        {/* Saat tooltip'te — kolon genişliği yarıya iniyor */}
                        <td className="px-2 py-2 text-[11px] text-gray-500 whitespace-nowrap" title={formatDate(user.createdAt)}>{formatDateShort(user.createdAt)}</td>
                        <td className="px-2 py-2 text-[11px] text-gray-500 whitespace-nowrap" title={formatDate(user.lastLoginAt)}>{timeAgo(user.lastLoginAt)}</td>
                        <td className="px-2 py-2 max-w-[110px]"><ToolBadges toolIds={user.toolsUsed} userId={user.id} /></td>
                        {/* "kullanım" alt etiketi başlığa taşındı — kolonu 30px daraltıyor.
                            Rakam tıklanabilir: kullanıcının TÜM çıktılarına gider. */}
                        <td className="px-2 py-2 text-center">
                          {user.totalToolUses > 0 ? (
                            <button
                              type="button"
                              title={`${user.name} kullanıcısının tüm çıktılarını gör`}
                              onClick={() => navigate(`/admin/tum-ciktilar?userId=${user.id}`)}
                              className="font-semibold text-[#085041] hover:underline cursor-pointer"
                            >
                              {user.totalToolUses}
                            </button>
                          ) : (
                            <span className="font-semibold text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
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

                        {/*
                          Sabitlenmiş hücrenin kendi ZEMİNİ olmak zorunda —
                          saydam olsaydı altından kayan kolonlar görünürdü.
                          Satırın hover durumunu group-hover ile taklit ediyor.
                        */}
                        <td className="px-2 py-2 text-center sticky right-0 z-10 border-l border-[#F1EFE8] bg-white group-hover:bg-[#F7F6F2]">
                          <div className="flex justify-center">
                            <IslemMenusu
                              user={user}
                              isPending={toggleStatusMutation.isPending}
                              onEdit={() => setEditUser(user)}
                              onResetPassword={() => setResetUser(user)}
                              onToggleStatus={() => toggleStatusMutation.mutate(user.id)}
                              onDelete={() => setDeleteConfirm(user)}
                              onDetail={() => navigate(`/admin/kullanici/${user.id}/gecmis`)}
                              onCiktilar={() => navigate(`/admin/tum-ciktilar?userId=${user.id}`)}
                              onOdemeler={() => navigate(`/admin/kullanici/${user.id}/odemeler`)}
                              onPaketDegistir={() => setPaketDegistirUser(user)}
                            />
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
