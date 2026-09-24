import { YasalSayfa, Bolum, Maddeler } from '@/components/legal/YasalSayfa'
import { SIRKET, YASAL_SON_GUNCELLEME } from '@/lib/sirketBilgileri'

export function VeriIslemePage() {
  const unvan = SIRKET.ticaretUnvani.startsWith('[') ? SIRKET.marka : SIRKET.ticaretUnvani

  return (
    <YasalSayfa
      baslik="Veri İşleme Sözleşmesi (DPA)"
      ozet="Platforma kendi müşteri veya çalışan verilerinizi yüklediğinizde tarafların rollerini ve yükümlülüklerini düzenler."
      sonGuncelleme={YASAL_SON_GUNCELLEME}
    >
      <Bolum baslik="1. Kapsam ve taraflar">
        <p>
          Bu sözleşme, {SIRKET.marka} hizmetini kullanırken platforma <strong>kendi
          belirlediğiniz üçüncü kişilere ait kişisel verileri</strong> (müşterileriniz,
          çalışanlarınız, potansiyel müşterileriniz) girdiğiniz durumlarda uygulanır.
        </p>
        <Maddeler
          maddeler={[
            <><strong>Veri Sorumlusu:</strong> Siz (hizmeti kullanan işletme). Hangi verinin, hangi amaçla işleneceğine siz karar verirsiniz.</>,
            <><strong>Veri İşleyen:</strong> {unvan}. Verileri yalnızca sizin talimatınız doğrultusunda, hizmeti sunmak için işleriz.</>,
          ]}
        />
        <p>
          Kendi hesap bilgileriniz bakımından ise veri sorumlusu biziz; bu durum{' '}
          <a href="/kvkk" className="text-[#1D9E75] hover:underline">KVKK Aydınlatma Metni</a>{' '}
          ile düzenlenir.
        </p>
      </Bolum>

      <Bolum baslik="2. İşlemenin konusu">
        <Maddeler
          maddeler={[
            <><strong>Amaç:</strong> Talep ettiğiniz araç çıktısının üretilmesi ve saklanması.</>,
            <><strong>Süre:</strong> Hesabınız açık kaldığı sürece; siz sildiğinizde sona erer.</>,
            <><strong>Veri türleri:</strong> Formlara ve yüklediğiniz belgelere girdiğiniz her türlü veri.</>,
            <><strong>İlgili kişiler:</strong> Sizin belirlediğiniz kişiler.</>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Yükümlülüklerimiz">
        <Maddeler
          maddeler={[
            'Verileri yalnızca sizin talimatınız ve hizmetin gereği doğrultusunda işleriz.',
            'Kendi amaçlarımız için kullanmaz, yapay zeka modeli eğitmeyiz, üçüncü taraflara satmayız.',
            'Erişimi yetkilendirilmiş personelle sınırlar, gizlilik yükümlülüğü altına alırız.',
            'Uygun teknik ve idari tedbirleri alırız (aktarımda şifreleme, erişim denetimi, kayıt tutma).',
            'İlgili kişilerden size gelen talepleri yanıtlamanız için makul desteği sağlarız.',
            'İhlal tespit edersek gecikmeksizin sizi bilgilendiririz.',
            'Talebiniz üzerine verileri siler ya da size iade ederiz.',
          ]}
        />
      </Bolum>

      <Bolum baslik="4. Yükümlülükleriniz">
        <Maddeler
          maddeler={[
            'Platforma girdiğiniz kişisel veriler için geçerli bir hukuki dayanağınız (aydınlatma, gerekiyorsa açık rıza) bulunmalıdır.',
            'Zorunlu olmadıkça özel nitelikli kişisel veri (sağlık, biyometri, din, sendika üyeliği vb.) girmemelisiniz.',
            'Hesabınızın erişim bilgilerinin güvenliğinden siz sorumlusunuz.',
            'İhtiyacınızdan fazla veri yüklememelisiniz (veri minimizasyonu).',
          ]}
        />
      </Bolum>

      <Bolum baslik="5. Alt işleyenler">
        <p>
          Hizmeti sunabilmek için sınırlı sayıda alt işleyen kullanıyoruz:
        </p>
        <Maddeler
          maddeler={[
            <><strong>Yapay zeka sağlayıcısı</strong> — araç çıktısının üretilmesi.</>,
            <><strong>Sunucu barındırma sağlayıcısı</strong> — uygulamanın çalıştırılması ve verilerin saklanması.</>,
            <><strong>E-posta altyapısı</strong> — hizmet bildirimlerinin iletilmesi.</>,
            <><strong>Ödeme kuruluşu</strong> — satın alma işlemleri (kart verisi bize hiç ulaşmaz).</>,
          ]}
        />
        <p>
          Alt işleyen listesinde değişiklik yaptığımızda bu sayfayı güncelleriz. Alt işleyenleri
          bu sözleşmedekiyle eşdeğer yükümlülüklere tabi tutarız.
        </p>
      </Bolum>

      <Bolum baslik="6. Yurt dışına aktarım">
        <p>
          Kullandığımız bazı hizmet sağlayıcıların altyapısı yurt dışında bulunabilir. Bu
          durumda aktarım, KVKK'nın yurt dışına aktarıma ilişkin hükümlerine uygun olarak
          gerçekleştirilir.
        </p>
      </Bolum>

      <Bolum baslik="7. Silme ve iade">
        <p>
          Hesabınızı kapattığınızda ya da silme talebinde bulunduğunuzda, bu kapsamdaki veriler
          silinir. Mali mevzuat gereği saklanması zorunlu ödeme kayıtları istisnadır.
        </p>
      </Bolum>

      <Bolum baslik="8. İletişim">
        <p>
          Bu sözleşmeye ilişkin sorularınız için:{' '}
          <a href={`mailto:${SIRKET.kvkkEposta}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.kvkkEposta}
          </a>
        </p>
      </Bolum>
    </YasalSayfa>
  )
}
