
# Kolay KOBİ AI Araçları — İş Gereksinimleri Dokümanı (BRD)

**Doküman Referansları:**
- Bu dosya: `kobikolayUygulamalar.md` (BR-XX numaraları)
- Teknik Tasarım: `kolay_kobi_gelistirme_rehberi_v3.md` (TD-XX numaraları)
- Kurulum & Mimari: `KURULUM.md`

**Versiyon:** v3.1 | **Tarih:** 2026-08-07 | **Yazar:** Ozden Isikgil

---

## İçindekiler

1. Proje Amacı ve Hedef Kitle (BR-01)
2. BR-02: İşletme Görünürlük Skoru
3. BR-03: Müşteri Persona Oluşturucu
4. BR-04: 30 Günlük İçerik Takvimi
5. BR-05: WhatsApp Satış Script Üretici
6. BR-06: Reklam Bütçe Dağıtıcı
7. BR-07: Müşteri Geri Dönüş Senaryosu
8. BR-08: Rakip Analiz Panosu
9. BR-09: Chatbot Senaryo Hazırlayıcı
10. BR-10: AI Görünürlük Takipçisi
11. BR-11: Viral Video Uyarlayıcı
12. BR-12: Trend Video Bulucu
13. BR-13: Standart UX ve Kullanıcı Deneyimi Gereksinimleri
14. Kullanıcı Yolculuğu (Tüm Araçlar)

---

## BR-01: Proje Amacı ve Hedef Kitle

### Amaç

Kolay KOBİ AI Araçları, küçük ve orta ölçekli işletme (KOBİ) sahiplerine yapay zeka destekli self-servis pazarlama araçları sunar. Hedef: KOBİ'ler pahalı danışmanlık hizmetleri almadan, birkaç dakika içinde, kendi işletmelerine özel AI çıktısı alabilmeli.

### Hedef Kullanıcı Profili

- **Kim:** Türkiye'deki KOBİ sahipleri ve yöneticileri
- **Teknik seviye:** Düşük–orta (sıradan web kullanıcısı; kod bilgisi gerekmez)
- **Cihaz:** Masaüstü ve mobil tarayıcı
- **Dil:** Türkçe (tüm arayüz ve çıktılar Türkçe)

### Tasarım İlkeleri (→ TD-01)

- Her araç **self-contained** bir HTML sayfası — harici bağımlılık yok
- Formu doldur → butona bas → AI çıktısını gör
- Ayda 3 ücretsiz kullanım hakkı (aylık kullanım çubuğu gösterilir)
- Tüm form verileri `localStorage` ile cihazda saklanır (gizlilik)
- Yazdır / PDF al desteği (WordPress header/footer gizlenir)

---

## Araç Öncelik ve Teknoloji Sınıflandırması

Eski planlama döneminden gelen öncelik sırası (gerçekleşen geliştirme sırasına göre güncellenmiştir):

| # | Araç | Öncelik | API |
|---|---|---|---|
| 1 | İşletme Görünürlük Skoru | **YÜKSEK** | MiniMax-M3 + n8n |
| 2 | Müşteri Persona Oluşturucu | ORTA | MiniMax-M3 + n8n |
| 3 | 30 Günlük İçerik Takvimi | **YÜKSEK** | MiniMax-M3 + n8n (async) |
| 4 | WhatsApp Satış Script Üretici | **YÜKSEK** | MiniMax-M3 + n8n |
| 5 | Reklam Bütçe Dağıtıcı | ORTA | MiniMax-M3 + n8n |
| 6 | Müşteri Geri Dönüş Senaryosu | ORTA | MiniMax-M3 + n8n |
| 7 | Rakip Analiz Panosu | ORTA | MiniMax-M3 + Gemini Flash + n8n |
| 8 | Chatbot Senaryo Hazırlayıcı | ORTA | MiniMax-M3 + n8n |
| 9 | AI Görünürlük Takipçisi | ORTA | MiniMax-M3 + n8n |
| 10 | Viral Video Uyarlayıcı | ORTA | MiniMax-M3 + n8n |
| 11 | Trend Video Bulucu | **DÜŞÜKˣ** | MiniMax-M3 + Apify + n8n |

> **ˣ Trend Video Bulucu:** Apify API maliyeti (~20 TL/çalıştırma) nedeniyle kullanım sıklığı diğerlerinden belirgin biçimde düşük tutulmalıdır.

---

## BR-02: İşletme Görünürlük Skoru

**Teknik tasarım referansı:** TD-01, TD-02, TD-04, TD-12

### Amaç

KOBİ sahibinin işletmesinin Google ve sosyal medyada ne kadar görünür olduğunu yapay zeka ile analiz eder. Zayıf yönleri tespit eder ve aksiyon önerileri sunar.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | Analiz edilecek işletmenin adı |
| Sektör | Text / Select | ✅ | Hangi sektörde faaliyet gösterildiği |
| Web Sitesi | Text | ❌ | İşletmenin web sitesi URL'si |
| Google My Business | Radio (Var/Yok) | ✅ | GMB profili var mı? |
| Sosyal Medya | Checkbox (multiple) | ✅ | Instagram, Facebook, TikTok, LinkedIn, Twitter/X |
| Aylık Reklam Bütçesi | Select | ✅ | 0 TL / 500–2000 TL / 2000–5000 TL / 5000+ TL |
| İşletmenin Güçlü Yönleri | Textarea | ❌ | Neden müşteriler tercih ediyor? |

