import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { ApiResponse, AuthTokens, LoginRequest, RegisterRequest, User } from '@/types'

type AuthResult = { tokens: AuthTokens; user: User }

// ─── Giriş ───────────────────────────────────────────────────────────────────
export function useLogin() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { data } = await api.post<ApiResponse<AuthResult>>('/auth/login', body)
      if (!data.success || !data.data) throw new Error(data.error ?? 'Giriş başarısız')
      return data.data
    },
    onSuccess: ({ tokens, user }) => {
      localStorage.setItem('access_token', tokens.accessToken)
      localStorage.setItem('refresh_token', tokens.refreshToken)
      setUser(user)
      navigate(user.emailVerified ? '/dashboard' : '/e-posta-dogrula')
    },
  })
}

// ─── Kayıt ───────────────────────────────────────────────────────────────────
export function useRegister() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (body: RegisterRequest) => {
      const { data } = await api.post<ApiResponse<AuthResult>>('/auth/register', body)
      if (!data.success || !data.data) throw new Error(data.error ?? 'Kayıt başarısız')
      return data.data
    },
    onSuccess: ({ tokens, user }) => {
      localStorage.setItem('access_token', tokens.accessToken)
      localStorage.setItem('refresh_token', tokens.refreshToken)
      setUser(user)
      // Yeni kayıt → e-posta doğrulama sayfasına yönlendir
      navigate('/e-posta-dogrula')
    },
  })
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────
export function useGoogleAuth() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (idToken: string) => {
      const { data } = await api.post<ApiResponse<AuthResult>>('/auth/google', { idToken })
      if (!data.success || !data.data) throw new Error(data.error ?? 'Google girişi başarısız')
      return data.data
    },
    onSuccess: ({ tokens, user }) => {
      localStorage.setItem('access_token', tokens.accessToken)
      localStorage.setItem('refresh_token', tokens.refreshToken)
      setUser(user)
      // Google kullanıcıları zaten doğrulanmış
      navigate('/dashboard')
    },
  })
}

// ─── E-posta doğrulama ────────────────────────────────────────────────────────
export function useVerifyEmail() {
  const { setUser, user } = useAuthStore()

  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await api.post<ApiResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      if (!data.success) throw new Error(data.error ?? 'Doğrulama başarısız')
    },
    onSuccess: () => {
      if (user) setUser({ ...user, emailVerified: true })
    },
  })
}

// ─── Doğrulama maili yeniden gönder ──────────────────────────────────────────
export function useResendVerification() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse>('/auth/resend-verification')
      if (!data.success) throw new Error(data.error ?? 'E-posta gönderilemedi')
    },
  })
}

// ─── Çıkış ───────────────────────────────────────────────────────────────────
export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return () => {
    logout()
    navigate('/giris')
  }
}
