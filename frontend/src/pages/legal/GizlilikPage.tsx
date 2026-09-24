import { YasalSayfa, Bolum, Maddeler } from '@/components/legal/YasalSayfa'
import { SIRKET, YASAL_SON_GUNCELLEME } from '@/lib/sirketBilgileri'

export function GizlilikPage() {
  return (
    <YasalSayfa
      baslik="Gizlilik Politikası"
      ozet="Hangi verileri topladığımızı, neden topladığımızı ve kimlerle paylaştığımızı açıklar."
      sonGuncelleme={YASAL_SON_GUNCELLEME}
    >
      <p>
        Bu politika {SIRKET.marka} ({SIRKET.alanAdi}) hizmetini kullandığınızda verilerinizin nasıl
        işlendiğini anlatır. Kişisel verilerinizin KVKK kapsamındaki hukuki dayanakları ve
        haklarınız için{' '}
        <a href="/kvkk" className="text-[#1D9E75] hover:underline">KVKK Aydınlatma Metni</a>{' '}
        sayfasını da okuyun.
      </p>

      <Bolum baslik="1. Topladığımız veriler">
        <Maddeler
          maddeler={[
            <><strong>Hesap verileri:</strong> ad soyad, e-posta adresi, şifrenizin geri döndürülemez özeti (hash).</>,
            <><strong>Araç girdileri:</strong> araçları çalıştırırken formlara yazdığınız işletme bilgileri.</>,
            <><strong>Araç çıktıları:</strong> sizin için üretilen sonuçlar — hesabınızda saklanır.</>,
            <><strong>Ödeme verileri:</strong> işlem tutarı, tarih ve durum. <strong>Kart bilgileriniz bize hiç ulaşmaz</strong>, ödeme sağlayıcısında kalır.</>,
            <><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü, oturum ve kullanım kayıtları.</>,
          ]}
        />
      </Bolum>

      <Bolum baslik="2. Verileri niçin kullanıyoruz">
        <Maddeler
          maddeler={[
            'Hesabınızı oluşturmak ve oturumunuzu güvenli tutmak',
            'Araçları çalıştırıp size çıktı üretmek',
            'Aylık kullanım hakkınızı ve aboneliğinizi takip etmek',
            'Ödeme ve faturalandırma işlemlerini yürütmek',
            'Hizmet bildirimleri göndermek (doğrulama, şifre sıfırlama, satın alma bilgisi)',
            'Hatayı ayıklamak, kötüye kullanımı engellemek ve hizmeti iyileştirmek',
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Yapay zeka sağlayıcılarıyla paylaşım">
        <p>
          Bir aracı çalıştırdığınızda formda yazdığınız metin, çıktıyı üretmek üzere yapay zeka
          hizmet sağlayıcımıza iletilir. Bu aktarım hizmetin verilebilmesi için zorunludur.
        </p>
        <p>
          Girdileriniz <strong>yapay zeka modellerinin eğitiminde kullanılmaz</strong>. Bu verileri
          reklam amacıyla üçüncü taraflara satmıyoruz.
        </p>
      </Bolum>

      <Bolum baslik="4. Diğer paylaşımlar">
        <Maddeler
          maddeler={[
            <><strong>Ödeme kuruluşu:</strong> satın alma işlemini gerçekleştirmek için.</>,
            <><strong>E-posta altyapısı:</strong> hizmet bildirimlerini iletmek için.</>,
            <><strong>Barındırma sağlayıcısı:</strong> uygulamanın çalıştığı sunucular.</>,
            <><strong>Yasal merciler:</strong> yalnızca mevzuatın zorunlu kıldığı hâllerde.</>,
          ]}
        />
        <p>Bunların dışında verileriniz üçüncü taraflarla paylaşılmaz.</p>
      </Bolum>

      <Bolum baslik="5. Çerezler">
        <p>
          Oturumunuzu açık tutmak için zorunlu çerezler kullanıyoruz; bunlar olmadan giriş
          yapılamaz. Ayrıca hizmeti iyileştirmek amacıyla kullanım ölçümü yapıyoruz. Reklam
          amaçlı takip çerezi kullanmıyoruz.
        </p>
      </Bolum>

      <Bolum baslik="6. Saklama süreleri">
        <Maddeler
          maddeler={[
            'Hesap verileri: hesabınız açık kaldığı sürece',
            'Araç girdileri ve çıktıları: siz silene ya da hesabınızı kapatana kadar',
            'Ödeme ve fatura kayıtları: 10 yıl (Vergi Usul Kanunu gereği)',
            'Teknik kayıtlar: en fazla 12 ay',
          ]}
        />
      </Bolum>

      <Bolum baslik="7. Güvenlik">
        <Maddeler
          maddeler={[
            'Tüm trafik HTTPS ile şifrelenir',
            'Şifreler geri döndürülemez biçimde saklanır, düz metin olarak tutulmaz',
            'Veritabanına erişim yetkilendirilmiş kişilerle sınırlıdır',
            'Ödeme bilgileri sistemimizde hiç bulunmaz',
          ]}
        />
      </Bolum>

      <Bolum baslik="8. Haklarınız">
        <p>
          Verilerinize erişme, düzeltme, silme ve işlemeye itiraz etme haklarınız vardır.
          Bu haklarınızı kullanmak için{' '}
          <a href={`mailto:${SIRKET.kvkkEposta}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.kvkkEposta}
          </a>{' '}
          adresine yazabilirsiniz. Talepler en geç 30 gün içinde sonuçlandırılır.
        </p>
      </Bolum>

      <Bolum baslik="9. Değişiklikler">
        <p>
          Bu politikada değişiklik yaptığımızda güncel sürümü bu sayfada yayımlarız; esaslı
          değişikliklerde e-posta ile bilgilendirme yaparız.
        </p>
      </Bolum>

      <Bolum baslik="10. İletişim">
        <p>
          {SIRKET.marka} —{' '}
          <a href={`mailto:${SIRKET.eposta}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.eposta}
          </a>
          <br />
          Veri sorumlusu:{' '}
          {SIRKET.ticaretUnvani.startsWith('[') ? SIRKET.marka : SIRKET.ticaretUnvani}
        </p>
      </Bolum>
    </YasalSayfa>
  )
}
