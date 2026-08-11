import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  company: string
  isAdmin: boolean
  planType: 'free' | 'standard' | 'premium' | 'enterprise'
  createdAt: string
  lastLoginAt: string | null
  toolsUsed: string[]
  totalToolUses: number
}

interface UpdateUserPayload {
  name?: string
  company?: string
  isAdmin?: boolean
}

interface CreateUserPayload {
  name: string
  email: string
  company: string
  password: string
  isAdmin: boolean
  plan: string
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
  free:       'Ücretsiz',
  standard:   'Standart',
  premium:    'Premium',
  enterprise: 'Kurumsal',
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
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'Az önce'
  if (min < 60) return `${min} dk önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} saat önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} gün önce`
  return formatDate(iso)
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  user: AdminUser
  onClose: () => void
  onSaved: () => void
}

function EditModal({ user, onClose, onSaved }: EditModalProps) {
  const [name, setName] = useState(user.name)
  const [company, setCompany] = useState(user.company)
  const [isAdmin, setIsAdmin] = useState(user.isAdmin)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async (payload: UpdateUserPayload) => {
      const { data } = await api.patch<ApiResponse>(`/admin/users/${user.id}`, payload)
      if (!data.success) throw new Error((data as { error?: string }).error ?? 'Güncelleme başarısız')
    },
    onSuccess: () => {
      onSaved()
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSave = () => {
    setError('')
    mutation.mutate({
      name:    name.trim() || undefined,
      company: company.trim(),
      isAdmin,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-5">Kullanıcıyı Düzenle</h3>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Şirket adı (opsiyonel)"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-400 bg-gray-50"
              value={user.email}
              disabled
            />
          </div>

          {/* Role */}
          <div className="flex items-center gap-3">
            <input
              id="isAdmin"
              type="checkbox"
              className="w-4 h-4 accent-[#1D9E75]"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700">
              Admin yetkisi
            </label>
            <span className="text-xs text-gray-400">(sınırsız kullanım + kullanıcı yönetimi)</span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

interface ResetPasswordModalProps {
  user: AdminUser
  onClose: () => void
}

function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const mutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { data } = await api.post<ApiResponse>(`/admin/users/${user.id}/reset-password`, { newPassword })
      if (!data.success) throw new Error((data as { error?: string }).error ?? 'Şifre sıfırlama başarısız')
    },
    onSuccess: () => setSuccess(true),
    onError: (err: Error) => setError(err.message),
  })

  const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/

  const handleReset = () => {
    setError('')
    if (!PASSWORD_RE.test(password)) {
      setError('Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.')
      return
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    mutation.mutate(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-1">Şifre Sıfırla</h3>
        <p className="text-sm text-gray-500 mb-5">
          {user.name} ({user.email}) için yeni şifre belirleyin.
        </p>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="text-3xl">✅</span>
            <p className="text-sm text-green-700 font-medium">Şifre başarıyla güncellendi.</p>
            <p className="text-xs text-gray-400">Kullanıcının mevcut oturumları sonlandırıldı.</p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white"
            >
              Kapat
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter, büyük/küçük harf + rakam"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Şifreyi tekrar girin"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleReset}
                disabled={mutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? 'Sıfırlanıyor…' : 'Şifreyi Sıfırla'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onClose: () => void
  onCreated: () => void
}

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/

const PLAN_OPTIONS = [
  { value: 'free',       label: 'Ücretsiz (Free)' },
  { value: 'standard',   label: 'Standart' },
  { value: 'premium',    label: 'Premium' },
  { value: 'enterprise', label: 'Kurumsal (Enterprise)' },
]

function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [plan, setPlan] = useState('free')
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await api.post<ApiResponse>('/admin/users', payload)
      if (!data.success) throw new Error((data as { error?: string }).error ?? 'Kullanıcı oluşturulamadı')
    },
    onSuccess: () => {
      onCreated()
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleCreate = () => {
    setError('')
    if (!name.trim()) { setError('Ad Soyad zorunludur.'); return }
    if (!email.trim()) { setError('E-posta zorunludur.'); return }
    if (!PASSWORD_RE.test(password)) {
      setError('Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.')
      return
    }
    if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return }

    mutation.mutate({ name: name.trim(), email: email.trim(), company: company.trim(), plan, isAdmin, password })
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-5">➕ Yeni Kullanıcı Oluştur</h3>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmet Yılmaz" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kullanici@ornek.com" />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
            <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Şirket adı (opsiyonel)" />
          </div>

          {/* Plan + Role row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                className={inputCls}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                {PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#1D9E75]"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">Admin yetkisi</span>
              </label>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${inputCls} pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter, büyük/küçük harf + rakam"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`${inputCls} pr-10`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Şifreyi tekrar girin"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <p className="mt-3 text-xs text-gray-400">
          * Admin tarafından oluşturulan hesaplar e-posta doğrulaması olmadan aktif olur.
        </p>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleCreate}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Oluşturuluyor…' : '➕ Kullanıcı Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tool Usage Popover ───────────────────────────────────────────────────────

function ToolBadges({ toolIds }: { toolIds: string[] }) {
  const [expanded, setExpanded] = useState(false)

  if (toolIds.length === 0) return <span className="text-gray-400 text-xs">—</span>

  const shown = expanded ? toolIds : toolIds.slice(0, 2)
  const remaining = toolIds.length - 2

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((id) => (
        <span key={id} className="px-2 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#085041] text-xs">
          {TOOL_LABELS[id] ?? id}
        </span>
      ))}
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200"
        >
          +{remaining}
        </button>
      )}
      {expanded && toolIds.length > 2 && (
        <button
          onClick={() => setExpanded(false)}
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-gray-200"
        >
          gizle
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminKullanicilarPage() {
  const queryClient = useQueryClient()
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

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
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.company && u.company.toLowerCase().includes(q))
    )
  })

  const handleSaved = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔐 Kullanıcı Yönetimi</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-1">
              Toplam {data.length} kullanıcı · {data.filter((u) => u.isAdmin).length} admin
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <input
            type="text"
            placeholder="Ad, e-posta veya şirket ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm flex-1 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
          />
          {/* Create */}
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors whitespace-nowrap shrink-0"
          >
            ➕ Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">
          Kullanıcılar yüklenemedi. Lütfen sayfayı yenileyin.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ad / E-posta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Şirket</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Kayıt</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Son Giriş</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Kullandığı Araçlar</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Toplam</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      {search ? 'Arama sonucu bulunamadı.' : 'Henüz kayıtlı kullanıcı yok.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#F1EFE8] hover:bg-[#F7F6F2]/60 transition-colors"
                    >
                      {/* Name / Email */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 text-gray-600">
                        {user.company || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            PLAN_COLORS[user.planType] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {PLAN_LABELS[user.planType] ?? user.planType}
                        </span>
                      </td>

                      {/* Registered */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <span title={formatDate(user.lastLoginAt)}>
                          {timeAgo(user.lastLoginAt)}
                        </span>
                      </td>

                      {/* Tools Used */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <ToolBadges toolIds={user.toolsUsed} />
                      </td>

                      {/* Total Uses */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-700">{user.totalToolUses}</span>
                        <div className="text-[10px] text-gray-400">kullanım</div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {user.isAdmin ? (
                          <span className="flex items-center gap-1 text-[#1D9E75] font-medium text-xs">
                            <span>🔐</span> Admin
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">User</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditUser(user)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors"
                            title="Düzenle"
                          >
                            ✎ Düzenle
                          </button>
                          <button
                            onClick={() => setResetUser(user)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 text-red-500 text-xs hover:bg-red-100 transition-colors"
                            title="Şifre Sıfırla"
                          >
                            🔑 Şifre
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {editUser && (
        <EditModal user={editUser} onClose={() => setEditUser(null)} onSaved={handleSaved} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}
      {createOpen && (
        <CreateUserModal onClose={() => setCreateOpen(false)} onCreated={handleSaved} />
      )}
    </div>
  )
}
