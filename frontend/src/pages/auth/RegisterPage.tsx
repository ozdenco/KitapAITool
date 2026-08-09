import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegister, useGoogleAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'

const GOOGLE_ENABLED = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID)

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate: register, isPending, error } = useRegister()
  const { mutate: googleAuth, isPending: googlePending, error: googleError } = useGoogleAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    register({ name, email, password })
  }

  const regError = error instanceof Error ? error.message : error ? 'Kayıt yapılamadı.' : null
  const gError = googleError instanceof Error ? googleError.message : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#1D9E75]/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo height={48} className="mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Dijital ajansınız artık bir yazılım</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Ücretsiz Hesap Oluştur</h2>
          <p className="text-sm text-gray-500 mb-5">Her araç için aylık 3 ücretsiz kullanım</p>

          {(regError ?? gError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {regError ?? gError}
            </div>
          )}

          {/* Google butonu — sadece Client ID tanımlıysa göster */}
          {GOOGLE_ENABLED && (
            <>
              <button
                type="button"
                onClick={() => googleAuth('')}
                disabled={googlePending || isPending}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200
                           rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <GoogleIcon />
                {googlePending ? 'Bekleniyor...' : 'Google ile Kayıt Ol'}
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">veya e-posta ile</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="name"
              label="Ad Soyad"
              placeholder="İşletme sahibinin adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
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
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Button type="submit" loading={isPending} size="lg" className="mt-1 w-full">
              Ücretsiz Başla
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Zaten hesabın var mı?{' '}
            <Link to="/giris" className="text-[#1D9E75] font-medium hover:underline">
              Giriş yap
            </Link>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>✓ Kredi kartı gerekmez</span>
          <span>•</span>
          <span>✓ Anında kullanım</span>
          <span>•</span>
          <span>✓ Türkçe destek</span>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.532 24.552c0-1.636-.132-3.208-.388-4.74H24.48v8.971h12.954c-.56 3.01-2.24 5.558-4.772 7.27v6.038h7.728c4.52-4.164 7.142-10.302 7.142-17.54z" fill="#4285F4"/>
      <path d="M24.48 48c6.48 0 11.924-2.15 15.898-5.81l-7.728-6.038c-2.148 1.44-4.894 2.29-8.17 2.29-6.28 0-11.6-4.238-13.5-9.932H3.02v6.238C6.978 42.612 15.108 48 24.48 48z" fill="#34A853"/>
      <path d="M10.98 28.51c-.484-1.44-.76-2.978-.76-4.51s.276-3.07.76-4.51v-6.24H3.02A23.997 23.997 0 0 0 .48 24c0 3.878.928 7.548 2.54 10.748l7.96-6.238z" fill="#FBBC05"/>
      <path d="M24.48 9.558c3.538 0 6.714 1.216 9.21 3.608l6.904-6.904C36.4 2.394 30.958 0 24.48 0 15.108 0 6.978 5.388 3.02 13.252l7.96 6.24c1.9-5.696 7.22-9.934 13.5-9.934z" fill="#EA4335"/>
    </svg>
  )
}
