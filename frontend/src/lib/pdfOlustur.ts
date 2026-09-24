/**
 * Ekrandaki sonucu doğrudan PDF olarak indirir — yazdırma penceresi açılmadan.
 *
 * NEDEN: Önceki akış tarayıcının yazdırma diyaloğunu açıyor ve kullanıcının
 * "Hedef → PDF olarak kaydet" seçeneğini bulması gerekiyordu. İki ayrı son
 * kullanıcı bu adımda takıldı (28 Ağu 2026); biri açıklama metnini okumasına
 * rağmen yapamadı. Artık PDF tarayıcıda üretilip indiriliyor.
 *
 * TAKAS: Bu yöntem sayfayı görüntüye çevirip PDF'e gömer. Yazdırma
 * diyaloğunun ürettiği vektörel PDF'e göre iki farkı var:
 *   - Metin seçilemez / aranamaz
 *   - Dosya boyutu daha büyük
 * Karşılığında kullanıcı tek tıkla dosyayı alıyor. "Yazdır" butonu duruyor;
 * vektörel çıktı isteyen oradan yazdırıp PDF'e kaydedebilir.
 *
 * Kütüphaneler yalnızca butona basıldığında yükleniyor (dinamik import) —
 * ~500 KB'lık yükü her sayfa açılışına bindirmemek için.
 */

import { dinamikYukle } from '@/lib/dinamikYukle'

/** A4 ölçüleri (mm). */
const A4_GENISLIK = 210
const A4_YUKSEKLIK = 297
const KENAR_BOSLUK = 10

export interface PdfSecenekleri {
  /** PDF'e dönüştürülecek DOM öğesi. */
  element: HTMLElement
  /** Uzantısız dosya adı. */
  dosyaAdi: string
}

/** Dosya adından işletim sisteminin kabul etmediği karakterleri temizler. */
function dosyaAdiTemizle(ad: string): string {
  return ad
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'rapor'
}

export async function pdfIndir({ element, dosyaAdi }: PdfSecenekleri): Promise<void> {
  /*
   * html2canvas-pro, html2canvas'ın bakımlı çatalı.
   *
   * NEDEN ÇATAL: Tailwind v4 renkleri oklch()/lab() olarak üretiyor
   * (derlenmiş CSS'te 90+ örnek). html2canvas 1.4.1 (2022) bu renk
   * fonksiyonlarını ayrıştıramıyor ve çekim sırasında hata fırlatıyor —
   * "PDF oluşturulamadı" mesajının sebebi buydu (1 Eyl 2026).
   */
  /*
   * dinamikYukle: yeni sürüm yayınlandıktan sonra AÇIK KALAN sekmeler eski
   * parça adlarını istiyor ve "Failed to fetch dynamically imported module"
   * alıyordu — kullanıcıya "PDF oluşturulamadı" diye yansıyordu
   * (9 Eyl 2026). Artık sayfa bir kez yenilenip işlem tekrarlanabiliyor.
   */
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    dinamikYukle(() => import('html2canvas-pro')),
    dinamikYukle(() => import('jspdf')),
  ])

  /*
   * html2canvas EKRANDAKİ hesaplanmış stilleri okur; @media print kuralları
   * burada devrede değildir. Bu yüzden yalnızca çıktıda görünmesi gereken
   * başlık (.sadece-cikti) çekim süresince <body> üzerindeki bir sınıfla
   * açılıyor, iş bitince kapatılıyor.
   */
  document.body.classList.add('pdf-cekiliyor')

  let canvas: HTMLCanvasElement
  try {
    // scale=2 → ekran çözünürlüğünün iki katı; metin baskıda bulanık çıkmasın.
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Kaydırma konumu görüntüyü kaydırmasın
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
    })
  } finally {
    // Hata olsa bile sınıf ekranda kalmamalı
    document.body.classList.remove('pdf-cekiliyor')
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const icerikGenislik = A4_GENISLIK - KENAR_BOSLUK * 2
  const icerikYukseklik = A4_YUKSEKLIK - KENAR_BOSLUK * 2

  // Görüntüyü sayfa genişliğine ölçekle
  const oran = icerikGenislik / canvas.width
  const toplamYukseklikMm = canvas.height * oran

  if (toplamYukseklikMm <= icerikYukseklik) {
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG', KENAR_BOSLUK, KENAR_BOSLUK, icerikGenislik, toplamYukseklikMm,
    )
  } else {
    // Uzun içerik: canvas'ı sayfa yüksekliği kadar dilimleyip sırayla ekle.
    const dilimYukseklikPx = Math.floor(icerikYukseklik / oran)
    let ofset = 0
    let ilkSayfa = true

    while (ofset < canvas.height) {
      const buDilim = Math.min(dilimYukseklikPx, canvas.height - ofset)

      const parca = document.createElement('canvas')
      parca.width = canvas.width
      parca.height = buDilim
      const ctx = parca.getContext('2d')
      if (!ctx) throw new Error('PDF oluşturulamadı: çizim bağlamı alınamadı.')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, parca.width, parca.height)
      ctx.drawImage(canvas, 0, ofset, canvas.width, buDilim, 0, 0, canvas.width, buDilim)

      if (!ilkSayfa) pdf.addPage()
      pdf.addImage(
        parca.toDataURL('image/jpeg', 0.92),
        'JPEG', KENAR_BOSLUK, KENAR_BOSLUK, icerikGenislik, buDilim * oran,
      )

      ilkSayfa = false
      ofset += buDilim
    }
  }

  pdf.save(`${dosyaAdiTemizle(dosyaAdi)}.pdf`)
}
