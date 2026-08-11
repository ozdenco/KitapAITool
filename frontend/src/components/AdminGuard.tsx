import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

type Props = {
  children: React.ReactNode
}

export function AdminGuard({ children }: Props) {
  const { user } = useAuthStore()

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
