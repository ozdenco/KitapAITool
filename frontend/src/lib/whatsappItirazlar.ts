/**
 * WhatsApp Satış Script Üretici — itiraz kataloğu.
 *
 * Eskiden formda 6 sabit itiraz vardı ve son kullanıcı bunun yetersiz
 * olduğunu bildirdi (27 Ağu 2026). Liste kategorilere ayrılmış 36 maddeye
 * çıkarıldı; seçim artık checkbox ızgarası yerine iki listeli aktarma
 * arayüzüyle yapılıyor (bkz. ItirazSecici).
 */

export interface ItirazKategori {
  id: string
  ad: string
  ikon: string
  itirazlar: string[]
}

export const ITIRAZ_KATEGORILERI: readonly ItirazKategori[] = [
  {
    id: 'fiyat',
    ad: 'Fiyat & Bütçe',
    ikon: '💰',
    itirazlar: [
      'Fiyatı pahalı',
      'Bütçem yok',
      'Rakibiniz daha ucuz',
      'Bu iş bu kadar etmez',
      'İndirim yaparsanız düşünürüm',
      'Taksit / vade imkânı var mı',
      'Bu yıl için bütçe kapandı',
      'Şirket masraflarını kısıyoruz',
    ],
  },
  {
    id: 'zamanlama',
    ad: 'Zamanlama',
    ikon: '⏳',
    itirazlar: [
      'Düşüneyim / bekleyeyim',
      'Şu an ihtiyacım yok',
      'Şu an çok yoğunum',
      'Sezon sonunda konuşalım',
      'Önce mevcut sözleşmem bitsin',
      'Sonra ben size dönerim',
    ],
  },
  {
    id: 'guven',
    ad: 'Güven & Risk',
    ikon: '🛡️',
    itirazlar: [
      'Riski bilmiyorum / güvenmiyorum',
      'Sizi tanımıyorum, referansınız var mı',
      'Daha önce benzer bir hizmetten zarar gördüm',
      'Sözleşmeye bağlanmak istemiyorum',
      'Verilerim güvende mi',
      'İşe yaramazsa param geri gelir mi',
      'Gizli ek ücret çıkar mı',
    ],
  },
  {
    id: 'rekabet',
    ad: 'Rakip & Alternatif',
    ikon: '⚔️',
    itirazlar: [
      'Başka biriyle çalışıyorum',
      'Mevcut tedarikçimden memnunum',
      'Bunu kendi ekibimiz yapabilir',
      'Ücretsiz alternatifleri var',
      'Birkaç yerden daha teklif alacağım',
    ],
  },
  {
    id: 'karar',
    ad: 'Karar & Yetki',
    ikon: '🧑‍💼',
    itirazlar: [
      'Ortağıma / eşime danışmam lazım',
      'Bu kararı patron veriyor',
      'Yönetim kuruluna sunmam gerekiyor',
      'Muhasebeci onay vermeli',
    ],
  },
  {
    id: 'deger',
    ad: 'Fayda & Sonuç',
    ikon: '📈',
    itirazlar: [
      'Bunun bana ne faydası olacak',
      'Sonuç garantisi veriyor musunuz',
      'Ne kadar sürede sonuç alırım',
      'Bizim sektörümüzde işe yaramaz',
      'İşletmem bunun için çok küçük',
      'Çok karmaşık, kullanamam',
    ],
  },
] as const

/** Katalogdaki tüm itirazlar — arama ve doğrulama için düz liste. */
export const TUM_ITIRAZLAR: readonly string[] = ITIRAZ_KATEGORILERI.flatMap((k) => k.itirazlar)

/** Bir itirazın hangi kategoriye ait olduğunu döndürür (serbest metin için null). */
export function itirazKategorisi(itiraz: string): ItirazKategori | null {
  return ITIRAZ_KATEGORILERI.find((k) => k.itirazlar.includes(itiraz)) ?? null
}
