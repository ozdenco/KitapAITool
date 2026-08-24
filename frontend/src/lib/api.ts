import axios from 'axios'
import type { ApiResponse, AuthTokens } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 300_000, // rakip-analiz: Gemini(90s)+MiniMax(120s)=210s max → 5 dk güvenlik sınırı
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

    // Auth endpointleri (login, register, refresh) için token yenileme yapma
    const isAuthEndpoint = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      // Oturumu kapat ve giriş sayfasına gönder.
      // Not: refresh token yoksa VEYA yenileme başarısızsa (hem exception hem
      // de success:false yanıtı) buraya düşülür — aksi halde kullanıcı sayfada
      // kalıp anlamsız bir "401" hatası görüyordu.
      const oturumuKapat = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (!window.location.pathname.startsWith('/giris')) {
          window.location.href = '/giris?oturum=sonlandi'
        }
        return Promise.reject(
          new Error('Oturumunuz sonlandı. Lütfen tekrar giriş yapın.'),
        )
      }

      if (!refreshToken) return oturumuKapat()

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
        return oturumuKapat()   // HTTP 200 ama success:false
      } catch (refreshError) {
        console.error('Token yenilenemedi:', refreshError)
        return oturumuKapat()
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
