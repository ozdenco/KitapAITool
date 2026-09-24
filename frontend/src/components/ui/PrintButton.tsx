import { useState } from 'react'
import { pdfIndir } from '@/lib/pdfOlustur'

interface PrintButtonProps {
  className?: string
  /**
   * Yazdırmayı başlatan işlev. Sayfalar kendi hazırlıklarını yapar
   * (document.title değiştirme, data-printing-result işaretleme) ve
   * window.print() çağırır.
   */
  onPrint: () => void
  /**
   * PDF'e dönüştürülecek DOM öğesini döndürür. Verilmezse PDF butonu
   * yazdırma diyaloğuna düşer (eski davranış).
   */
  pdfHedefi?: () => HTMLElement | null
  /** PDF dosya adı (uzantısız). */
  pdfDosyaAdi?: string
  /** 'kompakt' → dar araç çubukları için küçük butonlar. */
  boyut?: 'normal' | 'kompakt'
}

/**
 * Yazdır ve PDF için ayrı iki buton.
 *
 * PDF butonu artık dosyayı DOĞRUDAN indirir; yazdırma penceresi açılmaz.
 * Önceki sürümde tarayıcının yazdırma diyaloğu açılıyor ve kullanıcının
 * "Hedef → PDF olarak kaydet" seçeneğini bulması gerekiyordu — iki son
 * kullanıcı bu adımda takıldı, biri açıklama metnini okumasına rağmen
 * beceremedi (28 Ağu 2026).
 *
 * "Yazdır" butonu değişmedi: yazıcıya gönderir, isteyen oradan vektörel
 * PDF de alabilir.
 */
export function PrintButton({
  className = '',
  onPrint,
  pdfHedefi,
  pdfDosyaAdi = 'rapor',
  boyut = 'normal',
}: PrintButtonProps) {
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const butonStili =
    boyut === 'kompakt'
      ? 'text-[11px] text-[#9A9792] hover:text-[#3A3935] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F7F6F2] whitespace-nowrap disabled:opacity-50'
      : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D3D1C7] ' +
        'text-sm font-medium text-[#6B6963] bg-white hover:bg-[#F7F6F2] ' +
        'hover:border-[#B4B2A9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const pdfKaydet = async () => {
    const hedef = pdfHedefi?.()

    // Hedef belirtilmemişse eski davranışa düş — kullanıcı çıktısız kalmasın.
    if (!hedef) {
      onPrint()
      return
    }

    setHata(null)
    setPdfHazirlaniyor(true)
    try {
      await pdfIndir({ element: hedef, dosyaAdi: pdfDosyaAdi })
    } catch (e) {
      console.error('PDF oluşturulamadı:', e)
      setHata('PDF oluşturulamadı. "Yazdır" ile deneyebilirsiniz.')
      setTimeout(() => setHata(null), 6000)
    } finally {
      setPdfHazirlaniyor(false)
    }
  }

  return (
    <div className={`inline-flex flex-col items-end gap-1 no-print ${className}`}>
      <div className="inline-flex items-center gap-2">
        <button type="button" onClick={onPrint} className={butonStili} disabled={pdfHazirlaniyor}>
          🖨️ Yazdır
        </button>

        <button
          type="button"
          onClick={pdfKaydet}
          className={butonStili}
          disabled={pdfHazirlaniyor}
          aria-busy={pdfHazirlaniyor}
        >
          {pdfHazirlaniyor ? '⏳ Hazırlanıyor…' : '📄 PDF Kaydet'}
        </button>
      </div>

      {hata && <span className="text-[11px] text-red-600">{hata}</span>}
    </div>
  )
}
