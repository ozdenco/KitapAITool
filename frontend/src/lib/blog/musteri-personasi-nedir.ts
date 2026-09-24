import type { BlogYazisi } from './tipler'

export const yazi: BlogYazisi = {
  slug: 'musteri-personasi-nedir',
  baslik: 'Müşteri Personası Nedir, Küçük İşletmeye Ne Kazandırır?',
  ozet:
    '"Herkese satıyorum" demek, kimseye satamamak demek. Müşteri personası nasıl çıkarılır, hangi sorular sorulur ve günlük işte nasıl kullanılır?',
  tarih: '2026-08-14',
  etiketler: ['Pazarlama', 'Müşteri', 'Strateji'],
  bloklar: [
    {
      tur: 'p',
      metin:
        'Bir işletme sahibine "müşteriniz kim" diye sorduğunuzda en sık aldığınız cevap "herkes" oluyor. Anlaşılır bir cevap ama pazarlama açısından en pahalı olanı: herkese seslenen mesaj kimsede karşılık bulmaz.',
    },
    {
      tur: 'p',
      metin:
        'Müşteri personası, ideal müşterinizi somut bir kişi gibi tarif etmenizi sağlar. Gerçek bir kişi değildir; gerçek müşterilerinizin ortak özelliklerinden damıtılmış bir portredir.',
    },

    { tur: 'h2', metin: 'Neye yarar?' },
    {
      tur: 'liste',
      maddeler: [
        'Hangi kanalda görünmeniz gerektiğini netleştirir — herkes her yerde olamaz',
        'Metin yazarken kime seslendiğinizi bilirsiniz; ton kendiliğinden oturur',
        'Reklam bütçesini boşa harcamayı önler',
        'Ürün kararlarını kolaylaştırır: "bu özelliği o kişi ister mi?"',
        'Ekipteki herkesin aynı müşteriyi düşünmesini sağlar',
      ],
    },

    { tur: 'h2', metin: 'Nasıl çıkarılır?' },
    {
      tur: 'p',
      metin:
        'Persona hayal ederek değil, elinizdeki veriden çıkarılır. Uydurulmuş persona yanlış yöne götürür.',
    },
    {
      tur: 'sirali',
      maddeler: [
        'En iyi müşterilerinizi listeleyin. En çok ödeyeni değil; işi kolay, memnun ayrılan, tekrar gelen müşterileri.',
        'Ortak noktalarını arayın: sektör, işletme büyüklüğü, yaş aralığı, konum, karar verme biçimi.',
        'Neden size geldiklerini yazın. Hangi sorunu çözmeye çalışıyorlardı? Hangi kelimelerle anlattılar?',
        'Sizi nasıl bulduklarını not edin — kanal seçiminiz buradan çıkar.',
        'Satın almadan önce neye takıldıklarını hatırlayın. Bu, itiraz listenizdir.',
      ],
    },

    { tur: 'h2', metin: 'Personada ne olmalı?' },
    {
      tur: 'liste',
      maddeler: [
        'Kısa bir tanım: kim, ne iş yapıyor, hangi ölçekte',
        'Asıl derdi: onu geceleri uyutmayan iş problemi',
        'Hedefi: ulaşmak istediği somut sonuç',
        'İtirazları: satın almadan önce sorduğu sorular',
        'Bilgi kaynakları: nereden okuyor, kimi takip ediyor',
        'Karar biçimi: tek başına mı karar veriyor, danışıyor mu',
      ],
    },
    {
      tur: 'not',
      metin:
        'Persona bir sayfayı geçmemeli. Uzun personalar hazırlanır, sonra bir daha açılmaz. Kısa olan kullanılır.',
    },

    { tur: 'h2', metin: 'Kaç persona gerekir?' },
    {
      tur: 'p',
      metin:
        'Küçük işletme için bir, en fazla iki. Gerçekten farklı iki müşteri grubuna satıyorsanız (örneğin hem son tüketiciye hem kurumsala) ikisini ayırın. Üç ve üzeri persona, odaklanmamanın kibar bir biçimidir.',
    },

    { tur: 'h2', metin: 'Günlük işte nasıl kullanılır?' },
    {
      tur: 'p',
      metin:
        'Persona bir rapor değil, bir filtredir. İçerik yazarken, reklam kurgularken, yeni bir hizmet düşünürken tek soru sorun: "Bu, personamın işine yarar mı?" Cevap net değilse o iş beklemelidir.',
    },
    {
      tur: 'p',
      metin:
        'Yılda bir kez personanızı gözden geçirin. Müşteri kitleniz değişir; persona değişmezse yanlış yöne pusula tutmuş olursunuz.',
    },
    {
      tur: 'aracCta',
      toolId: 'musteri-persona',
      metin:
        'Müşteri Persona Oluşturucu, işletmenizi birkaç soruyla tanıyıp ideal müşteri profilinizi, itirazlarını ve iletişim stratejinizi tek çıktıda hazırlar.',
    },
  ],
}
