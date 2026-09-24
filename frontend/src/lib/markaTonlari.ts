/**
 * Marka tonu seçenekleri — TEK KAYNAK.
 *
 * Hem İşletme Bilgilerim sayfası hem de İçerik Takvimi aracı bu listeyi
 * kullanır. Daha önce iki ayrı liste vardı ve değerler birbirini
 * tutmuyordu ('Profesyonel' ile 'Profesyonel ve güvenilir'); bu yüzden
 * profildeki ton araç formuna ön-doldurulamıyordu.
 */
export const MARKA_TONLARI = [
  'Profesyonel ve güvenilir',
  'Samimi ve yakın',
  'Eğitici ve bilgilendirici',
  'Enerjik ve motive edici',
  'Mizahi ve eğlenceli',
] as const

/** <Select> bileşeninin beklediği biçim. */
export const MARKA_TONU_SECENEKLERI = MARKA_TONLARI.map((t) => ({ value: t, label: t }))
