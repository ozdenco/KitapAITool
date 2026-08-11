import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse } from '@/types'

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  company: string
  isAdmin: boolean
  isActive: boolean
  planType: 'free' | 'standard' | 'premium' | 'enterprise'
  createdAt: string
  lastLoginAt: string | null
  toolsUsed: string[]
  totalToolUses: number
}

interface UpdateUserPayload { name?: string; company?: string; isAdmin?: boolean }

interface CreateUserPayload {
  name: string; email: string; company: string
  password: string; isAdmin: boolean; plan: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/

const PLAN_OPTIONS = [
  { value: 'free',       label: 'Ücretsiz (Free)' },
  { value: 'standard',   label: 'Standart' },
  { value: 'premium',    label: 'Premium' },
  { value: 'enterprise', label: 'Kurumsal (Enterprise)' },
]

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40'

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps { user: AdminUser; onClose: () => void; onSaved: () => void }

export function EditModal({ user, onClose, onSaved }: EditModalProps) {
  const [name, setName]       = useState(user.name)
  const [company, setCompany] = useState(user.company)
  const [isAdmin, setIsAdmin] = useState(user.isAdmin)
  const [error, setError]     = useState('')

  const mutation = useMutation({
    mutationFn: async (payload: UpdateUserPayload) => {
      const { data } = await api.patch<ApiResponse>(`/admin/users/${user.id}`, payload)
      if (!data.success) throw new Error((data as { error?: string }).error ?? 'Güncelleme başarısız')
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-5">Kullanıcıyı Düzenle</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
            <input className={INPUT_CLS} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Şirket adı (opsiyonel)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-400 bg-gray-50" value={user.email} disabled />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#1D9E75]" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            <span className="text-sm font-medium text-gray-700">Admin yetkisi</span>
            <span className="text-xs text-gray-400">(sınırsız kullanım + yönetim)</span>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
          <button onClick={() => mutation.mutate({ name: name.trim() || undefined, company: company.trim(), isAdmin })} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

interface ResetPasswordModalProps { user: AdminUser; onClose: () => void }

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [showPw, setShowPw]         = useState(false)
  const [showCf, setShowCf]         = useState(false)

  const mutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { data } = await api.post<ApiResponse>(`/admin/users/${user.id}/reset-password`, { newPassword })
      if (!data.success) throw new Error((data as { error?: string }).error ?? 'Şifre sıfırlama başarısız')
    },
    onSuccess: () => setSuccess(true),
    onError: (err: Error) => setError(err.message),
  })

  const handleReset = () => {
    setError('')
    if (!PASSWORD_RE.test(password)) { setError('Şifre en az 8 karakter, büyük/küçük harf ve rakam içermelidir.'); return }
    if (password !== confirm)        { setError('Şifreler eşleşmiyor.'); return }
    mutation.mutate(password)
  }

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
      {show ? '🙈' : '👁️'}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Şifre Sıfırla</h3>
        <p className="text-sm text-gray-500 mb-5">{user.name} ({user.email}) için yeni şifre belirleyin.</p>
        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <span className="text-3xl">✅</span>
            <p className="text-sm text-green-700 font-medium">Şifre başarıyla güncellendi.</p>
            <p className="text-xs text-gray-400">Kullanıcının mevcut oturumları sonlandırıldı.</p>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white">Kapat</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={`${INPUT_CLS} pr-10`} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter, büyük/küçük harf + rakam" />
                <EyeBtn show={showPw} toggle={() => setShowPw((v) => !v)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
              <div className="relative">
                <input type={showCf ? 'text' : 'password'} className={`${INPUT_CLS} pr-10`} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="Şifreyi tekrar girin" />
                <EyeBtn show={showCf} toggle={() => setShowCf((v) => !v)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
              <button onClick={handleReset} disabled={mutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
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

interface CreateUserModalProps { onClose: () => void; onCreated: () => void }

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [company, setCompany]     = useState('')
  const [plan, setPlan]           = useState('free')
  const [isAdmin, setIsAdmin]     = useState(false)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [error, setError]         = useState('')

  const mutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await api.post<ApiResponse>('/admin/users', payload)
      if (!data.success) throw new Error((data as { error?: string }).error ?? 'Kullanıcı oluşturulamadı')
    },
    onSuccess: () => { onCreated(); onClose() },
    onError: (err: Error) => setError(err.message),
  })

  const handleCreate = () => {
    setError('')
    if (!name.trim())            { setError('Ad Soyad zorunludur.'); return }
    if (!email.trim())           { setError('E-posta zorunludur.'); return }
    if (!PASSWORD_RE.test(password)) { setError('Şifre en az 8 karakter, büyük/küçük harf ve rakam içermelidir.'); return }
    if (password !== confirm)    { setError('Şifreler eşleşmiyor.'); return }
    mutation.mutate({ name: name.trim(), email: email.trim(), company: company.trim(), plan, isAdmin, password })
  }

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
      {show ? '🙈' : '👁️'}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-5">➕ Yeni Kullanıcı Oluştur</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
            <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmet Yılmaz" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
            <input type="email" className={INPUT_CLS} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kullanici@ornek.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
            <input className={INPUT_CLS} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Şirket adı (opsiyonel)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className={INPUT_CLS} value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" className="w-4 h-4 accent-[#1D9E75]" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
                <span className="text-sm font-medium text-gray-700">Admin yetkisi</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className={`${INPUT_CLS} pr-10`} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter, büyük/küçük harf + rakam" />
              <EyeBtn show={showPw} toggle={() => setShowPw((v) => !v)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar *</label>
            <div className="relative">
              <input type={showCf ? 'text' : 'password'} className={`${INPUT_CLS} pr-10`} value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="Şifreyi tekrar girin" />
              <EyeBtn show={showCf} toggle={() => setShowCf((v) => !v)} />
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <p className="mt-3 text-xs text-gray-400">* Admin tarafından oluşturulan hesaplar e-posta doğrulaması olmadan aktif olur.</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
          <button onClick={handleCreate} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Oluşturuluyor…' : '➕ Kullanıcı Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}
