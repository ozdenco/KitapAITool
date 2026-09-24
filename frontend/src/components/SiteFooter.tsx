import { SIRKET } from '@/lib/sirketBilgileri'

interface Baglanti {
  etiket: string
  href: string
}

const SIRKET_BAGLANTILARI: readonly Baglanti[] = [
  { etiket: 'Hakkımızda', href: '/hakkimizda' },
  { etiket: 'Blog', href: '/blog' },
  { etiket: 'Sıkça Sorulan Sorular', href: '/sss' },
  { etiket: 'İletişim', href: '/iletisim' },
  { etiket: 'Kurumsal Talep', href: '/kurumsal-talep' },
]

const YASAL_BAGLANTILAR: readonly Baglanti[] = [
  { etiket: 'KVKK Aydınlatma Metni', href: '/kvkk' },
  { etiket: 'Gizlilik Politikası', href: '/gizlilik' },
  { etiket: 'Açık Rıza Beyanı', href: '/acik-riza' },
  { etiket: 'Veri İşleme (DPA)', href: '/veri-isleme' },
  { etiket: 'Mesafeli Satış Sözleşmesi', href: '/satis-sozlesmesi' },
  { etiket: 'İptal ve İade Koşulları', href: '/iptal-iade-kosullari' },
  { etiket: 'Teslimat Koşulları', href: '/teslimat-kosullari' },
]

function BaglantiSutunu({ baslik, baglantilar }: { baslik: string; baglantilar: readonly Baglanti[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9792] mb-0.5">
        {baslik}
      </p>
      {baglantilar.map((b) => (
        <a
          key={b.href}
          href={b.href}
          className="text-[12px] text-[#6B6963] hover:text-[#1D9E75] transition-colors"
        >
          {b.etiket}
        </a>
      ))}
    </div>
  )
}

/**
 * Site geneli alt bilgi.
 *
 * Eskiden Layout.tsx içine gömülüydü ve yalnızca dört yasal bağlantı
 * içeriyordu. Kurumsal sayfalar (Hakkımızda, Blog, SSS, İletişim) ve
 * eksik yasal metinler eklenince ayrı bileşene taşındı.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[#E2E0D8] bg-white no-print mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Marka + iletişim */}
          <div className="flex flex-col gap-1.5">
            {/*
              Marka adı → tanıtım sitesi.

              Üst bardaki logo 29 Ağu 2026'da Dashboard'a yönlendirildi (kullanıcı
              logoya tıklayınca uygulamanın ana sayfasına dönmeyi bekliyordu).
              Bunun yan etkisi: uygulamadan kolaykobi.com'a giden hiçbir yol
              kalmamıştı. Bağlantı buraya taşındı.
            */}
            <a
              href={`https://${SIRKET.alanAdi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-[#1C1B19] hover:text-[#1D9E75] transition-colors mb-0.5 inline-flex items-center gap-1 w-fit"
            >
              {SIRKET.marka}
              <span aria-hidden="true" className="text-[10px] text-[#9A9792]">↗</span>
              <span className="sr-only">(tanıtım sitesi, yeni sekmede açılır)</span>
            </a>
            <p className="text-[12px] text-[#6B6963] leading-relaxed mb-1.5 max-w-[280px]">
              Küçük işletmeler için yapay zeka destekli pazarlama ve satış araçları.
              Form doldurun, dakikalar içinde kullanıma hazır çıktı alın.
            </p>
            <a
              href={`mailto:${SIRKET.eposta}`}
              className="text-[12px] text-[#6B6963] hover:text-[#1D9E75] transition-colors flex items-center gap-1.5"
            >
              <span aria-hidden="true">✉️</span> {SIRKET.eposta}
            </a>
            <a
              href={`tel:${SIRKET.telefonHref}`}
              className="text-[12px] text-[#6B6963] hover:text-[#1D9E75] transition-colors flex items-center gap-1.5"
            >
              <span aria-hidden="true">📱</span> {SIRKET.telefon}
            </a>
          </div>

          <BaglantiSutunu baslik="Şirket" baglantilar={SIRKET_BAGLANTILARI} />
          <BaglantiSutunu baslik="Yasal" baglantilar={YASAL_BAGLANTILAR} />
        </div>

        <div className="mt-6 pt-4 border-t border-[#F1EFE8] flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] text-[#9A9792]">
            © {new Date().getFullYear()} {SIRKET.ticaretUnvani} · {SIRKET.alanAdi}
          </span>
          <span className="text-[11px] text-[#9A9792]">
            {SIRKET.catiMarka} bünyesinde bir hizmettir · Türkiye'de geliştirildi
          </span>
        </div>
      </div>
    </footer>
  )
}
