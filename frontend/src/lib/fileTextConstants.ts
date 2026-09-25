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

/**
 * Prompt'a eklenecek metnin üst sınırı.
 *
 * 25 Eyl 2026'da 6.000'den 30.000'e çıkarıldı. Gerekçe ürün kararı: 12
 * sayfalık gerçek bir bilgi tabanı yüklendiğinde metnin %76'sı kesiliyordu
 * (24.042 karakterin 6.000'i alınıyor, 43 soru-cevap çiftinin 23'ü dışarıda
 * kalıyordu). Kullanıcıya "belgeni böl" demek, aracı 2-3 sayfalık belgelerle
 * sınırlı göstermek anlamına geliyordu.
 *
 * DİKKAT — bu değeri artırırken n8n'deki `max_completion_tokens` de
 * artırılmalı. Girdi büyüdükçe model daha çok kart üretiyor; çıktı bütçesi
 * yetmezse 23 Eyl 2026'daki hata tekrarlar: model bütün bütçeyi <think>
 * içinde harcayıp hiç JSON üretmemiş, kullanıcının kredisi boşa gitmişti.
 * Bkz. kolay-kobi-chatbot.json → Build Request Body.
 */
export const MAKS_METIN_KARAKTER = 30000

export interface CikarilanMetin {
  metin: string
  kirpildiMi: boolean
  hamKarakterSayisi: number
}

export class DosyaHatasi extends Error {}
