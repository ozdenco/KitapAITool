import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useResetPassword } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

const STRENGTH_LEVELS = [
  { label: 'Çok Zayıf', color: 'bg-red-500' },
  { label: 'Zayıf',     color: 'bg-orange-400' },
  { label: 'Orta',      color: 'bg-amber-400' },
  { label: 'İyi',       color: 'bg-[#1D9E75]' },
  { label: 'Güçlü',     color: 'bg-[#1D9E75]' },
]

function getStrengthScore(pwd: string): number {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(score, 4)
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [validationError, setValidationError] = useState('')

  const { mutate: resetPassword, isPending, error } = useResetPassword()

  const pwScore = password.length > 0 ? getStrengthScore(password) : -1
  const pwLevel = pwScore >= 0 ? STRENGTH_LEVELS[pwScore] : null

  // Token yok → hata sayfası göster
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#1D9E75]/5 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Logo height={48} className="mx-auto" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Geçersiz Bağlantı</h2>
            <p className="text-sm text-gray-500 mb-5">
              Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
            </p>
            <Link
              to="/sifremi-unuttum"
              className="inline-block text-sm font-medium text-[#1D9E75] hover:underline"
            >
              Yeni bağlantı talep et →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (pwScore >= 0 && pwScore < 3) {
      setValidationError('Şifre çok zayıf. Büyük harf, küçük harf ve rakam birlikte kullanın.')
      return
    }
    if (password !== confirm) {
      setValidationError('Şifreler eşleşmiyor.')
      return
    }

    resetPassword({ token, newPassword: password })
  }

  const apiError = error instanceof Error ? error.message : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#1D9E75]/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo height={48} className="mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Dijital ajansınız artık bir yazılım</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Yeni Şifre Oluştur</h2>
            <p className="mt-1 text-sm text-gray-500">
              Hesabınız için güçlü bir şifre belirleyin.
            </p>
          </div>

          {/* Hatalar */}
          {(validationError || apiError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {validationError || apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-[6px]">
              <Input
                id="password"
                type="password"
                label="Yeni Şifre"
                placeholder="En az 8 karakter"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setValidationError('') }}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {/* Güç göstergesi */}
              {pwLevel && (
                <div className="flex flex-col gap-[4px]">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-[3px] rounded-full transition-all ${
                          i < pwScore ? pwLevel.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Şifre gücü:{' '}
                    <strong className={pwScore < 2 ? 'text-red-500' : 'text-gray-600'}>
                      {pwLevel.label}
                    </strong>
                    {pwScore < 2 && (
                      <span className="text-red-500"> — büyük harf, rakam veya özel karakter ekleyin</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <Input
              id="confirm"
              type="password"
              label="Yeni Şifre (Tekrar)"
              placeholder="Şifreyi tekrar girin"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setValidationError('') }}
              required
              autoComplete="new-password"
              error={confirm.length > 0 && confirm !== password ? 'Şifreler eşleşmiyor' : undefined}
            />

            <Button type="submit" loading={isPending} size="lg" className="mt-1 w-full">
              Şifremi Güncelle
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            <Link to="/giris" className="text-[#1D9E75] font-medium hover:underline">
              ← Giriş sayfasına dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
