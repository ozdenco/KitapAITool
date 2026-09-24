import { SIRKET } from '@/lib/sirketBilgileri'

/**
 * Marka logosu.
 *
 * 27 Ağu 2026: "KolayKOBİ" marka tescili alınamadığı için, tescilli GP
 * markasının KolayKOBİ'ye uyarlanmış logosu kullanılmaya başlandı.
 *
 * Dosya artık WordPress'ten değil uygulamanın kendi `public/` klasöründen
 * servis ediliyor — eski logo kolaykobi.com üzerinde barınıyordu ve o site
 * erişilemediğinde uygulamanın logosu da kırılıyordu.
 */
const LOGO_URL = '/gpai-logo512.png'

interface LogoProps {
  /** px cinsinden yükseklik (genişlik oranla otomatik) */
  height?: number
  className?: string
  /**
   * Logonun yanında marka adını da göster.
   * Yeni logo bir simge (kare) olduğu için tek başına marka adını
   * okutmuyor; giriş/kayıt gibi öne çıkan yerlerde ad da gösterilir.
   */
  adiGoster?: boolean
}

export function Logo({ height = 40, className = '', adiGoster = false }: LogoProps) {
  const gorsel = (
    <img
      src={LOGO_URL}
      alt={SIRKET.marka}
      width={height}
      height={height}
      style={{ height, width: height }}
      className={adiGoster ? '' : className}
    />
  )

  if (!adiGoster) return gorsel

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {gorsel}
      <span
        className="font-bold text-[#1C1B19] leading-none whitespace-nowrap"
        style={{ fontSize: Math.round(height * 0.46) }}
      >
        {SIRKET.marka}
      </span>
    </span>
  )
}
