import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { identifyUser } from '@/lib/analytics'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore()

  // 30 dk hareketsizlikte oturumu kapatır
  useIdleTimeout()

  // Kullanıcı giriş yaptığında Posthog'a tanıt
  useEffect(() => {
    if (user) identifyUser(user)
  }, [user])

  if (!isAuthenticated) return <Navigate to="/giris" replace />
  return <>{children}</>
}
