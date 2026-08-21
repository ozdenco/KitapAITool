export function SatisSozlesmesiPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mesafeli Satış Sözleşmesi</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: Ağustos 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Taraflar</h2>
            <p>
              Bu Mesafeli Satış Sözleşmesi ("Sözleşme"), aşağıda belirtilen taraflar arasında akdedilmiştir:
            </p>
            <p className="mt-2">
              <strong>Satıcı:</strong> KolayKOBİ (kolaykobi.com)<br />
              E-posta: destek@kolaykobi.com
            </p>
            <p className="mt-2">
              <strong>Alıcı:</strong> KolayKOBİ platformuna kayıt olan ve satın alma işlemi gerçekleştiren kullanıcı
              ("Müşteri").
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Konu ve Kapsam</h2>
            <p>
              Bu Sözleşme; Müşteri'nin KolayKOBİ platformu üzerinden satın aldığı dijital abonelik planları ve
              tekil araç kullanım paketlerine ilişkin hak ve yükümlülükleri düzenler. Platform, yapay zeka destekli
              işletme araçları sunan bir SaaS (Software as a Service) hizmetidir.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Hizmet Kapsamı</h2>
            <p>KolayKOBİ bünyesindeki abonelik planları aşağıdaki seçenekleri içermektedir:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Ücretsiz Plan:</strong> Her araç için aylık 3 kullanım hakkı</li>
              <li><strong>Standart Plan:</strong> Her araç için aylık 10 kullanım hakkı</li>
              <li><strong>Premium Plan:</strong> Her araç için aylık 25 kullanım hakkı</li>
              <li><strong>Kurumsal Plan:</strong> Özel kullanım kotası (görüşme yoluyla belirlenir)</li>
              <li><strong>Tekil Araç Paketi:</strong> Belirli bir araç için sınırlı sayıda kullanım hakkı</li>
            </ul>
            <p className="mt-2">
              Araç kullanımları aylık dönemde yenilenir. Kullanılmayan haklar bir sonraki döneme devredilmez.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Hizmet Bedeli ve Ödeme</h2>
            <p>
              Abonelik ücretleri ve tekil paket fiyatları platform üzerinde ilgili satın alma sayfasında
              Türk Lirası (TL) cinsinden belirtilmektedir. Ödemeler PayTR altyapısı üzerinden güvenli biçimde
              alınmaktadır. Kredi kartı bilgileri KolayKOBİ tarafından saklanmamakta; yalnızca ödeme altyapısı
              sağlayıcısı tarafından işlenmektedir.
            </p>
            <p className="mt-2">
              Abonelik planları aylık faturalanır. Ödeme gerçekleştiği anda hizmet aktif hale gelir.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Hizmetin İfası ve Teslimi</h2>
            <p>
              KolayKOBİ dijital bir hizmet sunmaktadır. Ödeme onayının ardından hizmet erişimi anında ve
              elektronik ortamda sağlanır; fiziksel bir teslimat söz konusu değildir. Hizmet kesintisiz
              sunulmaya çalışılmakla birlikte teknik bakım veya mücbir sebepler nedeniyle geçici
              erişim kesintileri yaşanabilir.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Cayma Hakkı</h2>
            <p>
              6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği
              kapsamında, tüketiciler dijital içerik ve hizmet sözleşmelerinde 14 (on dört) gün içinde
              cayma hakkına sahiptir.
            </p>
            <p className="mt-2">
              <strong>İstisna:</strong> Müşteri'nin satın alma işlemi sırasında açık onay vermesi ve
              hizmetin ifasına başlanması durumunda, 6502 sayılı Kanun'un 49/3. maddesi uyarınca
              cayma hakkı kullanılamaz. Ödeme tamamlandıktan ve hizmet kullanıma açıldıktan sonra
              bu durum geçerlidir.
            </p>
            <p className="mt-2">
              İptal ve iade koşullarının tamamı için lütfen{' '}
              <a href="/iptal-iade-kosullari" className="text-[#4A7C59] underline">
                İptal ve İade Koşulları
              </a>{' '}
              sayfasını inceleyiniz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Gizlilik</h2>
            <p>
              Müşteri'ye ait kişisel veriler 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)
              çerçevesinde işlenir. Veriler üçüncü kişilerle, hizmetin ifası için zorunlu olan durumlar
              dışında paylaşılmaz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Uyuşmazlıkların Çözümü</h2>
            <p>
              Bu Sözleşme'den doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve
              Tüketici Hakem Heyetleri yetkilidir. Yasal sınırlar dahilindeki uyuşmazlıklar için
              ilgili il veya ilçe Tüketici Hakem Heyeti'ne başvurulabilir.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. İletişim</h2>
            <p>
              Sözleşme'ye ilişkin sorularınız için:<br />
              E-posta: <a href="mailto:destek@kolaykobi.com" className="text-[#4A7C59]">destek@kolaykobi.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
