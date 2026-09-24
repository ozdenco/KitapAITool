/**
 * İşletme profili — araç formlarını ön-dolduran ortak künye.
 *
 * Araç formlarının 11'i "işletme adı" ve "sektör", 5'i "hedef kitle",
 * 4'ü "hizmet/ürün" soruyor. Kullanıcı bir kez doldurur, hepsinde
 * otomatik gelir.
 */

export const ISLETME_PROFILI_YOLU = '/hesabim/isletme-bilgilerim'

export interface IsletmeProfili {
  businessName: string
  sector: string
  city: string
  productService: string
  targetAudience: string
  priceSegment: string
  strengths: string
  website: string
  instagram: string
  linkedIn: string
  facebook: string
  youTube: string
  tikTok: string
  brandTone: string
  notes: string
  updatedAt?: string | null
}

export const BOS_ISLETME_PROFILI: IsletmeProfili = {
  businessName: '', sector: '', city: '', productService: '', targetAudience: '',
  priceSegment: '', strengths: '', website: '', instagram: '', linkedIn: '',
  facebook: '', youTube: '', tikTok: '', brandTone: '', notes: '',
}

/** API null döndürebilir; formda boş string kullanmak daha rahat. */
export function apidenNormallestir(veri: Partial<Record<keyof IsletmeProfili, unknown>> | null): IsletmeProfili {
  if (!veri) return BOS_ISLETME_PROFILI
  const sonuc = { ...BOS_ISLETME_PROFILI }
  for (const anahtar of Object.keys(BOS_ISLETME_PROFILI) as (keyof IsletmeProfili)[]) {
    const deger = veri[anahtar]
    if (typeof deger === 'string') (sonuc[anahtar] as string) = deger
  }
  sonuc.updatedAt = typeof veri.updatedAt === 'string' ? veri.updatedAt : null
  return sonuc
}

/** Doldurulmuş alan sayısı — tamamlanma göstergesi için. */
export function doluAlanSayisi(profil: IsletmeProfili): { dolu: number; toplam: number } {
  const alanlar = Object.keys(BOS_ISLETME_PROFILI) as (keyof IsletmeProfili)[]
  const dolu = alanlar.filter((a) => (profil[a] as string)?.trim()).length
  return { dolu, toplam: alanlar.length }
}

/**
 * Profil 6 aydan eskiyse hatırlatma göster — kullanıcı bir kez doldurup
 * unutursa çıktılar sessizce bayatlar.
 */
export function bayatMi(updatedAt?: string | null): boolean {
  if (!updatedAt) return false
  const altiAyMs = 1000 * 60 * 60 * 24 * 182
  return Date.now() - new Date(updatedAt).getTime() > altiAyMs
}
