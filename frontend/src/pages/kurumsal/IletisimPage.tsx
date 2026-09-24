import { YasalSayfa } from '@/components/legal/YasalSayfa'
import { SIRKET } from '@/lib/sirketBilgileri'

interface KanalProps {
  ikon: string
  baslik: string
  aciklama: string
  metin: string
  href: string
}

function Kanal({ ikon, baslik, aciklama, metin, href }: KanalProps) {
  return (
    <a
      href={href}
      className="block bg-white rounded-2xl border border-[#E2E0D8] p-5 hover:border-[#9FE1CB] hover:bg-[#FCFEFD] transition-colors"
    >
      <p className="text-[22px] leading-none mb-2" aria-hidden="true">{ikon}</p>
      <p className="text-[13px] font-semibold text-[#1C1B19] mb-0.5">{baslik}</p>
      <p className="text-[12px] text-[#9A9792] mb-2">{aciklama}</p>
      <p className="text-[13px] text-[#1D9E75] font-medium">{metin}</p>
    </a>
  )
}

export function IletisimPage() {
  return (
    <YasalSayfa
      baslik="İletişim"
      ozet="Sorunuz, öneriniz ya da sorununuz için bize ulaşın. Genellikle aynı iş günü içinde dönüyoruz."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Kanal
          ikon="✉️"
          baslik="Genel sorular"
          aciklama="Ürün, paketler, kullanım"
          metin={SIRKET.eposta}
          href={`mailto:${SIRKET.eposta}`}
        />
        <Kanal
          ikon="🛟"
          baslik="Teknik destek"
          aciklama="Hata, erişim sorunu, ödeme"
          metin={SIRKET.destekEposta}
          href={`mailto:${SIRKET.destekEposta}`}
        />
        <Kanal
          ikon="📱"
          baslik="Telefon"
          aciklama="Hafta içi 09:00 – 18:00"
          metin={SIRKET.telefon}
          href={`tel:${SIRKET.telefonHref}`}
        />
        <Kanal
          ikon="🔐"
          baslik="Kişisel veriler"
          aciklama="KVKK başvuruları, veri silme"
          metin={SIRKET.kvkkEposta}
          href={`mailto:${SIRKET.kvkkEposta}`}
        />
      </div>

      <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-5 mt-5">
        <p className="text-[13px] font-semibold text-[#085041] mb-1">Ekibiniz için özel çözüm</p>
        <p className="text-[13px] text-[#3A3935] leading-relaxed mb-3">
          Çok kullanıcılı kullanım, özel araç ihtiyacı veya entegrasyon talebiniz varsa
          kurumsal talep formunu doldurun. Üyelik gerekmez.
        </p>
        <a
          href="/kurumsal-talep"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
        >
          Kurumsal Talep Formu →
        </a>
      </div>

      <div className="mt-5 bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] mb-2">
          Şirket Bilgileri
        </p>
        <p className="text-[13px] text-[#3A3935] leading-relaxed">
          <strong>{SIRKET.ticaretUnvani}</strong><br />
          {SIRKET.adres}<br />
          {SIRKET.vergiDairesi} — Vergi No: {SIRKET.vergiNo}<br />
          MERSİS No: {SIRKET.mersisNo}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-[12px] text-[#9A9792] leading-relaxed">
          Sık sorulanların yanıtları için önce{' '}
          <a href="/sss" className="text-[#1D9E75] hover:underline">SSS sayfamıza</a> göz
          atmak isteyebilirsiniz.
        </p>
      </div>
    </YasalSayfa>
  )
}
