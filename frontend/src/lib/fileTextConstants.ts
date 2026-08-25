/**
 * Dosya metni çıkarma modülünün paylaşılan sabitleri/tipleri.
 *
 * DİKKAT: Bu dosya `pdfjs-dist`'i İÇERMEZ ve içermemeli. `extractFileText.ts`
 * pdfjs-dist'i statik import ediyor; o dosya statik import edilirse
 * pdfjs-dist (~250KB + worker) her sayfa yüklemesinde bundle'a girer —
 * chatbot'u hiç kullanmayan kullanıcı bile onu indirir. Bu yüzden sayfa
 * bileşenleri `extractFileText` fonksiyonunu yalnızca kullanıcı gerçekten
 * dosya seçtiğinde `await import('@/lib/extractFileText')` ile dinamik
 * yüklemeli; ucuz olan bu sabitler ise doğrudan import edilebilir.
 */

export const KABUL_EDILEN_TIPLER = ['.pdf', '.txt'] as const
export const MAKS_DOSYA_BOYUTU = 3 * 1024 * 1024        // 3 MB

/** Prompt'a eklenecek metnin üst sınırı. ~6000 karakter ≈ 1500 token. */
export const MAKS_METIN_KARAKTER = 6000

export interface CikarilanMetin {
  metin: string
  kirpildiMi: boolean
  hamKarakterSayisi: number
}

export class DosyaHatasi extends Error {}
