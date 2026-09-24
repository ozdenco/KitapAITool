import type { BlogYazisi } from './tipler'

export const yazi: BlogYazisi = {
  slug: 'whatsapp-satista-itiraz-karsilama',
  baslik: "WhatsApp'ta Satış: İtirazları Karşılamanın Yolu",
  ozet:
    '"Pahalı", "düşüneyim", "başkasıyla çalışıyorum" — en sık duyulan itirazlar ve WhatsApp\'ta bunlara nasıl cevap verilir? Kapatan değil, konuşmayı sürdüren yanıtlar.',
  tarih: '2026-08-18',
  etiketler: ['Satış', 'WhatsApp', 'İtiraz'],
  bloklar: [
    {
      tur: 'p',
      metin:
        'WhatsApp Türkiye\'de küçük işletmelerin en çok satış yaptığı kanal. Ama telefonda ya da yüz yüze işe yarayan satış tekniklerinin çoğu burada çalışmıyor: karşı taraf istediği zaman okumadan geçebiliyor, uzun mesaj açılmıyor, baskı hemen hissediliyor.',
    },
    {
      tur: 'p',
      metin:
        'İtiraz geldiğinde çoğu satıcı iki hatadan birini yapıyor: ya hemen indirim teklif ediyor ya da uzun bir savunma yazıyor. İkisi de konuşmayı bitiriyor.',
    },

    { tur: 'h2', metin: 'İtiraz reddetme değildir' },
    {
      tur: 'p',
      metin:
        'Bir müşteri "pahalı" dediğinde çoğu zaman "istemiyorum" demiyor; "bu parayı vermeye değeceğine henüz ikna olmadım" diyor. İtiraz, ilgi göstergesidir — ilgilenmeyen kişi itiraz etmez, sessiz kalır.',
    },
    {
      tur: 'not',
      metin:
        'Kural: itirazı savuşturmaya değil, altındaki asıl endişeyi anlamaya çalışın. Endişeyi çözerseniz itiraz kendiliğinden kalkar.',
    },

    { tur: 'h2', metin: 'İşe yarayan üç adımlı kalıp' },
    {
      tur: 'sirali',
      maddeler: [
        'Kabul edin. "Haklısınız, ilk bakışta yüksek görünüyor." Karşı tarafın haklılığını teslim etmek savunmayı düşürür.',
        'Çerçeveyi değiştirin. Fiyatı toplam tutar olarak değil, sağladığı karşılık olarak konuşun: aylık maliyet, kazandırdığı zaman, önlediği kayıp.',
        'Küçük bir sonraki adım önerin. Satın alma değil; 10 dakikalık görüşme, kısa bir deneme, örnek bir çalışma.',
      ],
    },

    { tur: 'h2', metin: 'Sık karşılaşılan itirazlar ve yaklaşımlar' },
    {
      tur: 'liste',
      maddeler: [
        '"Pahalı" → Karşılaştırma çerçevesini siz kurun: neye göre pahalı? Alternatifin gizli maliyetini gösterin.',
        '"Düşüneyim" → Neyi düşüneceğini sorun. Genelde tek bir belirsizlik vardır; onu bulup çözün.',
        '"Başkasıyla çalışıyorum" → Rakibi kötülemeyin. "Memnunsanız değiştirmeyin" deyip, tamamlayıcı olabileceğiniz noktayı gösterin.',
        '"Şu an ihtiyacım yok" → Zamanlamayı kabul edin, ilerisi için kapıyı açık bırakın ve ne zaman aramanızı istediğini sorun.',
        '"Ortağıma danışmalıyım" → Karar vericiye gidecek bilgiyi siz hazırlayın; müşterinizin işini kolaylaştırın.',
        '"Güvenmiyorum" → Referans, örnek çalışma veya küçük ölçekli bir başlangıç önerin. Söz değil kanıt verin.',
      ],
    },

    { tur: 'h2', metin: "WhatsApp'a özel kurallar" },
    {
      tur: 'liste',
      maddeler: [
        'Kısa yazın. Üç paragrafı geçen mesaj okunmuyor.',
        'Tek mesajda tek konu. Beş soruyu üst üste sormayın.',
        'Her mesajı bir soruyla bitirin — konuşmayı siz sürdürün.',
        'Cevap gelmezse 24-48 saat bekleyin, sonra bir kez hatırlatın. Üst üste mesaj engellenmeye götürür.',
        'Sesli mesajı ancak karşı taraf sesli mesaj atıyorsa kullanın.',
      ],
    },

    { tur: 'h2', metin: 'Hazırlıklı olmanın farkı' },
    {
      tur: 'p',
      metin:
        'İtiraz geldiği anda doğru cümleyi bulmaya çalışmak zor. Deneyimli satıcıların yaptığı şey doğaçlama değil: sık duydukları itirazların yanıtlarını önceden hazırlamışlardır, o an sadece uyarlarlar.',
    },
    {
      tur: 'p',
      metin:
        'Siz de en sık duyduğunuz beş-on itirazı yazın ve her biri için hazır bir yanıt kurgulayın. Ezberlemeyin, sadece elinizin altında olsun. Fark ilk haftada görünür.',
    },
    {
      tur: 'aracCta',
      toolId: 'whatsapp-satis',
      metin:
        'WhatsApp Satış Script Üretici, karşılaştığınız itirazları seçtiğinizde her biri için ayrı bir ikna metni ve ilk temastan kapanışa kadar beş hazır mesaj üretir.',
    },
  ],
}
