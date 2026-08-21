export function IptalIadeKosullariPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">İptal ve İade Koşulları</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: Ağustos 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Genel Bilgi</h2>
            <p>
              KolayKOBİ, yapay zeka destekli işletme araçları sunan bir dijital SaaS platformudur.
              Sunulan tüm hizmetler elektronik ortamda anında iletilmekte olup fiziksel ürün veya
              kargo süreci içermemektedir.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Dijital Hizmetlerde Cayma Hakkı</h2>
            <p>
              6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği
              uyarınca, dijital içerik ve hizmetlerde aşağıdaki şartlar geçerlidir:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                Ödeme tamamlanıp hizmet aktif hale gelmeden önce iptal talebi iletilirse, ücretin
                tamamı iade edilir.
              </li>
              <li>
                Müşteri'nin satın alma anında açık onay vermesi ve hizmetin kullanıma açılmasının
                ardından 6502 sayılı Kanun'un 49/3. maddesi uyarınca cayma hakkı kullanılamaz.
                Bu durum Avrupa Birliği Tüketici Hakları Direktifi (2011/83/EU) ile de uyumludur.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Abonelik İptali</h2>
            <p>
              Aktif aboneliğinizi dilediğiniz zaman iptal edebilirsiniz:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                İptal işlemi yapıldığında mevcut abonelik dönemi sonuna kadar hizmetten yararlanmaya
                devam edersiniz.
              </li>
              <li>
                Dönem sona erdiğinde abonelik otomatik olarak Ücretsiz Plan'a düşer; ücretli içerik
                erişimi sona erer.
              </li>
              <li>
                Kalan süre için orantılı iade yapılmamaktadır.
              </li>
            </ul>
            <p className="mt-2">
              İptal talebi için: <a href="mailto:destek@kolaykobi.com" className="text-[#4A7C59]">destek@kolaykobi.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Tekil Araç Paketleri</h2>
            <p>
              Tekil araç satın alımları (belirli kullanım hakları içeren paketler) dijital içerik
              niteliğinde olup hizmetin kullanıma açılmasının ardından iade edilemez. Kullanılmamış
              haklar başka bir araca veya döneme aktarılamaz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. İade Süreci</h2>
            <p>
              İade koşullarının geçerli olduğu durumlarda (örn. hizmet aktif edilmeden yapılan
              iptal talepleri) süreç şu şekilde işler:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>İade talebi destek@kolaykobi.com adresine e-posta ile iletilir.</li>
              <li>Talebiniz 3 iş günü içinde değerlendirilir ve tarafınıza bilgi verilir.</li>
              <li>Onaylanan iadeler, ödemenin yapıldığı kredi/banka kartına iade edilir.</li>
              <li>İade süresi, banka ve kart şirketine göre 3–14 iş günü arasında değişebilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Teknik Sorunlar</h2>
            <p>
              Hizmetin tarafımızdan kaynaklanan teknik bir aksaklık nedeniyle kullanılamaması
              durumunda, etkilenen süre için telafi (ek kullanım hakkı veya dönem uzatma) sağlanabilir.
              Bu tür durumlarda lütfen destek hattımızla iletişime geçiniz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. İletişim</h2>
            <p>
              İptal, iade veya şikâyet talepleriniz için:<br />
              E-posta:{' '}
              <a href="mailto:destek@kolaykobi.com" className="text-[#4A7C59]">
                destek@kolaykobi.com
              </a>
              <br />
              Yanıt süresi: 2 iş günü
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
