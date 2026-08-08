import { useEffect } from 'react'

/**
 * Sayfa terk uyarısı — form dolu ama sonuç henüz gelmemişken
 * kullanıcı sekmeyi kapatmaya / sayfayı terk etmeye çalışırsa uyarır.
 *
 * @param when true olduğunda uyarıyı aktifleştirir
 */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern tarayıcılar bu string'i göstermez ama standart olarak gerekli
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [when])
}
