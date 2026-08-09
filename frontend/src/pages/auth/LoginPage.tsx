import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useLogin, useGoogleAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

const GOOGLE_ENABLED = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID)

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate: login, isPending, error } = useLogin()
  const { mutate: googleAuth, isPending: googlePending, error: googleError } = useGoogleAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      googleAuth(credentialResponse.credential)
    }
  }

  const loginError = error instanceof Error ? error.message : error ? 'Giriş yapılamadı.' : null
  const gError = googleError instanceof Error ? googleError.message : null

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
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Giriş Yap</h2>

          {(loginError ?? gError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {loginError ?? gError}
            </div>
          )}

          {/* Google butonu — sadece Client ID tanımlıysa göster */}
          {GOOGLE_ENABLED && (
            <>
              <div className={`mb-4 flex justify-center ${googlePending ? 'opacity-50 pointer-events-none' : ''}`}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => { /* popup kapatıldı veya izin verilmedi */ }}
                  text="signin_with"
                  locale="tr"
                  width="320"
                />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">veya e-posta ile</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </>
          )}

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
            <Input
              id="password"
              type="password"
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" loading={isPending} size="lg" className="mt-1 w-full">
              Giriş Yap
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Hesabın yok mu?{' '}
            <Link to="/kayit" className="text-[#1D9E75] font-medium hover:underline">
              Ücretsiz kayıt ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
