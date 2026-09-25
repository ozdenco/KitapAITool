/**
 * Türkiye'de yaygın özel günler ve bunların paylaşım tarihleriyle eşleştirilmesi.
 *
 * NEREDEN GELDİ: bu mantık kitap sayfasındaki `icerik_takvimi_uretici.html`
 * içinde vardı; SaaS portuna geçerken düşmüştü. 25 Eyl 2026'da üretilen bir
 * takvimde hiçbir resmi gün geçmediği fark edildi (raporda "bayram", "tatil",
 * "29 Ekim" kelimelerinin hiçbiri yoktu). Aynı kayıp örüntüsü chatbot'ta da
 * yaşanmıştı — bkz. hafızadaki "Standalone → SaaS Alan Kaybı".
 *
 * NEDEN HER ZAMAN ÇALIŞIR: kullanıcı özel gün alanını boş bıraksa bile tarama
 * yapılır. Amaç, kullanıcının aklına gelmeyen ama işletmesini ilgilendiren
 * günleri kaçırmamak (ör. "Anneler Günü" yazıp 19 Mayıs'ı unutması).
 */

interface OzelGun {
  ad: string
  /** Verilen yıl için tarihi döndürür — sabit ya da kurala bağlı. */
  tarih: (yil: number) => Date
}

/** Ayın n. <haftaGunu> günü — ör. Mayıs'ın 2. pazarı (Anneler Günü). */
function ayinNinciGunu(yil: number, ay: number, haftaGunu: number, n: number): Date {
  const ilk = new Date(yil, ay, 1)
  const kaydirma = (haftaGunu - ilk.getDay() + 7) % 7
  return new Date(yil, ay, 1 + kaydirma + (n - 1) * 7)
}

/** Ayın SON <haftaGunu> günü — ör. Kasım'ın son cuması (Black Friday). */
function ayinSonGunu(yil: number, ay: number, haftaGunu: number): Date {
  const son = new Date(yil, ay + 1, 0)
  return new Date(yil, ay, son.getDate() - ((son.getDay() - haftaGunu + 7) % 7))
}

/**
 * Sabit tarihli ya da kurala bağlı günler.
 *
 * Hicri takvime göre kayan günler (Ramazan/Kurban Bayramı) BİLEREK YOK:
 * programatik olarak yanlış tarihe sabitlemek, doğru tarihi hiç bilmemekten
 * daha kötü. Onları prompt'ta ayrıca uyarı olarak geçiyoruz.
 */
const OZEL_GUNLER: readonly OzelGun[] = [
  { ad: 'Yılbaşı',                                        tarih: (y) => new Date(y, 0, 1) },
  { ad: 'Sevgililer Günü',                                tarih: (y) => new Date(y, 1, 14) },
  { ad: 'Kadınlar Günü',                                  tarih: (y) => new Date(y, 2, 8) },
  { ad: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',     tarih: (y) => new Date(y, 3, 23) },
  { ad: 'İşçi Bayramı (1 Mayıs)',                         tarih: (y) => new Date(y, 4, 1) },
  { ad: 'Anneler Günü',                                   tarih: (y) => ayinNinciGunu(y, 4, 0, 2) },
  { ad: '19 Mayıs Atatürk\'ü Anma Gençlik ve Spor Bayramı', tarih: (y) => new Date(y, 4, 19) },
  { ad: 'Babalar Günü',                                   tarih: (y) => ayinNinciGunu(y, 5, 0, 3) },
  { ad: 'Demokrasi ve Millî Birlik Günü (15 Temmuz)',     tarih: (y) => new Date(y, 6, 15) },
  { ad: 'Zafer Bayramı (30 Ağustos)',                     tarih: (y) => new Date(y, 7, 30) },
  { ad: 'Cumhuriyet Bayramı (29 Ekim)',                   tarih: (y) => new Date(y, 9, 29) },
  { ad: '11.11 İndirim Günü',                             tarih: (y) => new Date(y, 10, 11) },
  { ad: 'Öğretmenler Günü',                               tarih: (y) => new Date(y, 10, 24) },
  { ad: 'Black Friday',                                   tarih: (y) => ayinSonGunu(y, 10, 5) },
  { ad: 'Cyber Monday',                                   tarih: (y) => { const bf = ayinSonGunu(y, 10, 5); return new Date(y, 10, bf.getDate() + 3) } },
  { ad: 'En Uzun Gece (21 Aralık)',                       tarih: (y) => new Date(y, 11, 21) },
]

/** Asıl tarihe bu kadar gün uzaklıktaki paylaşım "günün mesajı" sayılır. */
const GUN_MESAJI_ESIGI = 3

const BICIM = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' })

/**
 * Paylaşım tarihlerine denk gelen özel günleri bulur ve modele verilecek
 * talimat satırlarını üretir.
 *
 * Eşleştirme kuralı: özel günden ÖNCEKİ (ya da aynı gündeki) en yakın
 * paylaşım günü o günü duyurur. Aradaki mesafe 3 günden fazlaysa "gün
 * mesajı" değil, yönüne göre "öncesi hatırlatma" ya da "gecikmiş anma"
 * olarak işaretlenir — kitap sürümünde canlıda görülen bir hata buydu:
 * 15 Temmuz mesajı 23 Temmuz'da "bugün" diye üretilmişti.
 */
export function ozelGunTalimatlari(paylasimTarihleri: readonly Date[]): string[] {
  if (paylasimTarihleri.length === 0) return []

  const ilk = paylasimTarihleri[0]
  const son = paylasimTarihleri[paylasimTarihleri.length - 1]
  const yillar = [...new Set([ilk.getFullYear(), son.getFullYear()])]

  return OZEL_GUNLER.flatMap((gun) =>
    yillar.flatMap((yil) => {
      const hedef = gun.tarih(yil)
      // Pencereyi biraz geniş tut: özel gün ilk paylaşımdan hemen önce
      // olabilir, o zaman ilk paylaşım "gecikmiş anma" yapar.
      if (hedef < new Date(ilk.getTime() - 7 * 86400000) || hedef > son) return []

      const oncekiler = paylasimTarihleri.filter((t) => t >= hedef)
      const enYakinOnce = [...paylasimTarihleri].reverse().find((t) => t <= hedef)
      const duyuran = enYakinOnce ?? oncekiler[0]
      if (!duyuran) return []

      const farkGun = Math.abs(hedef.getTime() - duyuran.getTime()) / 86400000
      const asama = farkGun <= GUN_MESAJI_ESIGI
        ? 'gün mesajı'
        : duyuran < hedef
          ? 'öncesi hatırlatma (asıl tarihe henüz gelinmedi; "bugün/kutlu olsun" deme)'
          : 'gecikmiş anma (asıl tarih geçti; "geçtiğimiz günlerde" gibi geçmiş zamanla yaz)'

      return [`- ${gun.ad} (${BICIM.format(hedef)}) → ${BICIM.format(duyuran)} tarihli gönderide işle; "${asama}" niteliğinde olsun.`]
    }),
  )
}