### Çıktı

AI, aşağıdaki JSON yapısını döndürür:

```json
{
  "genel_skor": 72,
  "skor_aciklamasi": "İşletmeniz dijitalde orta düzeyde görünürlüğe sahip...",
  "guclu_yonler": ["Google My Business profili mevcut", "Instagram aktif kullanılıyor"],
  "zayif_yonler": ["Web sitesi yok", "Google'da yorum sayısı düşük"],
  "aksiyon_onerileri": [
    { "oncelik": "Yüksek", "eylem": "Google My Business'a en az 10 müşteri yorumu isteyin" },
    { "oncelik": "Orta", "eylem": "Instagram'da haftada 3 gönderi paylaşın" }
  ],
  "rakip_karsilastirma": "Sektörünüzdeki ortalama skor 65; siz 72 ile üstündesiniz"
}
```

### Yorumlama ve Aksiyon Kılavuzu

| Skor | Durum | Önerilen Aksiyon |
|---|---|---|
| 0–40 | Kritik | Önce Google My Business profili oluştur; web sitesi al |
| 41–60 | Geliştirilmeli | İçerik takvimi oluştur; yorumları artır |
| 61–80 | Orta İyi | Reklam bütçesi planla; sosyal medyayı düzenli kullan |
| 81–100 | Güçlü | Rakip analizi yap; yeni platformlara genişle |

---

## BR-03: Müşteri Persona Oluşturucu

**Teknik tasarım referansı:** TD-01, TD-02, TD-04, TD-05

### Amaç

KOBİ sahibinin ideal müşteri profilini (persona) AI ile oluşturur. Hangi kanallarda, hangi mesajlarla, hangi saatlerde iletişim kurulacağını belirler.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Ürün / Hizmet | Textarea | ✅ | Ne satıyorsunuz? |
| Mevcut Müşteri Yaş Aralığı | Radio | ✅ | 18–25 / 26–35 / 36–50 / 50+ |
| Müşteri Cinsiyeti | Radio | ✅ | Çoğunlukla Kadın / Çoğunlukla Erkek / Karma |
| Coğrafya | Radio | ✅ | Şehir içi / İlçe / Online (tüm Türkiye) |
| Gelir Seviyesi | Radio | ✅ | Düşük / Orta / Yüksek |
| Müşterilerin Temel Sorunu | Textarea | ✅ | Müşteri ne ihtiyaçla geliyor? |
| Rakipler | Textarea | ❌ | Müşterilerin alternatif gördüğü işletmeler |

### Çıktı

```json
{
  "persona_adi": "Başarılı Ayşe",
  "yas": "32",
  "meslek": "Çalışan anne",
  "hedefler": ["Zamandan tasarruf etmek", "Kaliteli ürün almak"],
  "kaygi_noktalari": ["Fiyat/kalite oranı", "Teslimat güvenilirliği"],
  "tercih_ettigi_kanallar": ["Instagram", "WhatsApp"],
  "satin_alma_motivasyonlari": ["Yorumlar ve referanslar", "Kolay ödeme"],
  "mesaj_tonu": "Sıcak, güveni vurgulayan, zaman kazandıran",
  "en_aktif_saatler": "18:00–22:00",
  "icerik_onerileri": [
    "Müşteri yorumu videoları",
    "Hızlı teslimat vurgusu",
    "İndirim kodları ile DM kampanyası"
  ]
}
```

### Yorumlama ve Aksiyon Kılavuzu

- **Tercih edilen kanallar:** Hangi platformda reklam/içerik yapılacağını belirler
- **En aktif saatler:** Gönderi ve reklam zamanlaması için kullanılır
- **Mesaj tonu:** Tüm pazarlama materyallerinde kullanılacak ses tonu
- **İçerik önerileri:** WhatsApp Script Üretici ve İçerik Takvimi araçlarına girdi olarak kullanılabilir

---

## BR-04: 30 Günlük İçerik Takvimi

**Teknik tasarım referansı:** TD-01, TD-02, TD-04, TD-05 — Özel Mimari: KURULUM.md Bölüm 9

### Amaç

Seçilen sosyal medya platformları için 30 günlük hazır içerik takvimi oluşturur. Her gün için ne yayınlanacağı, hangi formatta ve hangi hashtag'lerle paylaşılacağı belirlenir.

### Özellik Notu

Bu araç **asenkron** çalışır — AI üretimi 2–8 dakika sürebileceğinden, araç bir job başlatır ve kullanıcı polling ile sonucu bekler. Diğer araçlardan farklıdır.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Sektör | Text | ✅ | |
| Hedef Kitle | Textarea | ✅ | Kim için içerik üretilecek? |
| Platform | Checkbox (multiple) | ✅ | Instagram, Facebook, TikTok, LinkedIn, Twitter/X |
| İçerik Tonu | Radio | ✅ | Profesyonel / Samimi / Eğlenceli / Eğitici |
| Haftada Kaç Gün | Radio | ✅ | 2 / 3 / 5 / 7 gün |
| Öne Çıkarmak İstediğiniz Konular | Textarea | ❌ | Kampanyalar, ürünler, değerler |
| Rakip veya Referans Hesap | Text | ❌ | Beğenilen sosyal medya hesapları |

### Çıktı (Örnek — tek gün)

