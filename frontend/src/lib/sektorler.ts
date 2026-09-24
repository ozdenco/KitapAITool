/**
 * Sektör listesi — TEK KAYNAK.
 *
 * NEDEN: 27 Ağu 2026'da kod tabanında DÖRT farklı sektör listesi olduğu
 * görüldü — 9 dosya "Muhasebe / Finans", biri "Muhasebe / Finans /
 * Danışmanlık" yazıyordu. İşletme profilinden gelen ön dolgu, değerler
 * birebir eşleşmediği için bazı araçlarda alanı boş bırakıyordu.
 *
 * Değerler A grubundaki (9 dosyada kullanılan) kısa adlar temel alınarak
 * birleştirildi; diğer listelerde bulunup burada olmayanlar eklendi.
 * YENİ BİR SEKTÖR EKLERKEN yalnızca bu dosyayı değiştirin.
 *
 * Kapsam notları (etiketler kısa, karşılıkları geniş):
 *  - 'Teknoloji / Yazılım'              → yazılım GELİŞTİREN firmalar
 *  - 'Dijital Ürünler / Yazılım Satışı' → lisans, kurs, şablon SATAN firmalar
 *  - 'Mobilite / Enerji'                → EV şarj cihazları, batarya ve
 *                                          enerji depolama sistemleri
 */

export const SEKTORLER = [
  // ALFABETİK (Türkçe), "Diğer" en sonda. 11 Eyl 2026: sırasız listede kullanıcı
  // "Giyim / Tekstil"i T harfinin yanında aradı, bulamayınca "Tekstil yok" dedi.
  // Aynı gün 10 sektör eklendi (sigorta, emlak, tarım, tekstil üretimi…) — test
  // kullanıcılarının işi listede yoktu. MEVCUT DEĞERLERİN ADI DEĞİŞMEDİ: kayıtlı
  // profillerin ön dolgusu birebir eşleşmeye dayanıyor.
  'Dijital Ürünler / Yazılım Satışı',
  'E-ticaret',
  'Eğitim / Kurs',
  'Elektronik / Beyaz Eşya',
  'Emlak / Gayrimenkul',
  'Evcil Hayvan / Veteriner',
  'Fotoğraf / Prodüksiyon',
  'Giyim / Tekstil',
  'Güzellik / Estetik',
  'Hukuk / Danışmanlık',
  'İnşaat / Mühendislik',
  'Kuyumculuk / Takı',
  'Lojistik / Taşımacılık',
  'Matbaa / Baskı',
  'Mobilite / Enerji',
  'Mobilya / Ev Dekorasyonu',
  'Muhasebe / Finans',
  'Organizasyon / Etkinlik',
  'Otomotiv',
  'Perakende / Mağaza',
  'Reklam / Pazarlama',
  'Sağlık / Klinik',
  'Sigorta / Acente',
  'Spor / Fitness',
  'Tarım / Hayvancılık',
  'Teknoloji / Yazılım',
  'Tekstil Üretimi / Konfeksiyon',
  'Televizyon / Medya',
  'Temizlik / Hizmet',
  'Turizm / Otel',
  'Üretim / İmalat',
  'Yiyecek / İçecek',
  'Diğer',
] as const

export type Sektor = (typeof SEKTORLER)[number]

/**
 * ARAMA İÇİN EŞ ANLAMLILAR — etiketler kısa, kullanıcı ise kendi kelimesini
 * yazıyor ("depolama", "konfeksiyon", "bayi"). Yalnızca arama eşleşmesinde
 * kullanılır; seçilen DEĞER yine listedeki etikettir.
 */
