import { useNavigate } from 'react-router-dom'

export function TeslimatKosullariPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 mb-4 text-[13px] text-[#6B6963] hover:text-[#1D9E75] transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Geri Dön</button>
        <h1 className="text-[18px] font-bold text-gray-900 mb-1">Teslimat ve Hizmet Kullanım Koşulları</h1>
        <p className="text-[12px] text-gray-500 mb-5">Son güncelleme: Ağustos 2026</p>

        <div className="max-w-none text-[13px] text-gray-700 leading-relaxed space-y-4">

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">1. Hizmet Türü</h2>
            <p>
              KolayKOBİ (<strong>kolaykobi.com</strong>), yapay zeka destekli işletme araçları sunan
              tamamen dijital bir SaaS (Yazılım as a Service) platformudur. Satışa sunulan tüm
              ürünler; abonelik planları ve tekil araç erişim hakları gibi elektronik nitelikte
              dijital hizmetlerdir. Fiziksel ürün, kargo veya teslimat süreci içermez.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">2. Dijital Teslimat Süreci</h2>
            <p>
              Satın alma işleminin başarıyla tamamlanmasının ardından hizmet erişimi
              <strong> anında ve otomatik</strong> olarak aktif hale gelir:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                Ödeme onayı alındıktan sonra kullanıcı hesabına ait abonelik veya araç erişim hakkı
                sistem tarafından derhal tanımlanır.
              </li>
              <li>
                Kullanıcı, hesabına giriş yaparak satın aldığı araç veya plana aynı oturum içinde
                erişebilir; herhangi bir bekleme süresi söz konusu değildir.
              </li>
              <li>
                Kullanıcıya ayrıca kayıtlı e-posta adresine ödeme onayı ve aktif hizmet bilgisi
                içeren bir bildirim e-postası iletilir.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">3. Hizmet Kullanım Süresi</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Aylık abonelikler:</strong> Satın alma tarihinden itibaren 30 takvim günü
                boyunca geçerlidir. Süre sonunda otomatik yenileme aktif değilse erişim sona erer.
              </li>
              <li>
                <strong>Tekil araç satın alımları:</strong> Satın alma tarihinden itibaren 30 takvim
                günü boyunca ve belirlenen kullanım hakkı tükenene kadar erişilebilir.
              </li>
              <li>
                <strong>Kurumsal planlar:</strong> Sözleşmede belirtilen süre ve kullanım koşulları
                geçerlidir.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">4. Teknik Erişim Gereksinimleri</h2>
            <p>
              Platforma erişim için güncel bir web tarayıcısı (Chrome, Firefox, Safari, Edge) ve
              internet bağlantısı yeterlidir. Ek yazılım indirme veya kurulum gerekmez. Hizmet
              kesintisiz ve 7/24 erişilebilir olmayı hedefler; planlı bakımlar öncesinde kullanıcılar
              bilgilendirilir.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">5. Sorun ve Destek</h2>
            <p>
              Ödeme sonrası hizmete erişimde teknik bir sorun yaşanması halinde
              <strong> info@kolaykobi.com</strong> adresine başvurabilirsiniz. Sorunun platform
              kaynaklı olduğunun tespiti durumunda erişim süresi kaybolan gün kadar uzatılır veya
              ücret iadesi yapılır.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">6. İletişim</h2>
            <p>
              <strong>KolayKOBİ</strong><br />
              E-posta: info@kolaykobi.com<br />
              Web: kolaykobi.com
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
