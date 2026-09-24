import { YasalSayfa, Bolum, Maddeler } from '@/components/legal/YasalSayfa'
import { SIRKET } from '@/lib/sirketBilgileri'
import { TOOLS } from '@/lib/tools'

export function HakkimizdaPage() {
  return (
    <YasalSayfa
      baslik="Hakkımızda"
      ozet="KolayKOBİ, küçük işletmelerin pazarlama ve satış işlerini yapay zeka ile dakikalar içinde bitirmesini sağlayan bir Türk SaaS platformudur."
    >
      <Bolum baslik="Neden kurduk">
        <p>
          Bir KOBİ sahibinin gününde sosyal medya takvimi hazırlamaya, müşteri personası
          çıkarmaya ya da reklam bütçesi planlamaya ayıracak vakti yok. Ajansa vermek pahalı,
          kendi yapmak zaman alıyor, yapay zeka araçlarını sıfırdan öğrenmek ayrı bir iş.
        </p>
        <p>
          KolayKOBİ bu boşluğu kapatıyor: bir form dolduruyorsunuz, dakikalar içinde
          kullanıma hazır, yazdırılabilir bir çıktı alıyorsunuz. Prompt yazmayı öğrenmenize,
          hangi modeli seçeceğinizi bilmenize gerek yok.
        </p>
      </Bolum>

      <Bolum baslik="Ne yapıyoruz">
        <p>
          Platformda {TOOLS.length} araç var. Her biri belirli bir işi baştan sona bitiriyor:
        </p>
        <Maddeler
          maddeler={TOOLS.map((t) => (
            <>
              <strong>{t.name}</strong>
              {t.description ? ` — ${t.description}` : ''}
            </>
          ))}
        />
      </Bolum>

      <Bolum baslik="Nasıl çalışıyoruz">
        <Maddeler
          maddeler={[
            <>
              <strong>Form → çıktı.</strong> Sohbet kutusu değil, yapılandırılmış form.
              Ne soracağınızı biz biliyoruz; siz işletmenizi anlatıyorsunuz.
            </>,
            <>
              <strong>Çıktı sizde kalıyor.</strong> Her sonuç hesabınızda saklanıyor,
              istediğiniz zaman yazdırabilir veya PDF olarak kaydedebilirsiniz.
            </>,
            <>
              <strong>Sürpriz fatura yok.</strong> Paketinizin aylık kullanım hakkı bellidir,
              tükenince araç çalışmaz — arkanızdan ek ücret işlemez.
            </>,
            <>
              <strong>Türkçe düşünülmüş.</strong> Araçlar Türkçe içerik üretmek için
              tasarlandı; çeviri değil.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="Verileriniz">
        <p>
          Girdiğiniz işletme bilgileri yalnızca sizin çıktınızı üretmek için kullanılır.
          Bu verileri reklam amacıyla kullanmıyor, üçüncü taraflara satmıyoruz. Ayrıntılar için{' '}
          <a href="/kvkk" className="text-[#1D9E75] hover:underline">KVKK Aydınlatma Metni</a> ve{' '}
          <a href="/gizlilik" className="text-[#1D9E75] hover:underline">Gizlilik Politikası</a>{' '}
          sayfalarımıza bakabilirsiniz.
        </p>
      </Bolum>

      <Bolum baslik="İletişim">
        <p>
          E-posta:{' '}
          <a href={`mailto:${SIRKET.eposta}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.eposta}
          </a>
          <br />
          Telefon:{' '}
          <a href={`tel:${SIRKET.telefonHref}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.telefon}
          </a>
        </p>
        <p>
          Ekibinizin özel ihtiyaçları varsa{' '}
          <a href="/kurumsal-talep" className="text-[#1D9E75] hover:underline">
            kurumsal talep formunu
          </a>{' '}
          doldurabilirsiniz — üyelik gerekmez.
        </p>
      </Bolum>
    </YasalSayfa>
  )
}