```json
{
  "takvim": [
    {
      "gun": 1,
      "tarih_aciklama": "Pazartesi — Hafta açılışı",
      "platform": "Instagram",
      "format": "Carousel (5 slayt)",
      "konu": "5 adımda [ürün/hizmet] nasıl seçilir?",
      "icerik_ozeti": "Her slayta bir ipucu; son slayta CTA",
      "caption": "✅ [Ürün adı] seçerken nelere dikkat ediyorsunuz?...",
      "hashtagler": ["#kolaykobi", "#[sektör]", "#[şehir]"],
      "en_iyi_paylasim_saati": "19:00"
    }
  ]
}
```

### Yorumlama ve Aksiyon Kılavuzu

- Her gün çıktısı doğrudan sosyal medya gönderisi olarak kullanılabilir
- Caption'ları kopyalayıp yapıştırın; hashtagleri platforma göre düzenleyin
- "Format" sütunu içerik türünü belirler (Reels, Carousel, Story, vs.)
- Takvim çıktısı "Yazdır / PDF Al" ile A4 PDF'e alınabilir

---

## BR-05: WhatsApp Satış Script Üretici

**Teknik tasarım referansı:** TD-01, TD-02, TD-04

### Amaç

KOBİ sahipleri için müşteriye gönderilecek WhatsApp mesajı metinleri üretir. Farklı senaryolar için (ilk temas, takip, itiraz karşılama, kapanış) hazır script'ler sunar.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Ürün / Hizmet | Textarea | ✅ | |
| Fiyat Aralığı | Text | ❌ | Ürün/hizmet fiyatı |
| Hedef Müşteri | Textarea | ✅ | Kime gönderilecek? |
| Senaryo Türü | Radio | ✅ | İlk temas / Takip / İtiraz karşılama / Kapanış teklifi |
| Tone of Voice | Radio | ✅ | Resmi / Samimi / Aciliyet vurgulu |
| Özel Teklif/İndirim | Textarea | ❌ | Varsa kampanya bilgisi |

### Çıktı

```json
{
  "scriptler": [
    {
      "senaryo": "İlk Temas",
      "mesaj": "Merhaba [İsim], ben [İşletme] ailesinden [Adınız]. [Ürün/Hizmet] konusunda size özel bir teklifimiz var...",
      "not": "Mesajı göndermeden önce müşteri adını ve kendi adınızı doldurun"
    },
    {
      "senaryo": "İtiraz Karşılama — Fiyat",
      "mesaj": "Haklısınız, [ürün] için yatırım yapmak önemli bir karar. Şunu söyleyebilirim ki...",
      "not": "Müşteri fiyatı pahalı bulduğunda kullanın"
    }
  ],
  "genel_ipuclari": [
    "WhatsApp'ta 160 karakteri geçmeyin — kısa mesajlar daha fazla okunur",
    "Emoji kullanımı samimiyeti artırır ama fazlası profesyonelliği düşürür"
  ]
}
```

### Yorumlama ve Aksiyon Kılavuzu

- Script'leri kopyalayıp WhatsApp'tan gönderin; köşeli parantez içindeki alanları doldurun
- İtiraz karşılama script'lerini müşteri segmentine göre kişiselleştirin
- Kapanış script'lerini aciliyet vurgulayan kampanyalarla birleştirin

---

## BR-06: Reklam Bütçe Dağıtıcı

**Teknik tasarım referansı:** TD-01, TD-02, TD-04

### Amaç

Aylık reklam bütçesini hangi platformlara ne oranda dağıtması gerektiğini, sektör ve hedef kitleye göre AI ile hesaplar.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| Aylık Reklam Bütçesi (TL) | Number | ✅ | Toplam bütçe |
| Sektör | Text | ✅ | |
| Hedef Kitle Yaş Aralığı | Radio | ✅ | 18–25 / 26–35 / 36–50 / 50+ |
| Hedef Kitle Cinsiyeti | Radio | ✅ | Kadın / Erkek / Karma |
| Reklam Amacı | Radio | ✅ | Marka bilinirliği / Satış / Web sitesi trafiği / Lead toplama |
| Kullandığınız Platformlar | Checkbox | ✅ | Google / Meta / TikTok / Instagram / YouTube |
| Coğrafya | Radio | ✅ | Tek şehir / Bölgesel / Tüm Türkiye |
| Önceki Dönem En İyi Platform | Text | ❌ | Varsa geçmiş deneyim |

### Çıktı

```json
{
  "toplam_butce": 5000,
  "dagilim": [
    { "platform": "Meta Ads (FB+IG)", "yuzde": 45, "tutar": 2250, "gerekce": "Hedef kitle 26–35 kadın için Meta en verimli kanal" },
    { "platform": "Google Ads", "yuzde": 35, "tutar": 1750, "gerekce": "Arama reklamları yüksek satın alma niyeti yakalar" },
    { "platform": "TikTok Ads", "yuzde": 20, "tutar": 1000, "gerekce": "Gen-Z ve genç yetişkin için marka bilinirliği" }
  ],
  "kampanya_onerileri": [
    "Meta'da önce Awareness kampanyası, 2 haftada bir Conversion'a dönüştür",
    "Google'da marka adı + ürün anahtar kelimelerini hedefle"
  ],
  "performans_metrikleri": {
    "beklenen_erişim": "45.000–60.000 kişi/ay",
    "tahmini_cpm": "12–18 TL (Meta), 8–14 TL (Google Display)"
  }
}
```

