import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVerifyEmail, useResendVerification } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const verify = useVerifyEmail()
  const resend = useResendVerification()
  const [resendSent, setResendSent] = useState(false)

  // Token URL'de varsa otomatik doğrula
  useEffect(() => {
    if (token) verify.mutate(token)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Doğrulama başarılıysa dashboard'a yönlendir
  useEffect(() => {
    if (verify.isSuccess) {
      setTimeout(() => navigate('/dashboard'), 1500)
    }
  }, [verify.isSuccess, navigate])

  const handleResend = () => {
    resend.mutate(undefined, {
      onSuccess: () => setResendSent(true),
    })
  }

  // ─── Token ile doğrulama sonucu ──────────────────────────────────────────
  if (token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#1D9E75]/5 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            {verify.isPending && (
              <>
                <div className="text-4xl mb-4 animate-pulse">✉️</div>
                <h2 className="text-lg font-semibold text-gray-900">E-posta doğrulanıyor...</h2>
              </>
            )}
            {verify.isSuccess && (
              <>
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">E-posta doğrulandı!</h2>
                <p className="text-sm text-gray-500">Dashboard'a yönlendiriliyorsunuz...</p>
              </>
            )}
            {verify.isError && (
              <>
                <div className="text-4xl mb-4">❌</div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Bağlantı geçersiz</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Bu doğrulama bağlantısı geçersiz veya süresi dolmuş.
                </p>
                <Button onClick={handleResend} loading={resend.isPending} className="w-full">
                  Yeni bağlantı gönder
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Token yok: "E-postanı kontrol et" ekranı ────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#1D9E75]/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🤖</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Kolay<span className="text-[#1D9E75]">KOBİ</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            E-postanızı kontrol edin
          </h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Hesabınıza doğrulama bağlantısı gönderdik.
            Araçları kullanmaya başlamak için e-postanızdaki bağlantıya tıklayın.
          </p>

          {/* Spam uyarısı */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left">
            <span className="text-amber-500 text-base mt-0.5 shrink-0">⚠️</span>
            <p className="text-xs text-amber-800 leading-relaxed">
              E-posta birkaç dakika içinde gelmezse{' '}
              <strong>spam / junk</strong> klasörünü kontrol edin.
              Gönderen: <strong>info@kolaykobi.com</strong>
            </p>
          </div>

          {resendSent ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-4">
              ✓ Yeni doğrulama e-postası gönderildi.
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResend}
              loading={resend.isPending}
              className="w-full mb-3"
            >
              E-postayı tekrar gönder
            </Button>
          )}

          {resend.isError && (
            <p className="text-xs text-red-600 mb-3">
              {resend.error instanceof Error ? resend.error.message : 'Gönderilemedi'}
            </p>
          )}

          <button
            onClick={() => navigate('/giris')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Farklı hesapla giriş yap
          </button>
        </div>

      </div>
    </div>
  )
}
