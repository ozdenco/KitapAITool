import { useNavigate } from 'react-router-dom'

export function KvkkPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 mb-4 text-[13px] text-[#6B6963] hover:text-[#1D9E75] transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Geri Dön</button>
        <h1 className="text-[18px] font-bold text-gray-900 mb-1">
          Kişisel Verilerin Korunması ve Gizlilik Politikası
        </h1>
        <p className="text-[12px] text-gray-500 mb-5">Son güncelleme: Ağustos 2026</p>

        <div className="max-w-none text-[13px] text-gray-700 leading-relaxed space-y-4">

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">1. Veri Sorumlusu</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu
              sıfatıyla hareket eden KolayKOBİ (kolaykobi.com), kullanıcılarına ait kişisel verileri
              aşağıda açıklanan amaçlar ve hukuki sebepler çerçevesinde işlemektedir.
            </p>
            <p className="mt-2">
              İletişim: <a href="mailto:destek@kolaykobi.com" className="text-[#4A7C59]">destek@kolaykobi.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">2. İşlenen Kişisel Veriler</h2>
            <p>Platforma kayıt ve kullanım sürecinde aşağıdaki veriler işlenmektedir:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Kimlik verileri:</strong> Ad, soyad</li>
              <li><strong>İletişim verileri:</strong> E-posta adresi</li>
              <li><strong>İşlem verileri:</strong> Araç kullanım geçmişi, abonelik durumu, ödeme geçmişi</li>
              <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü, oturum bilgileri</li>
              <li><strong>Ödeme verileri:</strong> Ödeme işlemleri PayTR altyapısı üzerinden gerçekleştirilmekte olup kart bilgileri KolayKOBİ tarafından saklanmamaktadır.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">3. Kişisel Verilerin İşlenme Amaçları</h2>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Üyelik ve kimlik doğrulama işlemlerinin yürütülmesi</li>
              <li>Abonelik ve ödeme süreçlerinin yönetilmesi</li>
              <li>Araç kullanım kotalarının takip edilmesi</li>
              <li>Teknik destek ve müşteri hizmetlerinin sağlanması</li>
              <li>Hizmet kalitesinin geliştirilmesi ve platform analizleri</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Bilgilendirme ve pazarlama e-postalarının iletilmesi (açık rıza ile)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">4. Hukuki Sebepler</h2>
            <p>Kişisel veriler aşağıdaki hukuki dayanaklar çerçevesinde işlenmektedir:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Sözleşmenin kurulması ve ifası (KVKK Md. 5/2-c)</li>
              <li>Veri sorumlusunun meşru menfaati (KVKK Md. 5/2-f)</li>
              <li>Yasal yükümlülük (KVKK Md. 5/2-ç)</li>
              <li>Açık rıza — yalnızca pazarlama iletişimi için (KVKK Md. 5/1)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">5. Kişisel Verilerin Aktarımı</h2>
            <p>
              Kişisel verileriniz; hizmetin ifası için zorunlu olan ve aşağıda belirtilen üçüncü taraflarla,
              KVKK'nın 8. ve 9. maddeleri kapsamında paylaşılmaktadır:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>PayTR:</strong> Ödeme işlemlerinin gerçekleştirilmesi amacıyla</li>
              <li><strong>Brevo (Sendinblue):</strong> Transactional e-posta iletimi için</li>
              <li><strong>Apify:</strong> Trend video analizi aracının çalıştırılması için (yalnızca ilgili araç kullanıldığında)</li>
              <li><strong>Altyapı sağlayıcıları:</strong> Sunucu barındırma (Hostinger)</li>
            </ul>
            <p className="mt-2">
              Yurt dışına veri aktarımı yalnızca KVKK'nın 9. maddesi kapsamında yeterli korumayı
              sağlayan ülkelere veya açık rıza alınması suretiyle gerçekleştirilmektedir.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">6. Saklama Süreleri</h2>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Hesap ve işlem verileri: Hesap aktif olduğu süre + 3 yıl</li>
              <li>Ödeme ve fatura kayıtları: 10 yıl (Vergi Usul Kanunu gereği)</li>
              <li>Teknik log kayıtları: 2 yıl (5651 sayılı Kanun gereği)</li>
              <li>Pazarlama onayı geri alındıktan sonra: Derhal silinir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">7. Çerezler (Cookies)</h2>
            <p>
              KolayKOBİ, oturum yönetimi ve platform güvenliği için zorunlu çerezler kullanmaktadır.
              Analitik veya pazarlama amaçlı çerezler yalnızca açık onay ile devreye girer.
              Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz; zorunlu çerezlerin devre dışı
              bırakılması platformun çalışmasını etkileyebilir.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">8. İlgili Kişi Hakları</h2>
            <p>KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmiş ise buna ilişkin bilgi talep etme</li>
              <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>
              <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silinmesini veya yok edilmesini isteme</li>
              <li>Düzeltme/silme işlemlerinin üçüncü kişilere bildirilmesini isteme</li>
              <li>Otomatik sistemler aracılığıyla analiz edilmesi nedeniyle aleyhinize oluşan sonuca itiraz etme</li>
              <li>Kanuna aykırı işleme nedeniyle zararınızın giderilmesini talep etme</li>
            </ul>
            <p className="mt-2">
              Talepler için:{' '}
              <a href="mailto:destek@kolaykobi.com" className="text-[#4A7C59]">
                destek@kolaykobi.com
              </a>
              {' '}adresine yazılı olarak başvurabilirsiniz. Talepler 30 gün içinde sonuçlandırılır.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">9. Güvenlik</h2>
            <p>
              Kişisel verileriniz; HTTPS şifreleme, erişim kısıtlamaları ve güvenli sunucu
              altyapısı aracılığıyla korunmaktadır. Veri ihlali durumunda KVKK'nın 12. maddesi
              uyarınca Kişisel Verileri Koruma Kurulu'na ve ilgili kişilere bildirim yapılır.
            </p>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-gray-900 mb-1.5">10. Değişiklikler</h2>
            <p>
              Bu politika zaman zaman güncellenebilir. Önemli değişikliklerde kayıtlı
              e-posta adresinize bildirim yapılır. Güncel versiyona her zaman bu sayfadan
              ulaşabilirsiniz.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