### Yorumlama ve Aksiyon Kılavuzu

- Dağılımı başlangıç noktası olarak alın; 1 ay sonra gerçek performans verisiyle optimize edin
- Düşük bütçelerde (< 1000 TL) tek platforma odaklanmak daha verimlidir
- Google Ads için minimum 500 TL/ay önerilir (altı yeterli veri üretmez)

---

## BR-07: Müşteri Geri Dönüş Senaryosu

**Teknik tasarım referansı:** TD-01, TD-02, TD-04

### Amaç

Kayıp müşterileri geri kazanmak için iletişim senaryo ve mesajları üretir. Müşterinin neden ayrıldığını analiz ederek kişiselleştirilmiş geri dönüş stratejisi oluşturur.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Ürün / Hizmet | Text | ✅ | |
| Müşteri Ne Zamandır Yok? | Radio | ✅ | 1–3 ay / 3–6 ay / 6+ ay |
| Müşterinin Tahmini Ayrılma Nedeni | Radio | ✅ | Fiyat / Ürün memnuniyetsizliği / Rakip / Unuttu |
| Kanal Tercihi | Radio | ✅ | WhatsApp / E-posta / Telefon |
| Özel Teklif Yapabilir misiniz? | Radio | ✅ | Evet / Hayır |
| Özel Teklif Detayı | Textarea | ❌ | İndirim, bedava kargo, hediye, vs. |

### Çıktı

```json
{
  "strateji": "3 adımlı geri kazanma kampanyası",
  "adimlar": [
    {
      "adim": 1,
      "kanal": "WhatsApp",
      "zamanlama": "Hemen",
      "mesaj": "Merhaba [İsim], sizi özledik! Son ziyaretinizden bu yana yeniliklerimiz oldu...",
      "not": "Kişi adını kullanın, satış baskısı yapmayın"
    },
    {
      "adim": 2,
      "kanal": "WhatsApp",
      "zamanlama": "3 gün sonra (cevap gelmezse)",
      "mesaj": "Sadece sizin için %15 indirim kodu oluşturduk: GERI15",
      "not": "Kodun geçerlilik süresini belirtin (7 gün önerilir)"
    }
  ],
  "basari_ipuclari": [
    "Kişiselleştirme geri kazanma oranını %40 artırır",
    "İki mesajdan sonra cevap yoksa 3. mesaj göndermek spam algısı yaratır"
  ]
}
```

### Yorumlama ve Aksiyon Kılavuzu

- Adımları sırayla uygulayın; her adımda cevap gelmeden bir sonrakine geçmeyin
- "Unuttu" sebebi için özel teklif yerine içerik paylaşımı daha etkilidir
- Başarılı geri dönüşten sonra müşteriyi "sadakat programı"na dahil edin

---

## BR-08: Rakip Analiz Panosu

**Teknik tasarım referansı:** TD-01, TD-02, TD-03 — Özel: Gemini Flash + Google Search Grounding

### Amaç

Girilen rakiplerin sosyal medya ve dijital platformlardaki varlığını analiz eder; güçlü ve zayıf yönlerini karşılaştırmalı tablo halinde gösterir. Gemini Flash ile gerçek zamanlı web araması yapılır.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletmenizin Adı | Text | ✅ | Kendi işletmeniz |
| Sektör | Text | ✅ | |
| Rakip 1 | Text | ✅ | Birinci rakip adı |
| Rakip 2 | Text | ❌ | İkinci rakip |
| Rakip 3 | Text | ❌ | Üçüncü rakip |
| Analiz Odağı | Checkbox | ✅ | Sosyal medya / Web sitesi / Fiyatlama / Müşteri yorumları |
| Konum / Pazar | Text | ❌ | Hangi şehir veya bölge? |

### Çıktı — Karşılaştırma Tablosu

```json
{
  "karsilastirma_tablosu": [
    {
      "rakip": "Rakip A",
      "instagram": true,
      "facebook": true,
      "tiktok": false,
      "web_sitesi": true,
      "google_yorumu": "4.2 yıldız / 150 yorum",
      "guclu_yonler": ["Güçlü Instagram içeriği", "Hızlı teslimat"],
      "zayif_yonler": ["TikTok yok", "Web sitesi mobil uyumlu değil"]
    }
  ],
  "firsatlar": [
    "TikTok'ta rakipleriniz yok — erken girenin avantajı",
    "Google yorumlarınız rakiplerden %30 daha fazla"
  ],
  "tehditler": [
    "Rakip A Instagram'da haftada 5 gönderi paylaşıyor; siz 1–2"
  ],
  "tavsiye": "TikTok'a girin; Instagram gönderi sıklığını artırın"
}
```

### Karşılaştırma Tablosu Gösterim Notu

Çıktı HTML'de karşılaştırma tablosu olarak gösterilir. Platform sütun başlıkları `table-layout: fixed` ve `word-break: break-word` ile sarılır; tablo tüm ekrana sığar.

### Yorumlama ve Aksiyon Kılavuzu

- "Fırsatlar" bölümü hemen uygulanabilir boşlukları gösterir
- "Tehditler" bölümü savunma stratejisi gerektirir
- Her 2–3 ayda bir rakip analizi tekrarlanmalıdır

---

## BR-09: Chatbot Senaryo Hazırlayıcı

**Teknik tasarım referansı:** TD-01, TD-02, TD-04

