# Kolay KOBİ — Teknik Mimari ve Kurulum Kılavuzu

> **Doküman Referansları**
> - İş Gereksinimleri: `kobikolayUygulamalar.docx`
> - Teknik Tasarım: `kolay_kobi_gelistirme_rehberi_v3.docx`
> - Kurulum & Mimari: bu dosya (`KURULUM.md`)

---

## 1. Proje Genel Bakış

Kolay KOBİ, küçük ve orta ölçekli işletmelerin (KOBİ) pazarlama, müşteri iletişimi ve içerik üretimi süreçlerini yapay zeka ile hızlandırmasını sağlayan 11 adet self-servis web aracı koleksiyonudur. Her araç, tarayıcıda çalışan bağımsız bir HTML formu olarak sunulur; AI işlemleri n8n üzerinden yönetilen webhook'lar aracılığıyla gerçekleştirilir.

### Araç Listesi

| # | Araç Adı | HTML Dosyası |
|---|---|---|
| 1 | İşletme Görünürlük Skoru | `isletme_gorunurluk_skoru.html` |
| 2 | Müşteri Persona Oluşturucu | `musteri_persona_olusturucu.html` |
| 3 | 30 Günlük İçerik Takvimi | `icerik_takvimi_uretici.html` |
| 4 | WhatsApp Satış Script Üretici | `whatsapp_satis_script_uretici.html` |
| 5 | Reklam Bütçe Dağıtıcı | `reklam_butce_dagitici.html` |
| 6 | Müşteri Geri Dönüş Senaryosu | `musteri_geri_donus_senaryosu.html` |
| 7 | Rakip Analiz Panosu | `rakip_analiz_panosu.html` |
| 8 | Chatbot Senaryosu Hazırlayıcı | `chatbot_senaryosu_hazırlayici.html` |
| 9 | AI Görünürlük Takipçisi | `ai_visibility_tracker.html` |
| 10 | Viral Video Uyarlayıcı | `viral_video_uyarlayici.html` |
| 11 | Trend Video Bulucu | `trend_video_bulucu.html` |

---

## 2. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Versiyon / URL | Amaç |
|---|---|---|---|
| Frontend | HTML5 + Vanilla JS | — | Self-contained araç formları |
| CMS | WordPress | kolaykobi.com | Sayfa barındırma |
| İş Akışı | n8n | n8n.srv1492396.hstgr.cloud | API proxy, rate limiting, AI çağrıları |
| AI (Ana) | MiniMax-M3 | api.minimax.io/v1/chat/completions | İçerik üretimi (tüm araçlar) |
| AI (Arama) | Gemini Flash | generativelanguage.googleapis.com/v1beta | Web arama + Google Search Grounding (Rakip Analiz) |
| Video Verisi | Apify | apify.com | TikTok/Instagram viral video verileri (Trend Video Bulucu) |
| İkonlar | Tabler Icons | CDN (frontend) | UI ikon seti |

---

## 3. Teknik Mimari

### 3.1 Veri Akışı

```
Kullanıcı
   │ form doldurur
   ▼
HTML Araç (Browser)
   │ fetch() POST → JSON payload
   ▼
n8n Webhook (proxy)
   ├─ Rate Limit Check (IP tabanlı, 50 istek/ay)
   ├─ Gemini Flash (opsiyonel — yalnızca Rakip Analiz)
   │       └─ Google Search Grounding
   ├─ MiniMax-M3 API
   │       └─ max_completion_tokens: araça göre (4.000–16.000)
   └─ Response Transform (think bloğu temizleme, JSON çıkarma)
   │ JSON response
   ▼
HTML Araç (Browser)
   │ renderResults()
   ▼
Kullanıcı (sonuçları görür)
```

### 3.2 n8n Workflow Yapısı (Standart Senkron Akış)

Her standart workflow için ortak düğüm sırası:

1. **Webhook** (POST) — gelen formu alır
2. **Rate Limit Check** (Code) — IP tabanlı aylık kota kontrolü
3. **Rate Limited?** (IF)
   - `true` → **429 Response** (kota aşıldı)
   - `false` → devam
