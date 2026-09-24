import type { BlogYazisi } from './tipler'
import { yazi as kobilerdeYapayZeka } from './kobilerde-yapay-zeka-kullanimi'
import { yazi as icerikTakvimi } from './sosyal-medya-icerik-takvimi'
import { yazi as whatsappItiraz } from './whatsapp-satis-itiraz-karsilama'
import { yazi as musteriPersonasi } from './musteri-personasi-nedir'

/** Tüm yazılar — en yeniden eskiye sıralı. */
export const BLOG_YAZILARI: readonly BlogYazisi[] = [
  kobilerdeYapayZeka,
  icerikTakvimi,
  whatsappItiraz,
  musteriPersonasi,
].sort((a, b) => b.tarih.localeCompare(a.tarih))

export function yaziBul(slug: string): BlogYazisi | undefined {
  return BLOG_YAZILARI.find((y) => y.slug === slug)
}

/** Yazının altında gösterilecek diğer yazılar. */
export function ilgiliYazilar(slug: string, adet = 2): BlogYazisi[] {
  const mevcut = yaziBul(slug)
  if (!mevcut) return BLOG_YAZILARI.slice(0, adet)

  // Ortak etiketi olanlar önce gelsin
  return [...BLOG_YAZILARI]
    .filter((y) => y.slug !== slug)
    .sort((a, b) => {
      const ortak = (y: BlogYazisi) =>
        y.etiketler.filter((e) => mevcut.etiketler.includes(e)).length
      return ortak(b) - ortak(a)
    })
    .slice(0, adet)
}

export * from './tipler'