### Amaç

İşletmenin web sitesi veya WhatsApp için kullanılabilecek chatbot konuşma senaryoları ve sık sorulan soru–cevap çiftleri üretir.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Ürün / Hizmet | Textarea | ✅ | |
| Chatbot Nerede Kullanılacak | Radio | ✅ | Web sitesi / WhatsApp Business / Her ikisi |
| Müşterilerin Sıkça Sorduğu Sorular | Textarea | ✅ | En az 3–5 soru |
| Chatbot Tonu | Radio | ✅ | Resmi / Samimi / Yardımsever/Nötr |
| Karşılama Mesajı İsteniyor mu? | Radio | ✅ | Evet / Hayır |
| Çalışma Saatleri | Text | ❌ | Müşteri dışarıdan yazarken gösterilecek |

### Çıktı

```json
{
  "hosgeldin_mesaji": "Merhaba! 👋 Ben [İşletme] asistanıyım. Size nasıl yardımcı olabilirim?",
  "sss_cevaplari": [
    {
      "soru": "Teslimat ne zaman yapılıyor?",
      "cevap": "Siparişleriniz 1–3 iş günü içinde kargoya verilir. Kargo takip linkinizi SMS ile paylaşırız."
    },
    {
      "soru": "İade / değişim yapılıyor mu?",
      "cevap": "Evet! 14 gün içinde koşulsuz iade hakkınız bulunmaktadır. [İletişim linki]"
    }
  ],
  "senaryo_akisi": [
    "Kullanıcı yazar → Karşılama mesajı",
    "Kullanıcı soru sorar → SSS eşleştirmesi",
    "Eşleşme yoksa → 'Bir temsilcimize bağlayalım' + iletişim bilgisi"
  ],
  "calisma_disi_mesaj": "Şu an çevrimiçi değiliz. Mesajınızı alıp en kısa sürede döneceğiz 🕐",
  "iyilestirme_onerileri": [
    "Kullanıcı 3 kez yanlış soru sorarsa canlı destek seçeneği sun",
    "Ödeme/fiyat soruları için her zaman WhatsApp'a yönlendir"
  ]
}
```

### Ek Özellikler (Chatbot'a Özgü)

| Özellik | Açıklama |
|---|---|
| **Canlı Test** | Araç içinde mini chat penceresi — kullanıcı üretilen senaryoyu gerçek bir chatbot gibi test edebilir; mesaj yazar, AI'ın vereceği yanıtı simüle eder |
| **n8n Workflow JSON Export** | "n8n Workflow Olarak İndir" butonu — senaryo akışını n8n'e doğrudan import edilebilir JSON formatında indirir |
| **"Benim İçin Kur" CTA** | Teknik kuruluma ihtiyaç duyan kullanıcılar için danışmanlık hizmeti lead kapısı — n8n entegrasyonu gerektiren müşterileri yönlendirir |

> **Not:** WhatsApp Business API için Meta Business onayı gereklidir. Bu süreç araç tarafından yönetilmez; kullanıcıya uyarı gösterilmelidir.

### Yorumlama ve Aksiyon Kılavuzu

- SSS cevaplarını chatbot platformuna (Tidio, ManyChat, WhatsApp Business) yapıştırın
- Senaryo akışını görselleştirerek ekibinizle paylaşın
- Canlı test modunda gerçek müşteri sorularını deneyin — cevap yoksa SSS listesini genişletin
- n8n workflow JSON'unu indirip import ederek chatbotu doğrudan aktif hale getirebilirsiniz
- Her 6 ayda bir müşteri sorularına göre güncelleyin

---

## BR-10: AI Görünürlük Takipçisi

**Teknik tasarım referansı:** TD-01, TD-02, TD-04

### Amaç

İşletmenin ChatGPT, Google Gemini, Microsoft Copilot gibi AI platformlarında ne kadar tanındığını ölçer. "AI'da görünürlük" kavramı (AIO — AI Optimization) için somut önerilere dönüştürür.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Sektör | Text | ✅ | |
| Web Sitesi | Text | ❌ | |
| En Önemli Ürün/Hizmet | Textarea | ✅ | |
| Hedef Şehir/Bölge | Text | ✅ | |
| AI Platformlarda Arandığında Çıkıyor mu? | Radio | ✅ | Evet / Hayır / Bilmiyorum |
| Mevcut SEO Çalışması Var mı? | Radio | ✅ | Evet / Hayır |

### Çıktı

```json
{
  "ai_gorunurluk_skoru": 35,
  "analiz": "İşletmeniz AI platformlarında düşük görünürlüğe sahip. Yapılandırılmış veri ve içerik stratejisi ile bu skor 60+'a çıkarılabilir.",
  "platform_durumu": {
    "chatgpt": "Muhtemelen bilmiyor — verisi yoksa bahsetmez",
    "google_gemini": "Google My Business bağlantısı varsa kısmen bilinir",
    "microsoft_copilot": "Wikipedia ve Wikidata'da yer alıyorsa daha iyi bilinir"
  },
  "aksiyon_plani": [
    {
      "oncelik": 1,
      "eylem": "Web sitesine Schema.org LocalBusiness JSON-LD ekle",
      "etki": "Google AI Overview'da görünme şansını artırır"
    },
    {
      "oncelik": 2,
      "eylem": "Google My Business profilini tam doldurun — her bölüm eksiksiz olmalı",
      "etki": "Gemini ve Google AI araştırmaları bu veriyi kullanır"
    },
    {
      "oncelik": 3,
      "eylem": "Blog veya makale içerikleri üretin — E-E-A-T odaklı",
      "etki": "ChatGPT eğitim verisi ve Bing/Copilot için önemli"
    }
  ]
}
```

