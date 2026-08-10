import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Input } from '@/components/ui/Input'
import type { ApiResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordChangeBody {
  currentPassword: string
  newPassword: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SifreDegistirPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [validationError, setValidationError] = useState('')

  const changeMutation = useMutation({
    mutationFn: async (body: PasswordChangeBody) => {
      const { data } = await api.post<ApiResponse>('/auth/change-password', body)
      if (!data.success) throw new Error(data.error ?? 'Şifre değiştirilemedi')
    },
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
      setTimeout(() => setDone(false), 5000)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')

    if (next.length < 8) {
      setValidationError('Yeni şifre en az 8 karakter olmalıdır.')
      return
    }
    if (next !== confirm) {
      setValidationError('Yeni şifreler eşleşmiyor.')
      return
    }

    changeMutation.mutate({ currentPassword: current, newPassword: next })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">🔒</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Şifre Değiştir</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Hesabınızın güvenliği için güçlü bir şifre kullanın</p>
      </div>

      {/* ── Form ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Mevcut Şifre"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Mevcut şifreniz"
            required
            autoComplete="current-password"
          />

          <Input
            label="Yeni Şifre"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="En az 8 karakter"
            required
            autoComplete="new-password"
          />

          <Input
            label="Yeni Şifre (Tekrar)"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Yeni şifrenizi tekrar girin"
            required
            autoComplete="new-password"
            error={
              confirm.length > 0 && confirm !== next ? 'Şifreler eşleşmiyor' : undefined
            }
          />

          {/* Strength hint */}
          {next.length > 0 && (
            <PasswordStrength password={next} />
          )}

          {/* Errors */}
          {validationError && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {validationError}
            </p>
          )}
          {changeMutation.isError && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {(changeMutation.error as Error).message}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={changeMutation.isPending || !current || !next || next !== confirm}
              className="px-[18px] py-[8px] bg-[#1D9E75] text-white text-[13px] font-medium rounded-lg hover:bg-[#178a65] disabled:opacity-50 transition-colors"
            >
              {changeMutation.isPending ? 'Değiştiriliyor…' : 'Şifreyi Değiştir'}
            </button>

            {done && (
              <span className="text-[13px] text-[#1D9E75] font-medium">
                ✓ Şifreniz başarıyla değiştirildi
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Tips ── */}
      <div className="bg-[#F0FAF6] rounded-2xl border border-[#9FE1CB] p-5">
        <h2 className="text-[13px] font-semibold text-[#085041] mb-2">Güçlü Şifre İpuçları</h2>
        <ul className="text-[12px] text-[#085041] flex flex-col gap-1">
          <li>• En az 8 karakter kullanın</li>
          <li>• Büyük ve küçük harf kombinasyonu ekleyin</li>
          <li>• Rakam ve özel karakter (!, @, #…) dahil edin</li>
          <li>• Tahmin edilebilir kelimelerden (isim, tarih) kaçının</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Password strength indicator ──────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const score = getStrengthScore(password)
  const levels = [
    { min: 0, label: 'Çok Zayıf', color: 'bg-red-500' },
    { min: 1, label: 'Zayıf', color: 'bg-orange-400' },
    { min: 2, label: 'Orta', color: 'bg-amber-400' },
    { min: 3, label: 'İyi', color: 'bg-[#1D9E75]' },
    { min: 4, label: 'Güçlü', color: 'bg-[#1D9E75]' },
  ]
  const level = levels[Math.min(score, 4)]

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 h-[4px] rounded-full transition-all ${
              i < score ? level.color : 'bg-[#E2E0D8]'
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-[#6B6963]">Şifre gücü: <strong>{level.label}</strong></p>
    </div>
  )
}

function getStrengthScore(pwd: string): number {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(score, 4)
}