4. **Prepare Request** (Code) — prompt oluşturma, parametreleri hazırlama
5. **AI API** (HTTP Request) — MiniMax veya Gemini
6. **Response Transform** (Code) — `<think>` bloğu temizleme, JSON çıkarma, Anthropic formatına dönüştürme (`content[0].text`)
7. **Success Response** (Respond to Webhook)

> **Önemli:** n8n'de bir HTTP Request düğümünden sonra önceki düğümlerin çıktısına `$json` ile erişilemez. Bir sonraki düğümde önceki bir düğümün verisine ihtiyaç duyulduğunda her zaman `$('DüğümAdı').item.json.alan` şeklinde açıkça isimlendirilmiş referans kullanın.

---

## 4. Araç → API Eşleştirme Tablosu

| # | Araç Adı | HTML Dosyası | n8n Workflow | API'ler | Webhook Path |
|---|---|---|---|---|---|
| 1 | İşletme Görünürlük Skoru | `isletme_gorunurluk_skoru.html` | `kolay-kobi-skor.json` | MiniMax-M3 | `/webhook/kolay-kobi-skor` |
| 2 | Müşteri Persona Oluşturucu | `musteri_persona_olusturucu.html` | `kolay-kobi-persona.json` | MiniMax-M3 | `/webhook/kolay-kobi-persona` |
| 3 | 30 Günlük İçerik Takvimi | `icerik_takvimi_uretici.html` | `kolay-kobi-takvim-async.json` + `kolay-kobi-takvim-worker.json` | MiniMax-M3 | `/webhook/kolay-kobi-takvim` + `/webhook/kolay-kobi-takvim-status` |
| 4 | WhatsApp Satış Script | `whatsapp_satis_script_uretici.html` | `kolay-kobi-wa.json` | MiniMax-M3 | `/webhook/kolay-kobi-wa` |
| 5 | Reklam Bütçe Dağıtıcı | `reklam_butce_dagitici.html` | `kolay-kobi-reklam.json` | MiniMax-M3 | `/webhook/kolay-kobi-reklam` |
| 6 | Müşteri Geri Dönüş Senaryosu | `musteri_geri_donus_senaryosu.html` | `kolay-kobi-geri.json` | MiniMax-M3 | `/webhook/kolay-kobi-geri` |
| 7 | Rakip Analiz Panosu | `rakip_analiz_panosu.html` | `kolay-kobi-rakip.json` | MiniMax-M3 + Gemini Flash | `/webhook/kolay-kobi-rakip` |
| 8 | Chatbot Senaryosu | `chatbot_senaryosu_hazırlayici.html` | `kolay-kobi-chatbot.json` | MiniMax-M3 | `/webhook/kolay-kobi-chatbot` |
| 9 | AI Görünürlük Takipçisi | `ai_visibility_tracker.html` | `kolay-kobi-aivisibility.json` | MiniMax-M3 | `/webhook/kolay-kobi-aivisibility` |
| 10 | Viral Video Uyarlayıcı | `viral_video_uyarlayici.html` | `kolay-kobi-viral.json` | MiniMax-M3 | `/webhook/kolay-kobi-viral` |
| 11 | Trend Video Bulucu | `trend_video_bulucu.html` | `kolay-kobi-trend.json` | MiniMax-M3 + Apify | `/webhook/kolay-kobi-trend` |

---

## 5. API Yapılandırması

### 5.1 MiniMax API

- **Endpoint:** `https://api.minimax.io/v1/chat/completions`
- **Model:** `MiniMax-M3`
- **Auth:** `Authorization: Bearer YOUR_MINIMAX_API_KEY`
- **Kritik:** `Accept-Charset` header **KULLANILMAZ** — bu header Türkçe encoding bozukluğuna yol açar (`ü` → `眉` gibi)
- **`max_completion_tokens`:** araça göre 4.000–16.000 arası (İçerik Takvimi için dinamik hesaplama — bkz. Bölüm 9)
- **Response formatı:** OpenAI uyumlu (`choices[0].message.content`); n8n Response Transform düğümü bunu HTML'lerin beklediği Anthropic formatına (`content[0].text`) dönüştürür
- **Retry:** `retryOnFail: true, maxTries: 3, waitBetweenTries: 2000` (geçici 504 hatalarına karşı)