### Yorumlama ve Aksiyon Kılavuzu

- Skor 0–40: AI platformlarında hiç bilinmiyor — içerik ve teknik SEO önce gelir
- Skor 41–70: Kısmen biliniyor — yapılandırılmış veri ekle, içeriği artır
- Skor 71–100: İyi görünürlük — AIO (AI Optimization) stratejisi uygula

---

## BR-11: Viral Video Uyarlayıcı

**Teknik tasarım referansı:** TD-01, TD-02, TD-04

### Amaç

Kullanıcının girdiği viral bir video konseptini veya URL'ini, kendi işletmesine uyarlar. "Bu video neden viral oldu?" analizini yaparak işletmeye özel benzer içerik formatı önerir.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| İşletme Adı | Text | ✅ | |
| Sektör | Text | ✅ | |
| Ürün / Hizmet | Textarea | ✅ | |
| Viral Video Linki veya Açıklaması | Textarea | ✅ | URL veya videonun içeriğini açıklayın |
| Hedef Platform | Radio | ✅ | TikTok / Instagram Reels / YouTube Shorts |
| Video Süresi | Radio | ✅ | 15 sn / 30 sn / 60 sn / 90 sn |
| Hedef Kitle | Textarea | ✅ | |

### Çıktı

```json
{
  "viral_analiz": {
    "neden_viral": ["Merak uyandıran açılış", "Beklenmedik sonuç", "Müzik seçimi"],
    "format": "Problem-çözüm formatı — 3 bölüm"
  },
  "uyarlama_senaryosu": {
    "hook": "Bunu bilmeden [ürün] satın aldıysanız...",
    "orta_bolum": "[İşletme]'nin 3 farkını göster — yan yana karşılaştırma",
    "cta": "Hemen dene — linki bio'da!"
  },
  "cekiim_talimatlari": [
    "İlk 1–2 saniye en güçlü anı göster",
    "Telefon dikey çekim (9:16)",
    "Altyazı ekle — %85 ses kapalı izlenir"
  ],
  "hashtag_onerileri": ["#[sektör]türkiye", "#kolaykobi", "#[şehir]"],
  "paylasim_zamani": "Salı veya Perşembe 19:00–21:00 arası"
}
```

### Yorumlama ve Aksiyon Kılavuzu

- Hook cümlesini olduğu gibi kullanın — test etmeden değiştirmeyin
- 3 farklı hook versiyonu çekin; en çok görüntülenenle devam edin
- Hashtag'leri platforma göre optimize edin (TikTok 5–8 tag, Instagram 20–30)

---

## BR-12: Trend Video Bulucu

**Teknik tasarım referansı:** TD-01, TD-02 — Özel: Apify API (TikTok/Instagram scraping)

### Amaç

Sosyal medyada şu anda yükselen **video formatlarını** tarar; bu formatların arkasındaki kurgu yapısını (format mining) çıkarır ve kullanıcının sektörüne uyarlanabilir senaryo taslakları üretir.

> **Temel ayrım:** Bu araç yalnızca "viral videolar" değil, **tekrar kullanılabilir video formatlarını** bulur. Çok izlenmiş bir video ≠ müşteri için doğru video. Asıl hedef: *çok izlenmiş + tekrar edilebilir + markaya uyarlanabilir + şu anda yükselen format.*

### Kavram Sözlüğü

| Terim | Tanım |
|---|---|
| **Trend Format** | İnsanların aynı video fikri/kurgu yapısını kendi versiyonlarıyla tekrar ürettiği içerik biçimi |
| **Viral Format** | Kanıtlanmış, yüksek performanslı ve sektörler arası uyarlanabilir format |
| **Format Replication** | Başarılı bir video formatının yapısını alıp ürünü, mesajı ve hedef kitleyi değiştirerek kendi markana uygulamak |
| **Format Mining** | Sosyal medyada başarılı olmuş videoları tarayıp tekrar tekrar kullanılabilecek içerik yapılarını çıkarmak |
| **Template** | Hazır kurgu; ses, geçiş ve animasyonları hazır; sadece görüntü değiştirilen (CapCut vb.) |
| **Trending Audio** | Viral olan ses/müzik — format ile aynı şey değildir |
| **Challenge** | İnsanların aynı hareketi/fikri gerçekleştirdiği katılım odaklı trend |

### Özellik Notu

Bu araç Apify API kullandığından **çalıştırma başına ~20 TL maliyet** oluşturur. Bu nedenle kullanım sınırı diğer araçlardan daha dikkatli yönetilmelidir.

### Form Alanları

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| Sektör | Text | ✅ | Hangi sektörde trend aranacak? (örn. Emlak, Restoran, Güzellik) |
| Platform | Radio | ✅ | TikTok / Instagram Reels / Her İkisi |
| Konum | Radio | ✅ | Türkiye / Global |
| Kullanım Amacı | Radio | ✅ | Marka bilinirliği / Ürün tanıtımı / Müşteri kazanma |
| Dönem | Radio | ✅ | Bu hafta / Bu ay |

