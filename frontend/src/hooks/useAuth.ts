import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { ApiResponse, AuthTokens, LoginRequest, RegisterRequest, User } from '@/types'

// ─── Login ────────────────────────────────────────────────────────────────────
export function useLogin() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { data } = await api.post<ApiResponse<{ tokens: AuthTokens; user: User }>>(
        '/auth/login',
        body,
      )
      if (!data.success || !data.data) throw new Error(data.error ?? 'Giriş başarısız')
      return data.data
    },
    onSuccess: ({ tokens, user }) => {
      localStorage.setItem('access_token', tokens.accessToken)
      localStorage.setItem('refresh_token', tokens.refreshToken)
      setUser(user)
      navigate('/dashboard')
    },
  })
}

// ─── Register ─────────────────────────────────────────────────────────────────
export function useRegister() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (body: RegisterRequest) => {
      const { data } = await api.post<ApiResponse<{ tokens: AuthTokens; user: User }>>(
        '/auth/register',
        body,
      )
      if (!data.success || !data.data) throw new Error(data.error ?? 'Kayıt başarısız')
      return data.data
    },
    onSuccess: ({ tokens, user }) => {
      localStorage.setItem('access_token', tokens.accessToken)
      localStorage.setItem('refresh_token', tokens.refreshToken)
      setUser(user)
      navigate('/dashboard')
    },
  })
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return () => {
    logout()
    navigate('/giris')
  }
}
