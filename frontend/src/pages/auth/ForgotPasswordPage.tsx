import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForgotPassword } from '@/hooks/useAuth'

function getForgotPasswordErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const response = err.response as Record<string, unknown> | undefined
    const status = response?.status as number | undefined
    if (status === 429) return 'Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyin.'
    if (status === 500) return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
  }
  if (error instanceof Error) return error.message
  return 'İstek gönderilemedi. Lütfen tekrar deneyin.'
}
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const { mutate: forgotPassword, isPending, isSuccess, error } = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotPassword(email)
  }

  const errorMsg = getForgotPasswordErrorMessage(error)

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
            <h2 className="text-lg font-semibold text-gray-900">Şifremi Unuttum</h2>
            <p className="mt-1 text-sm text-gray-500">
              E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.
            </p>
          </div>

          {/* Hata */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Başarı */}
          {isSuccess ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-[#F0FAF6] border border-[#9FE1CB] rounded-xl text-sm text-[#085041] leading-relaxed">
                <p className="font-semibold mb-1">📬 Bağlantı gönderildi</p>
                <p>
                  <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik.
                  Gelen kutunuzu (ve spam klasörünüzü) kontrol edin.
                </p>
                <p className="mt-2 text-[12px] text-[#1D9E75]">Bağlantı 1 saat geçerlidir.</p>
              </div>
              <button
                type="button"
                onClick={() => forgotPassword(email)}
                disabled={isPending}
                className="text-sm text-[#1D9E75] hover:underline disabled:opacity-50 text-center"
              >
                {isPending ? 'Gönderiliyor…' : 'Tekrar gönder'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="E-posta"
                placeholder="ornek@isletme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Button type="submit" loading={isPending} size="lg" className="w-full">
                Sıfırlama Bağlantısı Gönder
              </Button>
            </form>
          )}

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
