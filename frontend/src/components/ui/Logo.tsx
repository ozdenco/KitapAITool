const LOGO_URL = 'https://kolaykobi.com/wp-content/uploads/2025/07/3.png'

interface LogoProps {
  /** px cinsinden yükseklik (genişlik oranla otomatik) */
  height?: number
  className?: string
}

export function Logo({ height = 40, className = '' }: LogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="KolayKOBİ"
      height={height}
      style={{ height, width: 'auto' }}
      className={className}
    />
  )
}