### Çıktı — Format Mining Yapısı

Her çıktı "video" değil, **"format"** odaklı olmalıdır:

```json
{
  "trend_formatlar": [
    {
      "sira": 1,
      "format_adi": "POV Format",
      "format_aciklamasi": "Kameraya doğrudan bakış + üstte yazı + beklenmedik durum",
      "ornek_hook": "POV: Müşteri 'sadece bakmaya geldim' dedi ve...",
      "kurgu_yapisi": "3 sahne: Durum kur (2 sn) → Gerilim/sürpriz (4 sn) → Sonuç/CTA (2 sn)",
      "sure": "8–12 saniye",
      "platform": "TikTok + Reels",
      "trend_skoru": 94,
      "uyarlanabilirlik_skoru": 95,
      "bu_formati_kullanan_sektorler": ["Emlak", "Otomotiv", "Restoran", "Güzellik", "Hukuk"],
      "sektore_ozel_uyarlama": "POV: Müşteri 'bütçem 5 milyon' dedi ama istediği evi görünce...",
      "uretim_zorlugu": "Düşük — telefon kamera yeterli, ekip gerekmez",
      "marka_guvenligi": "Yüksek"
    },
    {
      "sira": 2,
      "format_adi": "Expectation vs Reality",
      "format_aciklamasi": "Beklenti → Gerçek karşılaştırması; genellikle komik veya şaşırtıcı",
      "ornek_hook": "İnsanların [sektör] hakkında düşündüğü vs gerçekte olan...",
      "kurgu_yapisi": "2 bölüm: Beklenti sahnesi (3 sn) → 'vs' geçiş → Gerçek sahnesi (5 sn)",
      "sure": "10–15 saniye",
      "platform": "TikTok + Reels",
      "trend_skoru": 88,
      "uyarlanabilirlik_skoru": 98,
      "bu_formati_kullanan_sektorler": ["Restoran", "Seyahat", "Fitness", "Emlak", "Moda"],
      "sektore_ozel_uyarlama": "İnsanların hayal ettiği [şehir]'de deniz manzaralı ev vs gerçekte [şehir]'de bulabildiğimiz ev",
      "uretim_zorlugu": "Düşük — iki farklı sahne yeterli",
      "marka_guvenligi": "Yüksek"
    },
    {
      "sira": 3,
      "format_adi": "Nobody Knows I...",
      "format_aciklamasi": "Sır/içeriden bilgi formatı; merak ve güven inşa eder",
      "ornek_hook": "Kimsenin bilmediği şey: [sektör] hakkında...",
      "kurgu_yapisi": "Hook (2 sn) → 3 madde birer birer açılıyor (6 sn) → CTA (2 sn)",
      "sure": "10–12 saniye",
      "platform": "TikTok + Reels",
      "trend_skoru": 82,
      "uyarlanabilirlik_skoru": 90,
      "bu_formati_kullanan_sektorler": ["Hukuk", "Finans", "Sağlık", "Emlak", "Sigorta"],
      "sektore_ozel_uyarlama": "Kimsenin söylemediği 3 şey: Ev satın almadan önce mutlaka bilin",
      "uretim_zorlugu": "Çok Düşük — yüz + ses + yazı overlay yeterli",
      "marka_guvenligi": "Yüksek"
    }
  ],
  "format_tipleri_ozeti": {
    "en_uyarlanabilir": "Expectation vs Reality — sektörden bağımsız çalışır",
    "en_dusuk_uretim": "Nobody Knows I — kamera + ses yeterli",
    "en_yuksek_trend_ivmesi": "POV Format"
  },
  "sektor_notu": "Sektörünüzde bu hafta öne çıkan format tipi: Storytelling / Mini drama"
}
```

### Format Puanlama Kriterleri

Her format aşağıdaki kriterlere göre 100 üzerinden puanlanır:

| Kriter | Ağırlık | Açıklama |
|---|---|---|
| Trend ivmesi | 25 | Son 7 günde kaç yeni kullanım var? |
| Sektörler arası uyarlanabilirlik | 20 | Kaç farklı sektör kullanıyor? |
| İzlenme potansiyeli | 20 | Ortalama görüntülenme performansı |
| İlk 3 saniye hook gücü | 15 | Kullanıcıyı durduruyor mu? |
| Üretim kolaylığı | 10 | Ekipsiz, az bütçeyle yapılabilir mi? |
| Marka güvenliği | 10 | Kurumsal markalar güvenle kullanabilir mi? |

### Format Tipleri Referansı

| Format Tipi | Örnek Hook | En İyi Sektörler |
|---|---|---|
| **POV** | "POV: Müşteri 'sadece bakmaya geldim' dedi..." | Tüm sektörler |
| **Expectation vs Reality** | "İnsanların hayal ettiği... vs gerçekte..." | Restoran, Emlak, Seyahat |
| **Nobody Knows I...** | "Kimsenin söylemediği 3 şey..." | Hukuk, Finans, Sağlık |
| **Micro-drama** | Bölüm 1 / 2 / 3 serisi | Emlak, Moda, Lifestyle |
| **3 şey / 5 şey** | "X almadan önce bilmeniz gereken 5 şey" | Eğitim, Hizmet, B2B |
| **Text overlay** | Kişi yok; sadece sahne + üstte yazı | Ürün odaklı tüm sektörler |
| **Mini skeç** | Müşteri–satıcı diyalogu kurgusu | Perakende, Otomotiv, Hizmet |

