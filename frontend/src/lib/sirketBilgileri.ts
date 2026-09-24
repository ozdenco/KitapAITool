/**
 * Şirket künyesi — TEK KAYNAK.
 *
 * Yasal metinler (KVKK, Gizlilik, Açık Rıza, DPA, Mesafeli Satış) aynı
 * bilgileri tekrar tekrar içeriyordu. Bir adres/unvan değişikliğinde altı
 * ayrı dosyayı düzenlemek yerine burayı güncelleyin.
 *
 * ⚠️ TAMAMLANMASI GEREKEN ALANLAR: ticaretUnvani, adres, vergiDairesi,
 * vergiNo, mersisNo. Mesafeli Satış Sözleşmesi ve KVKK Aydınlatma Metni
 * için bunlar mevzuat gereği zorunludur; boş bırakılamaz.
 */

export const SIRKET = {
  marka: 'KolayKOBİ',
  /**
   * Çatı marka. KolayKOBİ'nin kendi marka tescili YOKTUR; hukuki dayanak
   * Görsel Projeler'in Sınıf 35 ve 41 tescilleridir. Marka brief'i,
   * KolayKOBİ'nin ayrı bir tescilli marka gibi değil, GP bünyesinde
   * tanımlayıcı bir hizmet adı olarak konumlandırılmasını şart koşuyor —
   * bu yüzden GP bağlantısı arayüzde görünür tutulur ve KolayKOBİ yanında
   * ™/® işareti KULLANILMAZ.
   */
  catiMarka: 'Görsel Projeler',
  catiMarkaSitesi: 'https://gorselprojeler.com',
  alanAdi: 'kolaykobi.com',
  uygulamaAdresi: 'https://app.kolaykobi.com',

  /** Tam ticaret unvanı — ticaret sicilindeki haliyle. */
  ticaretUnvani: 'GP Bilgi ve İletişim Hizmetleri Ltd. Şti.',
  /** Tebligata elverişli açık adres. */
  adres:
    'Konak Mah. Cumhuriyet Blv. Cumhuriyet İş Merkezi No:26 İç Kapı No:404 Konak / İZMİR',
  vergiDairesi: 'Kemeraltı Vergi Dairesi',
  vergiNo: '4110756181',
  /** MERSİS numarası (16 hane). */
  mersisNo: '0411075618100001',

  eposta: 'merhaba@kolaykobi.com',
  destekEposta: 'destek@kolaykobi.com',
  kvkkEposta: 'kvkk@kolaykobi.com',
  telefon: '0532 290 20 89',
  telefonHref: '+905322902089',
} as const

/** Künyenin doldurulması gereken alanı var mı? Uyarı göstermek için. */
export function kunyeEksikMi(): boolean {
  return [
    SIRKET.ticaretUnvani,
    SIRKET.adres,
    SIRKET.vergiDairesi,
    SIRKET.vergiNo,
  ].some((deger) => deger.startsWith('['))
}

/** Yasal metinlerde gösterilen son güncelleme tarihi. */
export const YASAL_SON_GUNCELLEME = 'Ağustos 2026'
