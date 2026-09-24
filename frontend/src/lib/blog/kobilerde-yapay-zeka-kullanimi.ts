import type { BlogYazisi } from './tipler'

export const yazi: BlogYazisi = {
  slug: 'kobilerde-yapay-zeka-kullanimi',
  baslik: "KOBİ'lerde Yapay Zeka Kullanımı: Nereden Başlamalı?",
  ozet:
    "Küçük işletmeler yapay zekayı en çok hangi işlerde kullanıyor, ilk adım nereden atılmalı ve hangi hatalardan kaçınılmalı? Sahadan örneklerle pratik bir rehber.",
  tarih: '2026-08-27',
  etiketler: ['Yapay Zeka', 'KOBİ', 'Başlangıç'],
  bloklar: [
    {
      tur: 'p',
      metin:
        "Yapay zeka artık büyük bütçelerin ayrıcalığı değil. Ama küçük bir işletme için asıl soru \"yapay zeka kullanmalı mıyım\" değil; \"hangi işimde, nasıl kullanacağım\". Çoğu KOBİ sahibi bir sohbet aracını açıyor, birkaç soru soruyor, aldığı genel geçer cevaplardan sonra vazgeçiyor. Sorun teknolojide değil, işe uygulanma biçiminde.",
    },

    { tur: 'h2', metin: 'Küçük işletmeler yapay zekayı en çok nerede kullanıyor?' },
    {
      tur: 'p',
      metin:
        'Sahada karşılığı en hızlı görülen alanlar, tekrar eden ve yazıya dayanan işler. Bir çalışanın her hafta yeniden yaptığı, ama her seferinde sıfırdan başladığı işler:',
    },
    {
      tur: 'liste',
      maddeler: [
        'Sosyal medya içerik planı hazırlamak — her ay aynı boş takvimle karşılaşmak',
        'Müşteri sorularına standart yanıt yazmak — aynı soruya onuncu kez cevap vermek',
        'Satış mesajı ve teklif metni kurgulamak — özellikle itiraz geldiğinde ne yazacağını bilememek',
        'Reklam bütçesini kanallara dağıtmak — hangi kanala ne kadar ayıracağını tahmin etmek',
        'Rakiplerin ne yaptığını takip etmek — vakit bulunamadığı için hiç yapılmayan iş',
      ],
    },
    {
      tur: 'p',
      metin:
        'Ortak nokta şu: bunların hiçbiri yaratıcılık sorunu değil, zaman sorunu. İşletme sahibi ne yapması gerektiğini genelde biliyor; oturup yapacak vakti yok.',
    },

    { tur: 'h2', metin: 'İlk adım: bir iş seçin, araç seçmeyin' },
    {
      tur: 'p',
      metin:
        'En sık yapılan hata, önce araç seçmek. Doğrusu tersi: geçen hafta sizi en çok yoran, en çok ertelediğiniz işi seçin. Tek bir iş. Onu bitiren bir çözüm bulun, sonuç alın, sonra ikinciye geçin.',
    },
    {
      tur: 'p',
      metin:
        'Bir iş seçerken şu üç soruyu sorun: Bu işi ayda birden fazla yapıyor muyum? Çıktısı yazıya mı dayanıyor? Yapmadığımda bir maliyeti var mı? Üçüne de "evet" diyorsanız doğru işi seçmişsiniz demektir.',
    },

    { tur: 'h2', metin: 'Sohbet kutusu neden yetmiyor?' },
    {
      tur: 'p',
      metin:
        'Genel amaçlı bir sohbet aracına "bana sosyal medya takvimi hazırla" dediğinizde aldığınız şey, herkese verilebilecek bir cevaptır. Çünkü araç sizin sektörünüzü, müşteri profilinizi, bütçenizi, tonunuzu bilmiyor — siz söylemediniz.',
    },
    {
      tur: 'p',
      metin:
        'İyi sonuç almanın yolu, doğru soruları önceden sormaktan geçiyor. Sektör, hedef kitle, bütçe aralığı, öne çıkan avantajınız, sık karşılaştığınız itirazlar… Bunları her seferinde yazmak zahmetli olduğu için çoğu kişi yazmıyor ve sonuç genel çıkıyor.',
    },
    {
      tur: 'not',
      metin:
        'Pratik kural: çıktı ne kadar genel geldiyse, girdi o kadar eksik demektir. Cevabı beğenmediğinizde aracı değil, verdiğiniz bilgiyi değiştirin.',
    },

    { tur: 'h2', metin: 'Kaçınılması gereken üç hata' },
    {
      tur: 'sirali',
      maddeler: [
        'Aynı anda her şeye başlamak. Beş işi birden yapay zekaya devretmeye çalışan, hiçbirinden sonuç alamıyor. Bir işle başlayın.',
        'Çıktıyı olduğu gibi yayınlamak. Üretilen metin bir taslaktır. İşletmenizi siz tanıyorsunuz; son okumayı mutlaka yapın, rakamları doğrulayın.',
        'Hassas veriyi düşünmeden girmek. Müşteri listesi, kimlik bilgisi, sağlık verisi gibi bilgileri girerken kullandığınız hizmetin bu veriyi nasıl işlediğini bilin.',
      ],
    },

    { tur: 'h2', metin: 'Sonucu nasıl ölçersiniz?' },
    {
      tur: 'p',
      metin:
        'Ölçemediğiniz bir iyileştirme sürdürülemez. Basit tutun: işi eskiden kaç dakikada yapıyordunuz, şimdi kaç dakikada yapıyorsunuz? Ayda kaç kez yapıyorsunuz? İkisini çarpın. Aylık kazandığınız saati gördüğünüzde, o saati nereye yatıracağınıza karar vermek kolaylaşır.',
    },
    {
      tur: 'p',
      metin:
        'İkinci ölçüt kalite: içerik takvimini yapay zeka ile hazırladığınız ay, gerçekten daha düzenli paylaşım yaptınız mı? Satış scriptini kullandığınız görüşmelerde dönüşüm arttı mı? Bunlar birkaç ay sonra netleşir; sabırlı olun.',
    },

    { tur: 'h2', metin: 'Özetle' },
    {
      tur: 'liste',
      maddeler: [
        'Araçla değil, işle başlayın — sizi en çok yoran tekrar eden işi seçin',
        'Girdiyi zenginleştirin; genel bilgi genel sonuç üretir',
        'Çıktıyı taslak sayın, son kararı siz verin',
        'Tek bir işte sonuç alın, sonra genişletin',
        'Kazandığınız zamanı ölçün — sürdürmenin tek yolu bu',
      ],
    },
    {
      tur: 'aracCta',
      toolId: 'gorunurluk-skoru',
      metin:
        'Nereden başlayacağınızı bilmiyorsanız işletmenizin dijitalde ne durumda olduğunu ölçerek başlayın. İşletme Görünürlük Skoru aracı birkaç soruyla 0-100 arası puan ve öncelikli aksiyon listesi çıkarır.',
    },
  ],
}
