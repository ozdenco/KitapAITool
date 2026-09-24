import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import {
  apidenNormallestir,
  BOS_ISLETME_PROFILI,
  type IsletmeProfili,
} from '@/lib/isletmeProfili'

export const ISLETME_PROFILI_ANAHTARI = ['isletme-profili'] as const

/**
 * İşletme profilini getirir. Araç sayfaları form alanlarını bununla
 * ön-doldurur.
 *
 * Sonuç react-query önbelleğinde tutulur; kullanıcı araçlar arasında
 * gezerken her seferinde yeni istek atılmaz.
 */
export function useIsletmeProfili() {
  const oturumAcik = useAuthStore((s) => s.isAuthenticated)

  const { data, isLoading } = useQuery<IsletmeProfili>({
    queryKey: ISLETME_PROFILI_ANAHTARI,
    queryFn: async () => {
      const res = await api.get('/users/me/business-profile')
      return apidenNormallestir(res.data?.data ?? null)
    },
    enabled: oturumAcik,
    staleTime: 1000 * 60 * 10,
  })

  return { profil: data ?? BOS_ISLETME_PROFILI, yukleniyor: isLoading }
}

/**
 * Araç formlarında `useState` başlangıç değeri olarak kullanılan yardımcı.
 *
 * DİKKAT: profil ağ üzerinden geldiği için ilk render'da boş olabilir.
 * Bu yüzden araç sayfaları `useState(profil.sector)` yerine
 * `useOnDolgu` kullanır — değer geldiğinde alan bir kez doldurulur,
 * kullanıcı yazmaya başladıysa üzerine YAZILMAZ.
 */
export type ProfilAlani = keyof IsletmeProfili

type AlanBagi = readonly [mevcut: string, ayarla: (v: string) => void]

/**
 * Araç formlarını işletme profilinden ön-doldurur.
 *
 * Kullanımı:
 *   useProfilOnDolgu({
 *     businessName: [biz, setBiz],
 *     sector:       [sector, setSector],
 *   })
 *
 * Davranış:
 *  - Profil ağdan geldiğinde YALNIZCA boş alanlar doldurulur; kullanıcı
 *    o sırada bir şey yazdıysa yazdığı korunur.
 *  - Her alan en fazla bir kez doldurulur. Kullanıcı doldurulan değeri
 *    silerse alan boş kalır, tekrar yazılmaz.
 */
export function useProfilOnDolgu(eslesme: Partial<Record<ProfilAlani, AlanBagi>>): void {
  const { profil } = useIsletmeProfili()
  const doldurulanlar = useRef<Set<string>>(new Set())

  // Bağlar her render'da yeni dizi olduğu için ref üzerinden okunur;
  // effect yalnızca profil değiştiğinde çalışır.
  const eslesmeRef = useRef(eslesme)
  eslesmeRef.current = eslesme

  useEffect(() => {
    for (const [alan, bag] of Object.entries(eslesmeRef.current)) {
      if (!bag) continue
      if (doldurulanlar.current.has(alan)) continue

      const profilDegeri = profil[alan as ProfilAlani]
      if (typeof profilDegeri !== 'string' || !profilDegeri.trim()) continue

      const [mevcut, ayarla] = bag as AlanBagi
      doldurulanlar.current.add(alan)
      if (mevcut.trim()) continue        // kullanıcı yazmış — dokunma

      ayarla(profilDegeri)
    }
  }, [profil])
}