export const SEKTOR_ARAMA_KELIMELERI: Readonly<Record<string, readonly string[]>> = {
  'Lojistik / Taşımacılık': ['depolama', 'depo', 'antrepo', 'kargo', 'nakliye', 'kurye', 'dağıtım', 'lojistik'],
  'Giyim / Tekstil': ['tekstil', 'hazır giyim', 'moda', 'butik', 'kıyafet'],
  'Elektronik / Beyaz Eşya': ['bayi', 'beyaz eşya', 'buzdolabı', 'çamaşır makinesi', 'klima', 'telefon', 'bilgisayar'],
  'Perakende / Mağaza': ['bayi', 'market', 'dükkan', 'toptan', 'distribütör', 'mağaza'],
  'Yiyecek / İçecek': ['restoran', 'kafe', 'pastane', 'fırın', 'lokanta', 'catering'],
  'Güzellik / Estetik': ['kuaför', 'berber', 'güzellik salonu', 'spa', 'tırnak'],
  'Sağlık / Klinik': ['diş', 'doktor', 'eczane', 'fizyoterapi', 'psikolog', 'hastane'],
  'Otomotiv': ['oto servis', 'galeri', 'yedek parça', 'lastik', 'oto yıkama'],
  'Üretim / İmalat': ['fabrika', 'atölye', 'makine', 'metal', 'plastik', 'ambalaj'],
  'İnşaat / Mühendislik': ['yapı', 'mimarlık', 'tadilat', 'müteahhit'],
  'Eğitim / Kurs': ['dershane', 'etüt', 'dil okulu', 'anaokulu', 'kreş'],
  'Turizm / Otel': ['pansiyon', 'seyahat acentesi', 'tur', 'otel'],
  'Temizlik / Hizmet': ['temizlik şirketi', 'güvenlik', 'bakım', 'haşere'],
  'Mobilya / Ev Dekorasyonu': ['mutfak', 'perde', 'halı', 'dekorasyon'],
  'Hukuk / Danışmanlık': ['avukat', 'hukuk bürosu', 'danışman'],
  'Muhasebe / Finans': ['mali müşavir', 'muhasebeci', 'finans'],
  'Reklam / Pazarlama': ['ajans', 'dijital pazarlama', 'sosyal medya'],
  'Tekstil Üretimi / Konfeksiyon': ['tekstil', 'konfeksiyon', 'kumaş', 'iplik', 'dokuma', 'fason', 'örme'],
  'Sigorta / Acente': ['sigorta', 'kasko', 'dask', 'acente', 'poliçe', 'emeklilik'],
  'Emlak / Gayrimenkul': ['emlak', 'gayrimenkul', 'konut', 'kiralık', 'satılık'],
  'Tarım / Hayvancılık': ['tarım', 'çiftlik', 'sera', 'hayvancılık', 'süt', 'zeytin'],
  'Spor / Fitness': ['spor salonu', 'fitness', 'pilates', 'yoga', 'antrenör'],
  'Organizasyon / Etkinlik': ['düğün', 'organizasyon', 'etkinlik', 'nişan', 'kına', 'davet'],
  'Kuyumculuk / Takı': ['kuyumcu', 'altın', 'takı', 'mücevher', 'saat'],
  'Matbaa / Baskı': ['matbaa', 'baskı', 'promosyon', 'tabela', 'afiş', 'kartvizit'],
  'Evcil Hayvan / Veteriner': ['veteriner', 'pet shop', 'kedi', 'köpek', 'mama'],
  'Fotoğraf / Prodüksiyon': ['fotoğrafçı', 'stüdyo', 'video çekimi', 'drone', 'prodüksiyon'],
}

/** <Select> bileşeninin beklediği biçim. */
export const SEKTOR_SECENEKLERI = SEKTORLER.map((s) => ({ value: s, label: s }))

/** Başında "Seçin..." bulunan hâli — zorunlu alanlar için. */
export const SEKTOR_SECENEKLERI_BOSLU = [
  { value: '', label: 'Seçin...' },
  ...SEKTOR_SECENEKLERI,
]

/**
 * Trend Video, tüm sektörlerde genel tarama yapabildiği için ek bir
 * seçenek kullanır.
 */
export const SEKTOR_SECENEKLERI_TUMU = [
  { value: 'ALL', label: '✨ Tüm Sektörler (genel tarama)' },
  ...SEKTOR_SECENEKLERI,
]