### Yorumlama ve Aksiyon Kılavuzu

- **Format ≠ Video:** Aynı videoyu kopyalamayın; formatın kurgu mantığını alın, içeriği kendinize uyarlayın
- **Trend ivmesi > İzlenme sayısı:** 500K izlenmiş ama şu an yükselen format, 10M izlenmiş ama düşen formattan daha değerlidir
- **Trend verisi 24–48 saat içinde değişebilir** — bugün bulduğunuzu bugün üretin
- **Viral Uyarlayıcı (BR-11) ile birlikte kullanın:** Format bulun → Uyarlayın → Çekin
- **Maliyet nedeniyle bu aracı haftada 1 kez kullanın** (~20 TL/çalıştırma)
- **Ajans kullanımı için:** Aynı formatı farklı müşteri sektörlerine ayrı ayrı uyarlayın — bir format 5–10 müşteri için içerik üretebilir

---

## BR-13: Standart UX ve Kullanıcı Deneyimi Gereksinimleri

**Teknik tasarım referansı:** TD-04 ile TD-12 arası tüm bölümler

Tüm 11 araçta uygulanması zorunlu standart özellikler:

### Aylık Kullanım Limiti (→ TD-04)

- Her araç ayda **3 ücretsiz kullanım** sunar
- Kullanım sayacı tarayıcıdaki `localStorage` ile saklanır (ay bazında sıfırlanır)
- Rate bar (yeşil dolum çubuğu) header'da gösterilir: "X/3 kullanım"
- Limit dolduğunda: "Aylık kullanım limitinize ulaştınız. [Sonraki ay] ayında tekrar deneyin."

### Form Kalıcılığı (→ TD-05)

- Form değerleri otomatik olarak `localStorage`'a kaydedilir
- Sayfa yenilemesinde geri yüklenir — kullanıcı veri kaybetmez
- Radio button'lar `radio_` prefix ile kaydedilir

### Form Kaydet / Yükle (→ TD-06)

- **💾 Formu Kaydet:** Form verilerini `.json` dosyası olarak indirir
- **📂 Form Yükle:** Kaydedilmiş `.json` dosyasını yükleyip formu doldurur
- **🗑 Formu Boşalt:** Formu ve localStorage'ı temizler

### AI Üretimi Sırasında Form Gizleme (→ TD-08)

- "Analizi Başlat" tıklandığında form ekrandan kaldırılır
- Sadece spinner (dönen yükleme simgesi) ve durum mesajı gösterilir
- AI tamamlanınca form geri gelir

### Sayfa Terk Uyarısı (→ TD-09)

- AI üretimi devam ederken kullanıcı sayfayı kapatmaya/yenilemeye çalışırsa tarayıcı uyarır
- Özel mesaj gösterilemez (tarayıcı kısıtlaması); tarayıcının kendi mesajı görünür

### Form Daralt / Genişlet (→ TD-07)

- Sonuçlar yüklendikten sonra form daraltılır (`is-collapsed` class)
- Daraltılmış durumda küçük bir bar ve "▼ Formu Aç" butonu görünür
- Kullanıcı "Yeniden Oluştur" yapmak isterse formu açar, değiştirir, tekrar gönderir

### Dışa Aktarma (→ TD-10)

- **🖨 Yazdır / PDF Al:** `window.print()` ile tarayıcı PDF özelliği kullanılır
- WordPress header/footer print'te gizlenir
- **TXT İndir butonu yoktur** — kaldırıldı

### CTA Kutusu (→ TD-11)

- Her araçta sonuçların altında "Ücretsiz Görüşme Ayarla" butonu bulunur
- Link: `https://kolaykobi.com/iletisim`
- Metin tamamen statik — AI çıktısından dinamik metin veya telefon numarası kullanılamaz

---

## Kullanıcı Yolculuğu (Tüm Araçlar)

```
1. Kullanıcı sayfaya gelir
   └─ Rate bar gösterilir (X/3 kullanım)
   └─ Varsa önceki form verisi geri yüklenir

2. Kullanıcı formu doldurur
   └─ Her değişiklik otomatik localStorage'a kaydedilir

3. "Analizi Başlat" butonuna tıklar
   └─ Limit kontrol edilir (3 kullanım aşıldıysa uyarı ver)
   └─ Form ekrandan kaldırılır (sadece spinner görünür)
   └─ beforeunload uyarısı aktif edilir
   └─ n8n webhook'a POST isteği gönderilir

4. AI yanıt döner
   └─ beforeunload uyarısı kapatılır
   └─ Form geri gösterilir ve daraltılır
   └─ Sonuçlar render edilir
   └─ Rate sayacı artırılır

5. Kullanıcı sonuçları inceler
   └─ Yazdır / PDF Al
   └─ Formu Kaydet (JSON)
   └─ "Yeniden Oluştur" (formu açar, düzenler, tekrar gönderir)
   └─ CTA → Ücretsiz Görüşme

6. Hata durumunda
   └─ beforeunload uyarısı kapatılır
   └─ Form geri gösterilir (kullanıcı tekrar deneyebilir)
   └─ Anlamlı hata mesajı gösterilir
   └─ Rate sayacı artırılmaz
```

---

*Kolay KOBİ AI Araçları — İş Gereksinimleri Dokümanı v3.1 | 2026-08-07 | kolaykobi.com*
