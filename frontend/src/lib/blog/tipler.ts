/**
 * Blog içerik modeli.
 *
 * Yazılar HTML string olarak DEĞİL, yapılandırılmış blok dizisi olarak
 * tutulur — böylece dangerouslySetInnerHTML kullanmaya gerek kalmaz ve
 * XSS yüzeyi oluşmaz.
 */

export type Blok =
  | { tur: 'p'; metin: string }
  | { tur: 'h2'; metin: string }
  | { tur: 'liste'; maddeler: string[] }
  | { tur: 'sirali'; maddeler: string[] }
  | { tur: 'not'; metin: string }
  /** Platformdaki bir araca yönlendirme kutusu. */
  | { tur: 'aracCta'; toolId: string; metin: string }

export interface BlogYazisi {
  slug: string
  baslik: string
  ozet: string
  tarih: string          // ISO — 'YYYY-MM-DD'
  etiketler: string[]
  bloklar: Blok[]
}

/** Yazının kelime sayısından okuma süresi (dakika) — ~200 kelime/dk. */
export function okumaSuresi(yazi: BlogYazisi): { dakika: number; kelime: number } {
  const kelime = yazi.bloklar.reduce((toplam, blok) => {
    const metin =
      blok.tur === 'liste' || blok.tur === 'sirali'
        ? blok.maddeler.join(' ')
        : blok.metin
    return toplam + metin.trim().split(/\s+/).filter(Boolean).length
  }, 0)
  return { dakika: Math.max(1, Math.round(kelime / 200)), kelime }
}

/** '2026-08-27' → '27 Ağustos 2026' */
export function tarihGoster(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}
