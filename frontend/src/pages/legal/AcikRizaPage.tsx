import { YasalSayfa, Bolum, Maddeler } from '@/components/legal/YasalSayfa'
import { SIRKET, YASAL_SON_GUNCELLEME } from '@/lib/sirketBilgileri'

export function AcikRizaPage() {
  return (
    <YasalSayfa
      baslik="Açık Rıza Beyanı"
      ozet="Yalnızca rızanıza bağlı işlemler için verdiğiniz onay. Hizmetin çalışması için zorunlu işlemler bu kapsamda değildir."
      sonGuncelleme={YASAL_SON_GUNCELLEME}
    >
      <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-xl p-4">
        <p className="text-[13px] text-[#085041]">
          <strong>Önemli:</strong> Hizmeti kullanabilmeniz için zorunlu olan veri işlemeleri
          (hesap oluşturma, araçların çalıştırılması, ödeme, yasal saklama) sözleşmenin ifası ve
          hukuki yükümlülük dayanaklarına göre yapılır; bunlar için açık rıza aranmaz. Bu beyan
          <strong> yalnızca aşağıdaki isteğe bağlı işlemleri</strong> kapsar. Rıza vermemeniz
          hizmete erişiminizi engellemez.
        </p>
      </div>

      <Bolum baslik="1. Rızanız kapsamındaki işlemler">
        <Maddeler
          maddeler={[
            <>
              <strong>Tanıtım ve bilgilendirme iletileri:</strong> yeni araçlar, kampanyalar ve
              ürün duyuruları hakkında e-posta gönderilmesi.
            </>,
            <>
              <strong>Ürün deneyimi ölçümü:</strong> hangi araçların nasıl kullanıldığına dair
              davranış verilerinin hizmeti geliştirmek amacıyla analiz edilmesi.
            </>,
            <>
              <strong>Kullanım örneği paylaşımı:</strong> ürettiğiniz çıktıların — kimliğinizi
              belirtmeden ve işletme adınızı gizleyerek — örnek olarak kullanılması.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="2. Rıza vermezseniz ne olur">
        <p>
          Hiçbir şey değişmez: hesabınızı açar, tüm araçları kullanır, çıktılarınızı alırsınız.
          Yalnızca yukarıdaki isteğe bağlı işlemler yapılmaz. Tanıtım iletisi almazsınız.
        </p>
      </Bolum>

      <Bolum baslik="3. Rızanızı geri alma">
        <p>
          Verdiğiniz rızayı istediğiniz zaman, gerekçe göstermeden geri alabilirsiniz:
        </p>
        <Maddeler
          maddeler={[
            'Hesabım → Profil Bilgileri sayfasındaki tercihleri değiştirerek',
            'Aldığınız her tanıtım e-postasının altındaki listeden çıkma bağlantısıyla',
            <>
              <a href={`mailto:${SIRKET.kvkkEposta}`} className="text-[#1D9E75] hover:underline">
                {SIRKET.kvkkEposta}
              </a>{' '}
              adresine yazarak
            </>,
          ]}
        />
        <p>
          Rızanızı geri aldığınızda ilgili işleme derhâl son verilir. Geri alma, o ana kadar
          hukuka uygun biçimde yapılmış işlemleri geçersiz kılmaz.
        </p>
      </Bolum>

      <Bolum baslik="4. Aktarım">
        <p>
          Bu kapsamdaki veriler yalnızca e-posta gönderim altyapımız ve kullanım ölçüm
          hizmetimizle, yalnızca bu amaçlarla paylaşılır. Reklam amacıyla üçüncü taraflara
          satılmaz.
        </p>
      </Bolum>

      <Bolum baslik="5. Beyan">
        <p>
          Yukarıdaki açıklamaları okuduğumu; belirtilen isteğe bağlı işlemler bakımından kişisel
          verilerimin işlenmesine ve belirtilen amaçlarla aktarılmasına{' '}
          <strong>özgür irademle, bilgilendirilmiş olarak ve açıkça rıza gösterdiğimi</strong>{' '}
          kabul ederim.
        </p>
      </Bolum>

      <Bolum baslik="6. İletişim">
        <p>
          Veri sorumlusu:{' '}
          {SIRKET.ticaretUnvani.startsWith('[') ? SIRKET.marka : SIRKET.ticaretUnvani}
          <br />
          <a href={`mailto:${SIRKET.kvkkEposta}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.kvkkEposta}
          </a>
        </p>
      </Bolum>
    </YasalSayfa>
  )
}
