import { useState } from 'react'
import { YasalSayfa } from '@/components/legal/YasalSayfa'
import { SIRKET } from '@/lib/sirketBilgileri'

interface SoruCevap {
  soru: string
  cevap: string
}

interface SssGrubu {
  baslik: string
  ikon: string
  sorular: SoruCevap[]
}

const SSS: readonly SssGrubu[] = [
  {
    baslik: 'Başlangıç',
    ikon: '🚀',
    sorular: [
      {
        soru: 'KolayKOBİ tam olarak ne yapıyor?',
        cevap:
          'Küçük işletmelerin pazarlama ve satış işlerini yapay zeka ile hazırlıyor. Bir form dolduruyorsunuz — işletmenizi, sektörünüzü, hedefinizi anlatıyorsunuz — dakikalar içinde kullanıma hazır bir çıktı alıyorsunuz: içerik takvimi, müşteri personası, WhatsApp satış scripti, reklam bütçe planı gibi.',
      },
      {
        soru: 'Yapay zeka bilmem gerekiyor mu?',
        cevap:
          'Hayır. Prompt yazmayı bilmenize, model seçmenize gerek yok. Formda ne soracağımızı biz belirledik; siz sadece işletmenizi anlatıyorsunuz.',
      },
      {
        soru: 'Ücretsiz deneyebilir miyim?',
        cevap:
          'Evet. Kayıt olduğunuzda her araç için ayda 3 kullanım hakkınız oluyor, kredi kartı istemiyoruz. Beğenirseniz paket alırsınız.',
      },
      {
        soru: 'Bir çıktı almak ne kadar sürüyor?',
        cevap:
          'Araca göre değişiyor, tipik olarak 15-45 saniye. En hızlısı chatbot senaryosu (~14 sn), en uzunu müşteri persona (~41 sn). Sayfayı kapatmadan beklemeniz yeterli.',
      },
    ],
  },
  {
    baslik: 'Paketler ve Ödeme',
    ikon: '💳',
    sorular: [
      {
        soru: 'Paketler arasındaki fark ne?',
        cevap:
          'Fark aylık kullanım hakkında. Ücretsiz planda araç başına 3 kullanım, Standart pakette tüm araçlarda toplam 10, Premium\'da 25 kullanım hakkınız var. Kurumsal planda kullandıkça ödersiniz.',
      },
      {
        soru: 'Tek bir aracı satın alabilir miyim?',
        cevap:
          'Evet. Paket almadan yalnızca ihtiyacınız olan aracı, istediğiniz adette satın alabilirsiniz. Tekil araç alımınız paket hakkınızın üzerine eklenir — ikisi toplanır.',
      },
      {
        soru: 'Aylık hakkım biterse ne olur?',
        cevap:
          'Araç çalışmaz ve size bunu açıkça söyler. Arkanızdan ek ücret işlemez. Dilerseniz paketinizi yükseltir, dilerseniz o araçtan tekil kullanım satın alırsınız.',
      },
      {
        soru: 'Kullanmadığım haklar bir sonraki aya devreder mi?',
        cevap:
          'Paket hakları devretmez, her ay yenilenir. Tekil olarak satın aldığınız araç kullanımları ise siz kullanana kadar durur.',
      },
      {
        soru: 'İptal edebilir miyim, param iade edilir mi?',
        cevap:
          'Aboneliğinizi istediğiniz zaman iptal edebilirsiniz; dönem sonuna kadar kullanmaya devam edersiniz. İade koşulları için İptal ve İade Koşulları sayfamıza bakın.',
      },
      {
        soru: 'Ödeme güvenli mi?',
        cevap:
          'Ödemeler iyzico altyapısı üzerinden alınır. Kart bilgileriniz bize hiç ulaşmaz, sistemimizde saklanmaz.',
      },
    ],
  },
  {
    baslik: 'Araçlar',
    ikon: '🛠️',
    sorular: [
      {
        soru: 'Çıktıyı beğenmezsem ne olur?',
        cevap:
          'Formu düzenleyip yeniden çalıştırabilirsiniz — daha ayrıntılı bilgi verdiğinizde sonuç belirgin şekilde iyileşir. Ancak her çalıştırma bir kullanım hakkı harcar.',
      },
      {
        soru: 'Çıktılarımı sonradan bulabilir miyim?',
        cevap:
          'Evet. Tüm sonuçlar hesabınızdaki "Geçmiş Çıktılarım" sayfasında saklanır. İstediğiniz zaman açıp yazdırabilir veya PDF olarak kaydedebilirsiniz.',
      },
      {
        soru: 'Çıktıyı PDF olarak nasıl alırım?',
        cevap:
          'Sonucun altındaki "PDF Kaydet" butonuna basın. Açılan pencerede Hedef bölümünden "PDF olarak kaydet" seçeneğini işaretleyip kaydedin. Yazıcıdan çıktı almak isterseniz "Yazdır" butonunu kullanın.',
      },
      {
        soru: 'Chatbot\'u kendi siteme koyabilir miyim?',
        cevap:
          'Evet. Chatbot Senaryo Hazırlayıcı ile senaryonuzu oluşturduktan sonra size bir kod parçası veriyoruz. Bunu sitenize eklediğinizde chatbot çalışmaya başlar. Ziyaretçi sorularının sayısı sınırsızdır, soru başına ek ücret alınmaz.',
      },
      {
        soru: 'Doküman yükleyebiliyor muyum?',
        cevap:
          'Chatbot Senaryo Hazırlayıcı\'da evet — PDF veya metin dosyası yükleyerek soru-cevap listesinin şirket bilgilerinizden üretilmesini sağlayabilirsiniz.',
      },
    ],
  },
  {
    baslik: 'Güvenlik ve Veriler',
    ikon: '🔒',
    sorular: [
      {
        soru: 'Girdiğim bilgiler nerede saklanıyor?',
        cevap:
          'Hesap bilgileriniz ve ürettiğiniz çıktılar kendi sunucularımızdaki veritabanında saklanır. Araç çalıştırdığınızda formdaki metin, çıktıyı üretmek üzere yapay zeka sağlayıcımıza iletilir.',
      },
      {
        soru: 'Verilerim yapay zeka modelini eğitmek için kullanılıyor mu?',
        cevap:
          'Hayır. Girdikleriniz yalnızca sizin çıktınızı üretmek için işlenir; model eğitimi amacıyla kullanılmaz ve reklam amacıyla üçüncü taraflara satılmaz.',
      },
      {
        soru: 'Hesabımı ve verilerimi silebilir miyim?',
        cevap:
          `Evet. ${SIRKET.kvkkEposta} adresine yazmanız yeterli. Talebiniz en geç 30 gün içinde sonuçlandırılır. Mali mevzuat gereği saklanması zorunlu ödeme kayıtları bu kapsamın dışındadır.`,
      },
    ],
  },
]

