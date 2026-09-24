import { useEffect, useRef } from 'react'

/**
 * FORM OTOMATİK KAYIT — yazılanları tarayıcıda saklar, sayfa yenilenince geri yükler.
 *
 * NEDEN: Araç formlarında uzun metinler yazılıyor (hangi hizmet tanıtılacak,
 * ek notlar). Sayfa yenilendiğinde bunlar siliniyordu ve kullanıcı fark
 * etmeden BOŞ alanla aracı çalıştırıyordu — model de boşluğu kendi
 * varsayımıyla dolduruyordu (8 Eyl 2026: kullanıcı hangi hizmet için video
 * istediğini yazdı, deploy sonrası sayfa yenilendi, alan boşaldı ve senaryolar
 * bambaşka hizmetler üzerine kuruldu).
 *
 * "Formu Kaydet" düğmesi zaten vardı ama elle basılması gerekiyor; kimse
 * yazarken kaydetmeyi düşünmüyor.
 *
 * Sadece bu tarayıcıda saklanır, sunucuya gitmez. Gizli sekmede veya site
 * verileri temizlenmişse sessizce devre dışı kalır — form yine çalışır.
 */

/** Kayıt bu süreden eskiyse yok sayılır; bayat form doldurmak yanıltıcı olur. */
const GECERLILIK_GUN = 7

/** Her tuş vuruşunda diske yazmayalım. */
const YAZMA_GECIKMESI_MS = 600

interface Kayit<T> {
  kaydedildi: number
  degerler: Partial<T>
}

function anahtarUret(formAdi: string): string {
  return `kkb-form:${formAdi}`
}

export function useFormOtomatikKayit<T extends Record<string, unknown>>(
  formAdi: string,
  degerler: T,
  geriYukle: (kayit: Partial<T>) => void,
) {
  const geriYuklendi = useRef(false)
  const geriYukleRef = useRef(geriYukle)
  geriYukleRef.current = geriYukle

  // ─── Geri yükleme (yalnızca bir kez, ilk render'da) ────────────────────────
  useEffect(() => {
    if (geriYuklendi.current) return
    geriYuklendi.current = true

    try {
      const ham = localStorage.getItem(anahtarUret(formAdi))
      if (!ham) return

      const kayit = JSON.parse(ham) as Kayit<T>
      const yas = Date.now() - (kayit.kaydedildi ?? 0)
      if (yas > GECERLILIK_GUN * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(anahtarUret(formAdi))
        return
      }
      if (kayit.degerler) geriYukleRef.current(kayit.degerler)
    } catch {
      /* bozuk kayıt veya erişim yok — form boş başlar, sorun değil */
    }
  }, [formAdi])

  // ─── Kaydetme (gecikmeli) ─────────────────────────────────────────────────
  useEffect(() => {
    // Geri yükleme yapılmadan yazarsak, boş form kaydı gerçek kaydı ezer
    if (!geriYuklendi.current) return

    const zamanlayici = setTimeout(() => {
      try {
        const doluMu = Object.values(degerler).some((v) =>
          Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim() !== '',
        )
        if (!doluMu) return

        const kayit: Kayit<T> = { kaydedildi: Date.now(), degerler }
        localStorage.setItem(anahtarUret(formAdi), JSON.stringify(kayit))
      } catch {
        /* kota dolu veya erişim yok — sessizce vazgeç */
      }
    }, YAZMA_GECIKMESI_MS)

    return () => clearTimeout(zamanlayici)
  }, [formAdi, degerler])
}

/** Form gönderildikten sonra kaydı temizlemek isteyen sayfalar için. */
export function formKaydiniSil(formAdi: string) {
  try {
    localStorage.removeItem(anahtarUret(formAdi))
  } catch { /* erişim yok */ }
}
