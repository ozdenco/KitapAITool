import axios from 'axios'
import type { ApiResponse, AuthTokens } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 210_000, // Orijinal toollar browser fetch (sonsuz); biz 3.5 dk güvenlik sınırı koyuyoruz
})

// ─── Request interceptor: JWT token ekle ─────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor: 401 → token yenile ────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          const accessToken = localStorage.getItem('access_token')
          const { data } = await axios.post<ApiResponse<AuthTokens>>('/api/auth/refresh', {
            accessToken,
            refreshToken,
          })
          if (data.success && data.data) {
            localStorage.setItem('access_token', data.data.accessToken)
            localStorage.setItem('refresh_token', data.data.refreshToken)
            original.headers.Authorization = `Bearer ${data.data.accessToken}`
            return api(original)
          }
        } catch {
          // refresh başarısız → oturumu kapat
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/giris'
        }
      }
    }

    // Backend'den gelen Türkçe hata mesajını çıkar
    const backendMessage = error.response?.data?.error
    if (backendMessage) {
      return Promise.reject(new Error(backendMessage))
    }

    return Promise.reject(error)
  },
)

export default api