function SoruSatiri({ sc }: { sc: SoruCevap }) {
  const [acik, setAcik] = useState(false)
  return (
    <div className="border-b border-[#E2E0D8] last:border-0">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        className="w-full flex items-start justify-between gap-3 text-left py-3 group"
      >
        <span className="text-[13px] font-medium text-[#1C1B19] group-hover:text-[#085041] transition-colors">
          {sc.soru}
        </span>
        <span className={`text-[#9A9792] shrink-0 mt-0.5 transition-transform ${acik ? 'rotate-45' : ''}`} aria-hidden="true">
          +
        </span>
      </button>
      {acik && <p className="text-[13px] text-[#6B6963] leading-relaxed pb-3 pr-6">{sc.cevap}</p>}
    </div>
  )
}

export function SssPage() {
  return (
    <YasalSayfa
      baslik="Sıkça Sorulan Sorular"
      ozet="Paketler, araçlar, çıktılar ve veri güvenliği hakkında en çok sorulanlar."
    >
      <div className="flex flex-col gap-5">
        {SSS.map((grup) => (
          <div key={grup.baslik} className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E2E0D8] bg-[#F7F6F2]">
              <h2 className="text-[13px] font-semibold text-[#1C1B19]">
                {grup.ikon} {grup.baslik}
              </h2>
            </div>
            <div className="px-5">
              {grup.sorular.map((sc) => (
                <SoruSatiri key={sc.soru} sc={sc} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-5 mt-5">
        <p className="text-[13px] text-[#085041] font-medium mb-1">Aradığınızı bulamadınız mı?</p>
        <p className="text-[13px] text-[#3A3935]">
          <a href={`mailto:${SIRKET.eposta}`} className="text-[#1D9E75] hover:underline font-medium">
            {SIRKET.eposta}
          </a>{' '}
          adresine yazın, yanıtlayalım. Ekibiniz için özel bir çözüm arıyorsanız{' '}
          <a href="/kurumsal-talep" className="text-[#1D9E75] hover:underline font-medium">
            kurumsal talep formunu
          </a>{' '}
          doldurun.
        </p>
      </div>
    </YasalSayfa>
  )
}
