import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegister } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate: register, isPending, error } = useRegister()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    register({ name, email, password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#1D9E75]/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🤖</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Kolay<span className="text-[#1D9E75]">KOBİ</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Dijital ajansınız artık bir yazılım</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Ücretsiz Hesap Oluştur</h2>
          <p className="text-sm text-gray-500 mb-5">Her araç için aylık 3 ücretsiz kullanım</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error instanceof Error ? error.message : 'Kayıt yapılamadı. Tekrar deneyin.'}
            </div>
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

        {/* Trust signals */}
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
