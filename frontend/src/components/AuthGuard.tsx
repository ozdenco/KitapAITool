import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/giris" replace />
  return <>{children}</>
}
