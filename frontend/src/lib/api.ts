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

/**
 * Devam eden yenileme isteği.
 *
 * HATA (27 Ağu 2026): Yenileme jetonu her kullanımda döndürülüyor (eskisi
 * geçersiz oluyor). Dashboard açılışında birden fazla istek aynı anda gidiyor;
 * erişim jetonu süresi dolmuşsa hepsi birden 401 alıp aynı eski jetonla
 * yenileme deniyordu. İlki başarılı olup jetonu döndürünce diğerleri geçersiz
 * jetonla gelip reddediliyor ve kullanıcı giriş sayfasına atılıyordu.
 *
 * Çözüm: aynı anda yalnızca BİR yenileme çalışır; diğer istekler onun
 * sonucunu bekler ve yeni jetonla devam eder.
 */
let yenilemeIslemi: Promise<string | null> | null = null

async function jetonYenile(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  try {
    const accessToken = localStorage.getItem('access_token')
    const { data } = await axios.post<ApiResponse<AuthTokens>>('/api/auth/refresh', {
      accessToken,
      refreshToken,
    })
    if (data.success && data.data) {
      localStorage.setItem('access_token', data.data.accessToken)
      localStorage.setItem('refresh_token', data.data.refreshToken)
      return data.data.accessToken
    }
    return null
  } catch (hata) {
    console.error('Token yenilenemedi:', hata)
    return null
  }
}

// ─── Response interceptor: 401 → token yenile ────────────────────────────────
api.interceptors.response.use(
  (res) => {
    /*
     * n8n bir hatayı HTTP 200 ile, gövdede { _parseError: true, error } olarak
     * bildiriyor. Sayfalar yalnızca HTTP hatalarını yakalıyordu; bu cevaplar
     * "sonuç" sanılıp boş ekran gösteriliyordu (11 Eyl 2026: Video Oluşturma'da
     * "web siteniz okunamadı" mesajı hiç görünmedi, yalnızca kaynak video kartı
     * kaldı). HTTP hatasıyla aynı biçimde reddediyoruz — mesaj her sayfanın
     * mevcut hata alanına düşer. Durum yoklamaları ({status, error}) etkilenmez.
     */
    const govde = res.data as { _parseError?: unknown; error?: unknown } | null
    if (govde && typeof govde === 'object' && govde._parseError === true) {
      const mesaj = typeof govde.error === 'string' && govde.error.trim()
        ? govde.error
        : 'Araç bir hata döndürdü. Lütfen tekrar deneyin.'
      return Promise.reject(new Error(mesaj))
    }
    return res
  },
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

      // Zaten bir yenileme sürüyorsa yenisini başlatma, onu bekle.
      yenilemeIslemi ??= jetonYenile().finally(() => { yenilemeIslemi = null })

      const yeniJeton = await yenilemeIslemi
      if (!yeniJeton) return oturumuKapat()

      original.headers.Authorization = `Bearer ${yeniJeton}`
      return api(original)
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
