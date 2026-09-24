import { SIRKET } from '@/lib/sirketBilgileri'

/**
 * Yalnızca YAZDIRMA ve PDF çıktısında görünen başlık.
 *
 * NEDEN: Araç adı ve tarih ekranda panelin üst çubuğunda duruyor, ama o çubuk
 * yazdırma hedefinin (.gecmis-print-target) DIŞINDA kaldığı için baskıda ve
 * PDF'te kayboluyordu — çıktıya bakan kişi hangi aracın sonucu olduğunu
 * anlayamıyordu (1 Eyl 2026 kullanıcı geri bildirimi).
 *
 * Bu bileşen hedefin İÇİNE konur; `.sadece-cikti` sınıfı ekranda gizler,
 * @media print ve PDF çekimi sırasında gösterir (bkz. index.css).
 */
export function CiktiBasligi({
  aracAdi,
  tarih,
  kisi,
}: {
  aracAdi: string
  /** Çıktının üretildiği tarih — biçimlenmiş metin. */
  tarih?: string
  /** Admin çıktılarında kimin ürettiği. Son kullanıcıda gerekmez. */
  kisi?: string
}) {
  return (
    <div className="sadece-cikti" style={{ marginBottom: 18 }}>
      <h1 style={{ fontSize: 17, fontWeight: 700, color: '#1C1B19', margin: 0, lineHeight: 1.3 }}>
        {aracAdi}
      </h1>

      <p style={{ fontSize: 11, color: '#6B6963', margin: '4px 0 0' }}>
        {[kisi, tarih].filter(Boolean).join(' · ')}
      </p>

      <p style={{ fontSize: 10, color: '#9A9792', margin: '2px 0 0' }}>
        {SIRKET.marka} · {SIRKET.alanAdi}
      </p>

      <div style={{ borderBottom: '2px solid #1D9E75', marginTop: 10 }} />
    </div>
  )
}