**API Key almak için:** [platform.minimax.io](https://platform.minimax.io) → API Keys → Create Key

### 5.2 Gemini Flash API (Yalnızca Rakip Analiz)

- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`
- **Auth:** URL parametresi olarak `?key=YOUR_GEMINI_API_KEY`
- **Google Search Grounding:** `tools: [{ google_search: {} }]`
- **Timeout:** 60.000ms (web araması nedeniyle uzun sürebilir)
- **Hata toleransı:** `onError: "continueRegularOutput"` — Gemini başarısız olursa workflow MiniMax'a fallback yapar, çökmez
- **Ücretsiz kota:** İlk 5.000 sorgu/ay ücretsiz; aşılırsa her 1.000 sorguda $14 ek ücret

**Not:** Gemini ayrı n8n credential gerektirmez; key doğrudan URL parametresi olarak geçilir. Alternatif: n8n Environment Variable `GEMINI_API_KEY`.

### 5.3 Apify API (Yalnızca Trend Video Bulucu)

- **Platform:** [apify.com](https://apify.com)
- **Kullanım:** TikTok/Instagram viral içerik verisi scraping
- **Maliyet:** ~20 TL / çalıştırma (diğer araçlardan belirgin biçimde pahalı)

---

## 6. n8n Kurulum Adımları

### 6.1 API Kimlik Bilgilerini Ekle

n8n → **Credentials** → **Add Credential**:

**MiniMax:**
- Tür: **Header Auth**
- Name: `MiniMax API Key`
- Header Name: `Authorization`
- Header Value: `Bearer eyJ...` (MiniMax key'in)

**Gemini:**
- Ayrı credential gerekmez — key doğrudan HTTP Request node'unun URL parametresi olarak girilir

### 6.2 Workflow'ları Import Et

1. n8n → **Workflows** → **Import from File**
2. `/home/user/KitapAITool/n8n-workflows/` klasöründeki `.json` dosyalarını sırayla import et
3. Her workflow'da HTTP Request node'larını aç, credential seç
4. Webhook'ları **Active** yap (toggle)

**İçerik Takvimi için özel sıra** (asenkron mimari, bkz. Bölüm 9):
1. Eski `kolay-kobi-takvim.json` varsa **Deactivate** et (aynı webhook path'i iki aktif workflow'da kullanılamaz)
2. `kolay-kobi-takvim-async.json` ("Job Başlat") → Import → Activate
3. `kolay-kobi-takvim-worker.json` ("Worker + Durum") → Import → MiniMax Authorization header'ını doldur → Activate
4. Her iki workflow da **aynı anda aktif** olmalıdır

### 6.3 Webhook Test

```bash
# Standart araç testi
curl -X POST https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-skor \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Sadece JSON olarak {\"test\": true} döndür."}'
# Beklenen: {"content": [{"type": "text", "text": "{\"test\": true}"}]}

# İçerik Takvimi — Job başlat
curl -X POST https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-takvim \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test", "dayCount": 4}'
# Beklenen (1-2sn içinde): {"job_id":"...", "status":"pending"}

# İçerik Takvimi — Durumu sorgula
curl "https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-takvim-status?jobId=JOB_ID_BURAYA"
# Beklenen: {"status":"pending"} veya {"status":"completed","result":{...}}
```

### 6.4 WordPress Entegrasyonu

- Her HTML dosyası bir WordPress sayfasına tam sayfa olarak gömülür
- **Sayfa şablonu:** Full-width, header/footer gizli (Elementor veya tema seçeneği)
- **LiteSpeed Cache — Önemli:**
  - Cache Exceptions → URI Contains: `/webhook/` ve `/wp-json/kolaykobi/v1/`
  - Alternatif (zorunlu değil): `wordpress-ai-proxy.php`'deki status uçları zaten `Cache-Control: no-store` + `nocache_headers()` gönderiyor; HTML'ler de her `/status` sorgusuna benzersiz `?_=timestamp` ekliyor — bu, URL-tabanlı önbellekleme katmanlarını (LiteSpeed dahil) panel ayarı gerekmeden atlatır

---

## 7. API Maliyet Takibi

> Ölçülen gerçek canlı maliyetler — tahmini değil (Ağustos 2026 itibarıyla).

### MiniMax API

| Araç | Ortalama Token/Sorgu | Tahmini Maliyet/Sorgu |
|---|---|---|
| İçerik Takvimi (4 gün) | ~6.800 token | ~$0.007 |
| Rakip Analiz Panosu | ~12.000 token | ~$0.012 |
| Diğer araçlar | ~3.000–5.000 token | ~$0.003–0.005 |

Platform: [platform.minimax.io](https://platform.minimax.io) → Billing

### Gemini API (Rakip Analiz Panosu)

| Sorgu | Token Kullanımı | Maliyet (USD) | Maliyet (TL) |
|---|---|---|---|
| Tek rakip platform araması | ~9.300 token | ~$0.028 | ~0,13 TL |

- Model: `gemini-3.5-flash` + Google Search Grounding
- Platform: [aistudio.google.com/spend](https://aistudio.google.com/spend) → Project: KolayKobi
- **Kümülatif harcama (Ağustos 2026):** ~4,13 TL

### Apify (Trend Video Bulucu)

| İşlem | Maliyet |
|---|---|
| Tek çalıştırma (TikTok/Instagram trend tarama) | ~20 TL |

Platform: [apify.com](https://apify.com) → Billing

### Toplam Maliyet Özeti (Tek Sorgu Başına)

| Araç | API'ler | Tahmini TL/Sorgu |
|---|---|---|
| İçerik Takvimi | MiniMax | ~0,10 TL |
| Rakip Analiz Panosu | MiniMax + Gemini | ~0,40 TL |
| Trend Video Bulucu | MiniMax + Apify | ~20+ TL |
| Diğer 8 araç | MiniMax | ~0,05–0,15 TL |

---

## 8. Uygulama Durumu

| # | Araç | Workflow | HTML | Canlı |
|---|---|---|---|---|
| 1 | İşletme Görünürlük Skoru | ✅ | ✅ | ⏳ |
| 2 | Müşteri Persona Oluşturucu | ✅ | ✅ | ⏳ |
| 3 | 30 Günlük İçerik Takvimi | ✅ (async + worker) | ✅ | ⏳ |
| 4 | WhatsApp Satış Script | ✅ | ✅ | ⏳ |
| 5 | Reklam Bütçe Dağıtıcı | ⏳ | ✅ | ⏳ |
| 6 | Müşteri Geri Dönüş Senaryosu | ⏳ | ✅ | ⏳ |
| 7 | Rakip Analiz Panosu | ✅ | ✅ | ⏳ |
| 8 | Chatbot Senaryosu | ⏳ | ✅ | ⏳ |
| 9 | AI Görünürlük Takipçisi | ⏳ | ✅ | ⏳ |
| 10 | Viral Video Uyarlayıcı | ⏳ | ✅ | ⏳ |
| 11 | Trend Video Bulucu | ✅ | ✅ | ⏳ |

---

## 9. İçerik Takvimi — Özel Mimari (Asenkron Polling)

Bu araç diğerlerinden farklı çalışır. Aşağıdaki bölüm, canlı test sürecinde keşfedilen hatalar ve uygulanan düzeltmelerle birlikte tam teknik geçmişi kapsamaktadır.

### Neden Asenkron?

30 günlük takvim üretimi MiniMax'ta 2–8 dakika sürebilir. kolaykobi.com Akamai CDN arkasında çalışmakta olup Akamai ~60–120sn'lik bir gateway timeout uygulamaktadır. Bu timeout, WordPress veya n8n tarafında yapılan ayarlardan **tamamen bağımsızdır** — tek senkron webhook isteğiyle bekleme yapılamaz.

### Mimari: İki Ayrı Workflow + Polling

```
Tarayıcı
   │ POST /webhook/kolay-kobi-takvim  (job başlat)
   ▼
kolay-kobi-takvim-async.json  ("Job Başlat")
   ├─ Rate Limit Check
   ├─ job_id üret
   ├─ Worker'ı fire-and-forget tetikle (5sn timeout, sonucu bekleme)
   └─ {job_id, status:"pending"} döner  ← birkaç saniye içinde
   │
   │  (arka planda, bağımsız)
   ▼
kolay-kobi-takvim-worker.json  ("Worker + Durum")
   ├─ MiniMax API çağrısı (tamamlanana kadar çalışır)
   ├─ Sonucu staticData.jobs[job_id] içine yazar
   └─ GET /webhook/kolay-kobi-takvim-status?jobId=... → durum döner

Tarayıcı
   └─ Her 4 saniyede bir /status sorgular, max 6 dakika bekler
```

**Neden tek workflow "erken yanıt ver + arka planda devam et" tasarımı çalışmadı:**
n8n'nin Hostinger'daki reverse proxy'si erken yanıtı tüm execution bitene kadar buffer'lıyor; yanıt tarayıcıya/WordPress'e asla ulaşmıyor. Execution log'da tek bir 4dk'lık çalıştırma görülüyor, WordPress ise 15sn'lik kendi timeout'unda vazgeçip hata veriyor. Bu nedenle mimari, erken-yanıt triğine hiç bağımlı olmayacak şekilde ikiye bölündü.

### Dinamik `max_completion_tokens`

```javascript
// Worker "Build Request Body" düğümündeki formül:
Math.min(20000, Math.max(6000, 2500 + dayCount * 1800))
```

`dayCount` parametresi HTML formundan → WordPress proxy → Job Başlat → Worker zincirinde taşınır. MiniMax faturalaması gerçekte üretilen token sayısına göre yapılır; cap yüksek tutmanın maliyeti yoktur, düşük tutmanın (kesilme/kayıp kredi) riski çok daha yüksektir.

### LiteSpeed Cache Sorunu ve Çözümü

`/status/{job_id}` sorgularının ilki `200`, sonrakiler `304 Not Modified` dönüyordu — LiteSpeed GET endpoint'ini önbelleğe alıyor, n8n'e hiç ulaşmıyor, durum asla "completed"a geçemiyordu.

İki katmanlı düzeltme:
1. `wordpress-ai-proxy.php`'de `nocache_headers()` + `Cache-Control: no-store` header'ları
2. `icerik_takvimi_uretici.html`'de her `/status` sorgusuna `?_=timestamp` + `cache: 'no-store'` — URL'yi her seferinde farklı kılar, herhangi bir URL-tabanlı önbellekleme katmanını panel ayarı gerekmeden atlatır

---

## 10. Canlı Test Sürecinde Keşfedilen Hatalar ve Düzeltmeler

Bu bölüm, geliştirme sırasında karşılaşılan ve çözümlenen teknik sorunların tam kaydıdır.

### H1: `jobId` Sessizce Düşüyordu

**Belirti:** Tarayıcı anında "Takvim oluşturulamadı" hatası veriyordu.

**Kök neden:** "Respond With Job ID" düğümü `$json.jobId` kullanıyordu; ancak bir önceki "Trigger Worker" düğümü bir HTTP çağrısı olduğu için `$json` artık Worker'ın ack yanıtına işaret ediyordu, `Generate Job` çıktısına değil. `JSON.stringify` `undefined` alanları atadığından `job_id` yanıttan sessizce düşüyordu. Aynı sorun Worker workflow'unda da mevcuttu: "Response Transform" ve "Save Job Error" düğümleri MiniMax API yanıtından jobId okumaya çalışıyordu.

**Düzeltme:** Her iki workflow'da da jobId artık `$('DüğümAdı').item.json.jobId` şeklinde açıkça isimlendirilmiş referanslardan okunur.

### H2: MiniMax Tarafında Akamai 504

**Belirti:** Job sonucu `{"status":"error","error":"504 - ... errors.edgesuite.net ..."}`.

**Kök neden:** `api.minimax.io` da Akamai arkasında çalışıyor; MiniMax'ın origin sunucusu yavaş yanıt verdiğinde Akamai kendi gateway timeout'unu uyguluyor. Bu, kolaykobi.com'un önündeki Akamai'den tamamen ayrı ve bizim kontrolümüz dışında.

**Düzeltme (mitigasyon):** MiniMax API düğümüne `retryOnFail: true, maxTries: 3, waitBetweenTries: 2000` eklendi. Yalnızca tüm denemeler tükenirse job gerçekten `error` olur. Kalıcı çözüm için MiniMax destek ekibiyle iletişim gerekir.

### H3: Gereksiz Parçalama (Chunking) — 5–10 Kat Kredi İsrafı

**Belirti:** Tek "Oluştur" tıklaması ~250 kredi harcıyordu (sabah 3.800 krediden birkaç saatte ~1.200'e düştü).

**Kök neden:** `computeChunkGroups` 30 günü birden fazla parçaya bölüyor, her parça ayrı bir MiniMax API çağrısı yapıyordu (2 gün/hafta seçiminde 3 parça = 3 çağrı = 3 kat kredi). Bu parçalamanın orijinal gerekçesi (Akamai gateway timeout) asenkron mimari ile artık geçerli değildi.

**Düzeltme:** `computeChunkGroups` artık her zaman tek bir grup döner (tüm 30 gün, tek MiniMax çağrısı). `computeViewTabs` fetch'ten tamamen bağımsız hale getirildi — kullanıcıya 5 haftalık sekme gösterimi hâlâ sunuluyor, ancak hepsi aynı tek fetch sonucunu istemci tarafında haftalara bölerek gösteriyor. `max_completion_tokens` `16.000`'e çıkarıldı (artık dinamik formülle hesaplanıyor).

**Beklenen tasarruf:** ~%75–80 kredi tasarrufu.

### H4: `"day": SIRA_NO` Placeholder Kopyalama

**Belirti:** `SyntaxError: Unexpected token 'S', ... "day": SIRA_NO,` — 203 kredilik üretim boşa gitti.

**Kök neden:** Model, şemadaki soyut yer tutucuyu (`SIRA_NO`) gerçek bir sayıyla değiştirmek yerine olduğu gibi kopyaladı.

**Düzeltme (iki katmanlı):**
1. **Önleme:** `buildCalendarPrompt`'taki şema artık soyut "SIRA_NO" yerine isteğin gerçek ilk Sıra No'sunu somut örnek olarak gösteriyor + "asla yer tutucu yazma" talimatı eklendi.
2. **Kurtarma:** `repairPlaceholderDayFields()` — JSON.parse başarısız olursa "day" alanlarının dizideki sırasını takip ederek sayısal olmayan değerleri doğru gerçek Sıra No ile değiştirir ve yeniden dener. Başarılı olursa ek AI çağrısına gerek kalmaz.

---

## 11. Form UX Davranışları

| Davranış | Uygulama |
|---|---|
| **Form gizleme** | "Analizi Başlat" tıklanınca `form-section` `display:none` yapılır, yalnızca spinner ve mesaj gösterilir |
| **Sayfa terk uyarısı** | AI üretimi sürerken `window._warnBU` bayrağı + `beforeunload` event dinleyicisi etkinleştirilir |
| **Form daraltma** | Sonuçlar yüklendiğinde forma `is-collapsed` class'ı eklenir, daraltılmış bar görünür |
| **Yeniden oluştur** | Daraltılmış form açılabilir, düzenlenip "Yeniden Oluştur" ile tekrar gönderilebilir |
| **Rate bar** | Aylık 3 kullanım, nokta (dot) göstergesi |
| **Form kalıcılığı** | `localStorage` ile form değerleri saklanır; JSON export/import desteklenir |

> **Not:** `beforeunload` diyaloğunda özel metin gösterilemez. Tarayıcı kendi dilindeki genel uyarıyı gösterir (örn. "Değişiklikler kaydedilmemiş olabilir"). Bu kısıt JavaScript/HTML ile aşılamaz — tüm modern tarayıcılarda (Chrome 51+, Firefox 44+) geçerlidir.

---

## 12. Sorun Giderme

| Sorun | Neden | Çözüm |
|---|---|---|
| Türkçe karakterler bozuk (`ü` → `眉`) | `Accept-Charset: utf-8` header gönderiliyor | Header'ı kaldır — MiniMax'ta bu header encoding'i bozmaktadır |
| Workflow'da Gemini hatası tüm akışı çöktürüyor | `onError` `parameters` içinde tanımlanmış | `onError: "continueRegularOutput"` seçeneğini node'un top-level ayarına taşı |
| JSON import başarısız | Template literal içinde tırnak kaçışı sorunu | Python `json.dumps` ile workflow JSON'u üret |
| `$json.jobId` undefined dönüyor | HTTP Request sonrası `$json` o node'un yanıtına işaret eder | `$('DüğümAdı').item.json.jobId` şeklinde açık referans kullan |
| Takvim boş taslaklar içeriyor (`...` veya yarım JSON) | `max_completion_tokens` düşük, `finish_reason: length` | Token limitini artır; dinamik formülün `dayCount` ile çalıştığını doğrula |
| LiteSpeed `/status` endpoint'ini cache'liyor | GET endpoint'leri varsayılan olarak önbelleğe alınıyor | HTML'de `?_=timestamp` + `cache:'no-store'` kullan; proxy'de `nocache_headers()` ekle |
| Takvim job'u dakikalarca `pending` kalıyor | Worker workflow aktif değil veya Trigger Worker çağrısı bloklanıyor | n8n'de her iki workflow'un da aktif olduğunu doğrula |
| MiniMax 504 hatası (edgesuite.net) | MiniMax'ın Akamai'si timeout yapıyor | n8n node'unda `retryOnFail: true, maxTries: 3` ayarlandığından emin ol |
| `day: SIRA_NO` JSON parse hatası | Model yer tutucuyu gerçek sayıyla değiştirmedi | `repairPlaceholderDayFields()` kurtarma fonksiyonu HTML'de mevcut; prompt'ta somut örnek kullan |

---

## 13. n8n Workflow Dosyaları

`/home/user/KitapAITool/n8n-workflows/` klasöründeki dosyalar:

| Dosya | Açıklama |
|---|---|
| `kolay-kobi-skor.json` | İşletme Görünürlük Skoru |
| `kolay-kobi-persona.json` | Müşteri Persona Oluşturucu |
| `kolay-kobi-takvim-async.json` | İçerik Takvimi — Job Başlat (orchestrator) |
| `kolay-kobi-takvim-worker.json` | İçerik Takvimi — Worker + Durum Sorgulama |
| `kolay-kobi-wa.json` | WhatsApp Satış Script Üretici |
| `kolay-kobi-reklam.json` | Reklam Bütçe Dağıtıcı |
| `kolay-kobi-geri.json` | Müşteri Geri Dönüş Senaryosu |
| `kolay-kobi-rakip.json` | Rakip Analiz Panosu (MiniMax + Gemini) |
| `kolay-kobi-chatbot.json` | Chatbot Senaryosu Hazırlayıcı |
| `kolay-kobi-aivisibility.json` | AI Görünürlük Takipçisi |
| `kolay-kobi-viral.json` | Viral Video Uyarlayıcı |
| `kolay-kobi-trend.json` | Trend Video Bulucu (MiniMax + Apify) |
