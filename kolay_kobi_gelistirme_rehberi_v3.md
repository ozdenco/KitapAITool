# Kolay KOBİ AI Araçları — Teknik Tasarım Dokümanı (TDD)

**Doküman Referansları:**
- İş Gereksinimleri: `kobikolayUygulamalar.md` (BR-XX numaraları ile)
- Kurulum & Mimari: `KURULUM.md`
- Bu dosya: `kolay_kobi_gelistirme_rehberi_v3.md` (TD-XX numaraları)

**Versiyon:** v3.1 | **Tarih:** 2026-08-07 | **Yazar:** Ozden Isikgil

---

## İçindekiler

1. Proje Genel Bakış (→ BR-01)
2. Uygulama Envanteri — 11 Araç (→ BR-02–BR-13)
3. Teknik Mimari (→ BR-01)
4. n8n Webhook Konfigürasyonu
5. Standart UX Bileşenleri
   - 5.1 Aylık Kullanım Çubuğu (Rate Bar)
   - 5.2 Form Kalıcılığı (LocalStorage Auto-Save)
   - 5.3 Formu Kaydet / Form Yükle (JSON Export/Import)
   - 5.4 Form Daralt / Genişlet (Collapse Pattern)
   - 5.5 Form Gizleme — AI Üretimi Sırasında
   - 5.6 Sayfa Terk Uyarısı (beforeunload)
   - 5.7 Dışa Aktarma Seçenekleri
   - 5.8 CTA Kutusu
6. Print / PDF Standartları
   - 6.1 Temel Print CSS Yaklaşımı
   - 6.2 Radio / Checkbox Cevapları Print'te Gösterme
   - 6.3 Accordion Bölümleri Print'te Açık Gösterme
   - 6.4 Form Collapse Pattern Print Davranışı
   - 6.5 WordPress'ten PDF Alma
7. Dosya Yapısı ve Standartlar
   - 7.1 Repository Dosya Yapısı
   - 7.2 n8n Workflow Dosyaları
   - 7.3 HTML Dosya Yapısı (Standart)
   - 7.4 Standart JavaScript Fonksiyonları
8. Yeni Araç Oluşturma (_template.html)
9. Güvenlik Standartları
10. WordPress Entegrasyonu
    - 10.1 HTML Dosyası Yükleme
    - 10.2 Cache Yönetimi
    - 10.3 REST API Yapısı (PHP Kodu)
    - 10.4 REST API Hata Ayıklama
11. Deployment Kontrol Listesi
12. Sık Karşılaşılan Sorunlar
13. n8n Workflow Şablonu (JSON)
14. Dosya Haritası
15. MiniMax Türkçe Encoding Düzeltmesi
16. Sürüm Geçmişi

---

## 1. Proje Genel Bakış (→ BR-01)

**TD-01** — Kolay KOBİ AI Araçları, KOBİ sahiplerinin pazarlama ve operasyon süreçlerini hızlandırmasına yönelik **11 adet tarayıcı tabanlı AI aracıdır**. Her araç:

- Tek sayfalık HTML dosyası olarak WordPress'e yüklenir
- Kullanıcı formunu doğrudan n8n webhook'una iletir
- n8n, MiniMax-M3 reasoning modelini (ve gerektiğinde Gemini Flash, Apify) çağırır ve yanıtı işler
- Sonuç, kullanıcıya araç sayfasında gösterilir ve yazdırılabilir

**Tasarım İlkesi:** Her araç bağımsız, self-contained bir HTML dosyasıdır. Harici CSS/JS bağımlılığı yoktur (`kkb-shared.js` tercihen eklenir). WordPress tema değişikliği hiçbir aracı bozmaz.

---

## 2. Uygulama Envanteri — 11 Araç (→ BR-02–BR-13)

| # | Araç Adı | Dosya | WordPress Slug | n8n Webhook | BRD Ref |
|---|---|---|---|---|---|
| 1 | İşletme Görünürlük Skoru | `isletme_gorunurluk_skoru.html` | /gorunurluk-skoru/ | kolay-kobi-skor | BR-02 |
| 2 | Müşteri Persona Oluşturucu | `musteri_persona_olusturucu.html` | /musteri-persona/ | kolay-kobi-persona | BR-03 |
| 3 | 30 Günlük İçerik Takvimi | `icerik_takvimi_uretici.html` | /icerik-takvimi/ | kolay-kobi-takvim | BR-04 |
| 4 | WhatsApp Satış Script Üretici | `whatsapp_satis_script_uretici.html` | /whatsapp-satis/ | kolay-kobi-wa | BR-05 |
| 5 | Reklam Bütçe Dağıtıcı | `reklam_butce_dagitici.html` | /reklam-butce/ | kolay-kobi-reklam | BR-06 |
| 6 | Müşteri Geri Dönüş Senaryosu | `musteri_geri_donus_senaryosu.html` | /musteri-geri-donus/ | kolay-kobi-geri | BR-07 |
| 7 | Rakip Analiz Panosu | `rakip_analiz_panosu.html` | /rakip-analiz-panosu/ | kolay-kobi-rakip | BR-08 |
| 8 | Chatbot Senaryo Hazırlayıcı | `chatbot_senaryosu_hazırlayici.html` | /chatbot-senaryosu/ | kolay-kobi-chatbot | BR-09 |
| 9 | AI Görünürlük Takipçisi | `ai_visibility_tracker.html` | /ai-gorunurluk/ | kolay-kobi-aivisibility | BR-10 |
| 10 | Viral Video Uyarlayıcı | `viral_video_uyarlayici.html` | /viral-video/ | kolay-kobi-viral | BR-11 |
| 11 | Trend Video Bulucu | `trend_video_bulucu.html` | /trend-video/ | kolay-kobi-trend | BR-12 |
| + | Şablon | `_template.html` | — | — | BR-13 |

---

## 3. Teknik Mimari (→ BR-01)

**TD-02** — Sistem mimarisi:

```
Kullanıcı Tarayıcısı
       │  fetch POST (JSON payload)
       ▼
n8n Webhook
  /webhook/kolay-kobi-{tool}
       │
       ├─ Rate Limit Check (Code node — IP tabanlı, 50 istek/ay)
       │
       ├─ Build Request node
       │     └─ Prompt oluşturma, parametreler
       │
       ├─ MiniMax API (HTTP Request)
       │     └─ Model: MiniMax-M3
       │     └─ onError: continueErrorOutput
       │
       ├─ [Opsiyonel] Gemini Flash (sadece Rakip Analiz)
       │     └─ Google Search Grounding
       │
       ├─ [Opsiyonel] Apify (sadece Trend Video Bulucu)
       │
       └─ Response Transform (Code node)
             ├─ <think>...</think> bloğunu siler
             ├─ Türkçe encoding düzeltmesi (CJK → Türkçe char map)
             ├─ JSON parse eder
             └─ Başarı/hata response döner
```

### API İstek Formatı

```javascript
// Frontend → n8n Webhook
fetch('/webhook/kolay-kobi-{tool}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    isletme_adi: '...',
    sektor: '...',
    // ... araç-spesifik alanlar
  })
});

// n8n Response (başarılı)
{
  "success": true,
  "data": { /* araç-spesifik JSON */ }
}

// n8n Response (hata)
{
  "success": false,
  "error": "API yanıt vermedi"
}
```

### MiniMax-M3 Model Özellikleri

- Model ID: `MiniMax-M3` (veya `abab6.5s-chat`)
- Yanıt başında `<think>...</think>` bloğu gelir — n8n'de **mutlaka** silinmeli
- `max_completion_tokens: 8000` ayarlanmalı (aksi halde response kesilebilir)
- n8n'de `onError: continueErrorOutput` ile API hatası graceful handle edilmeli
- MiniMax yanıtı kesilebilir (truncated): Response Transform'da JSON parse öncesi `<think>` bloğu temizlenmeli ve parse hatası yakalanmalıdır

---

## 4. n8n Webhook Konfigürasyonu

**TD-03** — WordPress REST API Plugin Kodu (functions.php veya custom plugin):

```php
add_action('rest_api_init', function() {
  $tools = [
    'skor', 'persona', 'takvim', 'takvim-status',
    'wa', 'reklam', 'geri', 'rakip', 'chatbot',
    'aivisibility', 'viral', 'trend'
  ];
  foreach ($tools as $tool) {
    register_rest_route('kolaykobi/v1', '/ai/' . $tool, [
      'methods'  => 'POST',
      'callback' => function($req) use ($tool) {
        $n8n_url = 'https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-' . $tool;
        $response = wp_remote_post($n8n_url, [
          'body'    => json_encode($req->get_json_params()),
          'headers' => ['Content-Type' => 'application/json'],
          'timeout' => 120,
        ]);
        return rest_ensure_response(
          json_decode(wp_remote_retrieve_body($response), true)
        );
      },
      'permission_callback' => '__return_true',
    ]);
  }
});
```

### n8n Webhook URL Tablosu

| Araç | n8n Webhook Path |
|---|---|
| İşletme Görünürlük | `/webhook/kolay-kobi-skor` |
| Müşteri Persona | `/webhook/kolay-kobi-persona` |
| İçerik Takvimi (başlat) | `/webhook/kolay-kobi-takvim` |
| İçerik Takvimi (durum) | `/webhook/kolay-kobi-takvim-status` |
| WhatsApp Satış | `/webhook/kolay-kobi-wa` |
| Reklam Bütçe | `/webhook/kolay-kobi-reklam` |
| Müşteri Geri Dönüş | `/webhook/kolay-kobi-geri` |
| Rakip Analiz | `/webhook/kolay-kobi-rakip` |
| Chatbot Senaryo | `/webhook/kolay-kobi-chatbot` |
| AI Görünürlük | `/webhook/kolay-kobi-aivisibility` |
| Viral Video | `/webhook/kolay-kobi-viral` |
| Trend Video | `/webhook/kolay-kobi-trend` |

---

## 5. Standart UX Bileşenleri

### 5.1 Aylık Kullanım Çubuğu (Rate Bar) — TD-04

Her araçta ayda `MONTHLY_LIMIT` (= 3) kullanım hakkı vardır. Kullanım `localStorage`'da `RATE_KEY` ile ay bazında (YYYY-MM) saklanır; yeni ayda otomatik sıfırlanır. Limit dolduğunda bir sonraki ayın adı gösterilir.

```javascript
const MONTHLY_LIMIT = 3;
const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                   'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function nextMonthName() { return TR_MONTHS[(new Date().getMonth() + 1) % 12]; }

// RATE_KEY formatı: 'kkb_arac_usage_2025-08' (ay bazında sıfırlanır)
const RATE_KEY = 'kkb_arac_usage_' + new Date().toISOString().slice(0,7);

function checkRateLimit() {
  const d = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
  const month = new Date().toISOString().slice(0,7);
  if (d.date !== month) return true;
  return (d.count || 0) < MONTHLY_LIMIT;
}

function incrementRateLimit() {
  const d = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
  const month = new Date().toISOString().slice(0,7);
  const count = (d.date === month) ? (d.count || 0) : 0;
  localStorage.setItem(RATE_KEY, JSON.stringify({ date: month, count: count + 1 }));
  updateRateBar();
}

function updateRateBar() {
  const d = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
  const month = new Date().toISOString().slice(0,7);
  const count = (d.date === month) ? (d.count || 0) : 0;
  const pct = Math.min(100, (count / MONTHLY_LIMIT) * 100);
  document.getElementById('rate-fill').style.width = pct + '%';
  document.getElementById('rate-text').textContent =
    count + '/' + MONTHLY_LIMIT + ' kullanım';
}

// Limit dolduğunda gösterilen hata mesajı:
// 'Aylık kullanım limitinize ulaştınız. ' + nextMonthName() + ' ayında tekrar deneyin.'
```

**HTML — Rate Bar:**

```html
<div class="rate-bar-wrap">
  <div id="rate-fill" class="rate-fill"></div>
</div>
<div id="rate-text" class="rate-text">0/3 kullanım</div>
```

**CSS:**

```css
.rate-bar-wrap {
  width: 120px;
  height: 6px;
  background: #E5E7EB;
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
}
.rate-fill {
  height: 100%;
  background: #1D9E75;
  transition: width 0.3s;
}
.rate-text {
  display: inline-block;
  font-size: 11px;
  color: #6B7280;
  margin-left: 6px;
  vertical-align: middle;
}
```

### 5.2 Form Kalıcılığı (LocalStorage Auto-Save) — TD-05

Form alanları her değişiklikte otomatik kaydedilir. Sayfa yenilenince geri yüklenir. Radio button'lar `radio_` prefix ile kaydedilir (isim çakışması önlenir).

```javascript
const LS_KEY = 'kkform_' + location.pathname.replace(/\//g, '_');

function saveForm() {
  const data = {};
  document.querySelectorAll('#form-body input,#form-body textarea,#form-body select').forEach(el => {
    if (el.type === 'radio') {
      if (el.checked) data['radio_' + el.name] = el.value;
    } else if (el.type === 'checkbox') {
      data[el.id || el.name] = el.checked;
    } else {
      data[el.id || el.name] = el.value;
    }
  });
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function restoreForm() {
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  Object.entries(saved).forEach(([k, v]) => {
    if (k.startsWith('radio_')) {
      const name = k.replace('radio_', '');
      const radio = document.querySelector(`input[type=radio][name="${name}"][value="${v}"]`);
      if (radio) radio.checked = true;
    } else {
      const el = document.getElementById(k) || document.querySelector(`[name="${k}"]`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = v;
      else el.value = v;
    }
  });
}

// Başlangıçta çağrılır:
document.addEventListener('DOMContentLoaded', () => {
  restoreForm();
  updateRateBar();
});

// Her input değişikliğinde:
document.getElementById('form-body').addEventListener('input', saveForm);
document.getElementById('form-body').addEventListener('change', saveForm);
```

### 5.3 Formu Kaydet / Form Yükle (JSON Export/Import) — TD-06

Kullanıcılar form verilerini JSON dosyası olarak dışa aktarabilir ve başka cihazda/oturumda içe aktarabilir.

```javascript
function exportFormJSON() {
  saveForm();
  const data = localStorage.getItem(LS_KEY) || '{}';
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'form-verisi.json';
  a.click();
}

function importFormJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      restoreForm();
      alert('Form verisi yüklendi!');
    } catch { alert('Geçersiz dosya.'); }
  };
  reader.readAsText(file);
}

function resetForm() {
  localStorage.removeItem(LS_KEY);
  document.getElementById('form-body').querySelectorAll('input,textarea,select').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
    else el.value = '';
  });
}
```

**HTML — Form Persist Row:**

```html
<div id="form-persist-row" class="persist-row">
  <button class="btn-sm" onclick="exportFormJSON()">💾 Formu Kaydet</button>
  <label class="btn-sm" style="cursor:pointer">
    📂 Form Yükle (.json)
    <input type="file" accept=".json" style="display:none" onchange="importFormJSON(this)">
  </label>
  <button class="btn-sm btn-danger" onclick="resetForm()">🗑 Formu Boşalt</button>
</div>
```

### 5.4 Form Daralt / Genişlet (Collapse Pattern) — TD-07

Sonuçlar gösterildiğinde form otomatik olarak daraltılır. Kullanıcı "Formu Aç" düğmesiyle tekrar açabilir. PDF/print çıktısında ekran alanını verimli kullanır.

**HTML yapısı:**

```html
<div class="form-card" id="form-section">
  <!-- Collapsed bar: sadece form kapalıyken görünür -->
  <div class="form-collapsed-bar" onclick="expandForm()">
    <span class="form-collapsed-title">📋 Form</span>
    <button class="btn-sm">▼ Formu Aç</button>
  </div>

  <!-- Form içeriği -->
  <div id="form-body">
    <!-- ... form alanları ... -->

    <!-- Persist Row -->
    <div id="form-persist-row" class="persist-row">
      <button class="btn-sm" onclick="exportFormJSON()">💾 Formu Kaydet</button>
      <label class="btn-sm" style="cursor:pointer">
        📂 Form Yükle (.json)
        <input type="file" accept=".json" style="display:none" onchange="importFormJSON(this)">
      </label>
      <button class="btn-sm btn-danger" onclick="resetForm()">🗑 Formu Boşalt</button>
    </div>

    <!-- Generate Button -->
    <div class="actions">
      <button class="btn-primary" onclick="generate()">🔍 Analizi Başlat</button>
    </div>
  </div>
</div>
```

**CSS:**

```css
.form-collapsed-bar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 8px;
  background: #F9FAFB;
}
.form-card.is-collapsed .form-collapsed-bar { display: flex; }
.form-card.is-collapsed #form-body { display: none; }
```

**JavaScript:**

```javascript
function collapseForm() {
  document.querySelector('.form-card').classList.add('is-collapsed');
}
function expandForm() {
  document.querySelector('.form-card').classList.remove('is-collapsed');
}
```

**Kullanım:** Sonuçlar gösterildiğinde `collapseForm()` çağırın. "Yeniden Oluştur" butonunda `expandForm()` + sonuç alanını gizleme.

### 5.5 Form Gizleme — AI Üretimi Sırasında — TD-08

"Analizi Başlat" tıklanınca form ekrandan kaldırılır; sadece spinner ve durum mesajı görünür. Bu, kullanıcının AI çalışırken formu değiştirmesini önler ve arayüzü temiz tutar.

```javascript
function showLoading(v) {
  document.getElementById('loading-section').style.display = v ? 'block' : 'none';
  const fs = document.getElementById('form-section');
  if (fs) fs.style.display = v ? 'none' : '';
  if (v) {
    window._warnBU = window._warnBU || (function(e) {
      e.preventDefault();
      e.returnValue = '';
    });
    window.addEventListener('beforeunload', window._warnBU);
  } else {
    if (window._warnBU) {
      window.removeEventListener('beforeunload', window._warnBU);
    }
  }
}
```

**HTML — Loading Section:**

```html
<div id="loading-section" style="display:none" class="loading-box">
  <div class="spinner"></div>
  <div class="loading-msg">Yapay Zeka analiz ediyor, lütfen bekleyin...</div>
</div>
```

**CSS — Spinner:**

```css
.loading-box {
  text-align: center;
  padding: 40px 20px;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #E5E7EB;
  border-top-color: #1D9E75;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-msg {
  color: #6B7280;
  font-size: 14px;
}
```

### 5.6 Sayfa Terk Uyarısı (beforeunload) — TD-09

AI üretimi sürerken kullanıcı sayfayı kapatmaya ya da yenilemeye çalışırsa tarayıcı uyarı gösterir. Uyarı `showLoading(true)` ile aktif olur, `showLoading(false)` ile kaldırılır.

```javascript
// window._warnBU pattern — showLoading() içinde yönetilir:

function showLoading(v) {
  // ... (bkz. 5.5)
  if (v) {
    window._warnBU = window._warnBU || (function(e) {
      e.preventDefault();
      e.returnValue = '';   // Chrome/Firefox özel metin göstermez — tarayıcının kendi mesajını kullanır
    });
    window.addEventListener('beforeunload', window._warnBU);
  } else {
    if (window._warnBU) {
      window.removeEventListener('beforeunload', window._warnBU);
    }
  }
}
```

> **Not:** `beforeunload` diyaloğunda özel metin gösterilemez. Tarayıcı kendi dilindeki genel uyarıyı gösterir (örn. "Değişiklikler kaydedilmemiş olabilir"). Bu kısıt JavaScript/HTML ile aşılamaz — Chrome 51+, Firefox 44+ ve tüm modern tarayıcılarda geçerlidir.

### 5.7 Dışa Aktarma Seçenekleri — TD-10

Tüm araçlarda standart dışa aktarma seçenekleri:

- **🖨 Yazdır / PDF Al** — `window.print()` → tarayıcının PDF kaydet özelliği
- **💾 Formu Kaydet** — Form verilerini JSON olarak dışa aktar (`exportFormJSON()`)
- **📂 Form Yükle (.json)** — Kaydedilmiş form verisini içe aktar (`importFormJSON()`)

> **Kaldırıldı:** `.txt İndir` butonu tüm araçlardan kaldırılmıştır. `downloadTxt()` fonksiyonu artık kullanılmamaktadır.

### 5.8 CTA Kutusu (Call to Action) — TD-11

Her araçta sonuçların altında standart CTA kutusu bulunur. Telefon numarası veya dinamik AI çıktısı içermez — daima statik.

```html
<div class="cta-box">
  <div class="cta-title">Bu analizi işletmeniz için uygulayalım</div>
  <div class="cta-sub">Uzmanlarımız sizin için özelleştirilmiş strateji oluştursun.</div>
  <a href="https://kolaykobi.com/iletisim" class="cta-btn"
     target="_blank" rel="noopener noreferrer">
    Ücretsiz Görüşme Ayarla
  </a>
</div>
```

**CSS:**

```css
.cta-box {
  background: linear-gradient(135deg, #1D9E75 0%, #14785A 100%);
  color: #fff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-top: 24px;
}
.cta-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.cta-sub { font-size: 14px; opacity: 0.9; margin-bottom: 16px; }
.cta-btn {
  display: inline-block;
  background: #fff;
  color: #1D9E75;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
}
```

> **Dikkat:** CTA metni statik olmalıdır. AI yanıtından dinamik CTA metni veya telefon numarası kullanmayın — yanlış/eski bilgi gösterebilir.

---

## 6. Print / PDF Standartları — TD-12

### 6.1 Temel Print CSS Yaklaşımı

WordPress tema elementleri (header, footer, sidebar, menü) PDF'te görünmemesi için `visibility` tabanlı izolasyon kullanılır:

```css
@media print {
  /* Adım 1: Tüm sayfayı gizle */
  body * { visibility: hidden !important; }

  /* Adım 2: Sadece .app ve içeriğini göster */
  .app, .app * { visibility: visible !important; }
  .app {
    position: absolute;
    left: 0; top: 0;
    width: 100%;
    margin: 0; padding: 0;
  }

  /* Adım 3: Baskı gereksizlerini gizle */
  .btn-primary, .btn-secondary, .actions,
  .cta-box, .reset-link, .err,
  #form-persist-row, .form-collapsed-bar { display: none !important; }

  /* Adım 4: Form body'yi göster (collapsed olsa bile) */
  #form-body { display: block !important; }
  .form-collapsed-bar { display: none !important; }

  /* Adım 5: Sonuç bölümü yeni sayfadan başlasın */
  #results-section { page-break-before: always; }

  /* Adım 6: Loading/spinner gizle */
  #loading-section { display: none !important; }
}
```

### 6.2 Radio / Checkbox Cevapları Print'te Gösterme

**Sorun:** `.radio-group{display:none!important}` parent container'ı gizlerse, seçili öğe çocuk olduğu için `display:inline-flex!important` override edemez.

**Çözüm:** Parent container'ı görünür bırak, sadece seçilmemiş öğeleri gizle (`:has()` selector kullanımı):

```css
@media print {
  /* YANLIŞ — parent gizlenince çocuk override edemez:
  .radio-group, .check-group { display: none !important; } */

  /* DOĞRU — parent görünür, sadece seçilmemişler gizli: */
  .radio-group, .check-group {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    margin-top: 2px !important;
    grid-template-columns: unset !important;
  }
  .radio-item:not(:has(input:checked)),
  .check-item:not(:has(input:checked)) {
    display: none !important;
  }
  .radio-item:has(input:checked),
  .check-item:has(input:checked) {
    display: inline-flex !important;
    border: 0.5px solid #1D9E75;
    background: #F0FAF6;
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 12px;
    margin: 2px;
  }
}
```

### 6.3 Accordion Bölümleri Print'te Açık Gösterme

Accordion kategorileri (.cat-body), detay bölümleri ve expand box'ları print'te kapalı kalmamalıdır:

```css
@media print {
  .cat-body, .details-body, .expand-body {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .cat-chevron { display: none !important; }
}
```

### 6.4 Form Collapse Pattern Print Davranışı

Print'te form collapsed durumda olsa bile form alanları gösterilmeli, collapsed bar gizlenmelidir:

```css
@media print {
  /* Form her zaman açık göster */
  #form-body { display: block !important; }
  .form-collapsed-bar { display: none !important; }
  /* Form persist row gizle */
  #form-persist-row { display: none !important; }
}
```

### 6.5 WordPress'ten PDF Alma

- **Chrome/Edge:** Yazdır (Ctrl+P) → Hedef: PDF Olarak Kaydet → Kaydet
- **Safari:** Dosya → PDF Olarak Aktar
- WordPress header/footer print'te gizlenir (visibility CSS ile)
- PDF almadan önce sayfayı yenile (WordPress cache temizlendikten sonra)

> **WordPress PDF Eklentisi:** WP-Print gibi eklentiler araç sayfaları için gerekmez. Tarayıcı print yeterlidir.

---

## 7. Dosya Yapısı ve Standartlar — TD-13

### 7.1 Repository Dosya Yapısı

| Dosya | Açıklama | Durum |
|---|---|---|
| `rakip_analiz_panosu.html` | Rakip Analiz Panosu | Aktif |
| `musteri_persona_olusturucu.html` | Müşteri Persona Oluşturucu | Aktif |
| `icerik_takvimi_uretici.html` | İçerik Takvimi Üretici | Aktif |
| `whatsapp_satis_script_uretici.html` | WhatsApp Satış Script Üretici | Aktif |
| `musteri_geri_donus_senaryosu.html` | Müşteri Geri Dönüş Senaryosu | Aktif |
| `reklam_butce_dagitici.html` | Reklam Bütçe Dağıtıcı | Aktif |
| `trend_video_bulucu.html` | Trend Video Bulucu | Aktif |
| `isletme_gorunurluk_skoru.html` | İşletme Görünürlük Skoru | Aktif |
| `ai_visibility_tracker.html` | AI Görünürlük Takipçisi | Aktif |
| `viral_video_uyarlayici.html` | Viral Video Uyarlayıcı | Aktif |
| `chatbot_senaryosu_hazırlayici.html` | Chatbot Senaryo Hazırlayıcı | Aktif |
| `_template.html` | Yeni araç şablonu — copy-paste base | Template |
| `kkb-shared.js` | Paylaşılan JS kütüphanesi | Library |
| `kolay_kobi_test_launcher.html` | Test launcher (local dev) | Dev only |
| `kolay_kobi_gelistirme_rehberi_v3.md` | Bu doküman (TDD) | Docs |
| `kobikolayUygulamalar.md` | İş Gereksinimleri (BRD) | Docs |
| `KURULUM.md` | Teknik Mimari & Kurulum Kılavuzu | Docs |

### 7.2 n8n Workflow Dosyaları (`n8n-workflows/` klasörü)

| Dosya | Araç |
|---|---|
| `kolay-kobi-skor.json` | İşletme Görünürlük Skoru |
| `kolay-kobi-persona.json` | Müşteri Persona Oluşturucu |
| `kolay-kobi-takvim-async.json` | İçerik Takvimi — Job Başlat |
| `kolay-kobi-takvim-worker.json` | İçerik Takvimi — Worker + Durum |
| `kolay-kobi-wa.json` | WhatsApp Satış Script Üretici |
| `kolay-kobi-reklam.json` | Reklam Bütçe Dağıtıcı |
| `kolay-kobi-geri.json` | Müşteri Geri Dönüş Senaryosu |
| `kolay-kobi-rakip.json` | Rakip Analiz Panosu (MiniMax + Gemini) |
| `kolay-kobi-chatbot.json` | Chatbot Senaryo Hazırlayıcı |
| `kolay-kobi-aivisibility.json` | AI Görünürlük Takipçisi |
| `kolay-kobi-viral.json` | Viral Video Uyarlayıcı |
| `kolay-kobi-trend.json` | Trend Video Bulucu (MiniMax + Apify) |

### 7.3 HTML Dosya Yapısı (Standart)

```html
<!-- 1. Meta / Title -->
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Araç Adı | Kolay KOBİ</title>

<!-- 2. CSS (inline <style>) -->
  <style>
    /* Tema değişkenleri */
    /* Layout ve genel stiller */
    /* Araç-spesifik stiller */
    /* @media print { ... } */
  </style>
</head>
<body>
<div class="app">

  <!-- 3a. Header Bar (logo + rate bar) -->
  <div class="header-bar">
    <div class="logo">🤖 Kolay KOBİ</div>
    <div class="rate-bar-wrap">...</div>
  </div>

  <!-- 3b. Form Card (form-collapsed-bar + #form-body) -->
  <div class="form-card" id="form-section">
    <div class="form-collapsed-bar" onclick="expandForm()">...</div>
    <div id="form-body">
      <!-- Form alanları -->
      <!-- #form-persist-row -->
      <!-- .actions (Analizi Başlat butonu) -->
    </div>
  </div>

  <!-- 3c. Loading Section -->
  <div id="loading-section" style="display:none">...</div>

  <!-- 3d. Result Card (sonuçlar) -->
  <div id="results-section" style="display:none">...</div>

  <!-- 3e. CTA Box -->
  <div class="cta-box">...</div>

</div><!-- .app -->

<!-- 4. JavaScript (inline <script>) -->
<script>
  // Sabitler
  // Utility fonksiyonlar (checkRateLimit, saveForm, restoreForm, etc.)
  // UI fonksiyonlar (showLoading, collapseForm, expandForm, etc.)
  // generate() — ana API çağrısı
  // showResults(data) — sonuçları render eder
  // DOMContentLoaded — init
</script>
</body>
</html>
```

### 7.4 Standart JavaScript Fonksiyonları

| Fonksiyon | Açıklama | Durum |
|---|---|---|
| `generate()` | Form validasyon + API çağrısı + showResults() | Araç-spesifik |
| `showResults(data)` | Sonuçları DOM'a render eder | Araç-spesifik |
| `resetForm()` | Formu sıfırlar, localStorage temizler | Standart |
| `checkRateLimit()` | Aylık limit kontrolü | Standart |
| `incrementRateLimit()` | Kullanım sayacını artırır | Standart |
| `updateRateBar()` | Rate bar UI günceller | Standart |
| `saveForm()` | Form alanlarını localStorage'a kaydeder | Standart |
| `restoreForm()` | localStorage'dan form alanlarını geri yükler | Standart |
| `exportFormJSON()` | Form verisini JSON olarak indirir | Standart |
| `importFormJSON(input)` | JSON dosyasından form verisini yükler | Standart |
| `collapseForm()` | .form-card'a is-collapsed class ekler | Standart |
| `expandForm()` | .form-card'dan is-collapsed class kaldırır | Standart |
| `showLoading(v)` | Loading göster/gizle + form gizle/göster + beforeunload | Standart |
| `downloadTxt()` | ~~TXT olarak indirme~~ | **KALDIRILDI** |

---

## 8. Yeni Araç Oluşturma (_template.html) — TD-14

### 8.1 _template.html Kullanımı

`_template.html` dosyası yeni araçlar için tam başlangıç noktasıdır. Tüm standart bileşenler hazır gelir:

- ✅ Rate bar (aylık kullanım çubuğu)
- ✅ Form persist row (Formu Kaydet / Form Yükle / Formu Boşalt)
- ✅ Form collapse/expand pattern
- ✅ Form gizleme (loading sırasında)
- ✅ beforeunload uyarısı
- ✅ Tam print CSS (radio/checkbox fix dahil)
- ✅ CTA kutusu (Ücretsiz Görüşme Ayarla → iletisim)
- ✅ Hata işleme ve yükleme durumu

### 8.2 Yeni Araç — 9 Adım

1. `_template.html`'i kopyala → araç adıyla kaydet (örn. `yeni_arac.html`)
2. Değiştir: `MONTHLY_LIMIT`, `RATE_KEY`, `N8N_WEBHOOK_URL`
3. Form alanlarını `#form-body` içine ekle
4. `generate()` fonksiyonunda form verilerini topla ve webhook'a gönder
5. `showResults(data)` fonksiyonunda sonuçları render et
6. Başlık (`<h1>`), araç adı ve CTA alt metnini özelleştir
7. n8n'de yeni webhook oluştur ve gerçek API key'i ekle
8. WordPress REST API'ye yeni route ekle (functions.php veya proxy PHP)
9. WordPress'e HTML dosyasını yükle; sayfayı test et

### 8.3 kkb-shared.js Kullanımı

`kkb-shared.js` tüm standart fonksiyonları merkezi olarak barındırır:

```html
<!-- HTML'de yükle -->
<script src="/wp-content/uploads/kkb-shared.js"></script>

<script>
  // kkb-shared.js otomatik çalıştırır:
  // - restoreForm()
  // - updateRateBar()

  // Araç-spesifik override (isteğe bağlı):
  window.kkbShared.RATE_KEY = 'rl_yeni_arac_' + new Date().toISOString().slice(0,10);
  window.kkbShared.MONTHLY_LIMIT = 3;
</script>
```

---

## 9. Güvenlik Standartları — TD-15

- **API Key'ler asla commit edilmez.** Dosyalarda her zaman `BURAYA_GERCEK_MINIMAX_API_KEY_YAZ` placeholder'ı kullanılır.
- Gerçek API key'ler n8n workflow içinde ayarlanır (n8n Credentials veya Environment Variable)
- **CORS:** n8n webhook'lar `Access-Control-Allow-Origin: *` ile açıktır; WordPress proxy kullanıldığında same-origin politikası geçerlidir
- **Rate limiting:** Frontend localStorage ile (kolay bypass edilebilir) — güvenlik için n8n'de de rate limit uygulanmalı (IP bazlı, 50 istek/ay)
- **Input sanitization:** n8n'de tüm kullanıcı girdileri temizlenmeli, prompt injection kontrol edilmeli
- **GitHub'a dikkat:** `git log` veya `git diff` çıktılarında gerçek API key görünmediğinden emin olun. Yanlışlıkla commit edildiyse GitHub Secret Scanning uyarısı gelir ve key derhal iptal edilmelidir.

---

## 10. WordPress Entegrasyonu — TD-16

### 10.1 HTML Dosyası Yükleme

1. WP Admin → Media → Dosya Yükle → HTML dosyasını seç
2. Ya da FTP/SFTP ile `/wp-content/uploads/` altına yükle
3. Sayfada `[html_block file="dosya.html"]` shortcode veya Elementor HTML widget kullan
4. **Sayfa şablonu:** Full-width, header/footer gizli (Elementor veya tema seçeneği)

### 10.2 Cache Yönetimi

**Önemli:** HTML dosyası güncellendiğinde WordPress/LiteSpeed Cache temizlenmeden değişiklikler canlı sitede görünmez.

- **Temizleme:** WP Admin → LiteSpeed Cache → Manage → Purge All
- **veya:** WP Admin → Settings → W3 Total Cache → Performance → Purge All
- **Cache Exceptions:** URI Contains: `/webhook/` ve `/wp-json/kolaykobi/v1/` (cache'lenmemeli)

### 10.3 REST API Yapısı (PHP Kodu)

```php
// functions.php veya custom plugin
add_action('rest_api_init', function() {
  $tools = [
    'skor', 'persona', 'takvim', 'takvim-status',
    'wa', 'reklam', 'geri', 'rakip', 'chatbot',
    'aivisibility', 'viral', 'trend'
  ];
  foreach ($tools as $tool) {
    register_rest_route('kolaykobi/v1', '/ai/' . $tool, [
      'methods'  => 'POST',
      'callback' => function($req) use ($tool) {
        $n8n_url = 'https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-' . $tool;
        $response = wp_remote_post($n8n_url, [
          'body'    => json_encode($req->get_json_params()),
          'headers' => ['Content-Type' => 'application/json'],
          'timeout' => 120,
        ]);
        if (is_wp_error($response)) {
          return new WP_Error('n8n_error', $response->get_error_message(), ['status' => 502]);
        }
        return rest_ensure_response(
          json_decode(wp_remote_retrieve_body($response), true)
        );
      },
      'permission_callback' => '__return_true',
    ]);
  }
});
```

### 10.4 REST API Hata Ayıklama

```bash
# REST API erişim testi
curl -X POST https://kolaykobi.com/wp-json/kolaykobi/v1/ai/skor \
  -H "Content-Type: application/json" \
  -d '{"isletme_adi":"Test","sektor":"Perakende"}'

# Beklenen başarılı yanıt
{"success":true,"data":{...}}

# n8n webhook direkt test (WordPress proxy bypass)
curl -X POST https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-skor \
  -H "Content-Type: application/json" \
  -d '{"isletme_adi":"Test","sektor":"Perakende"}'
```

---

## 11. Deployment Kontrol Listesi — TD-17

Yeni araç veya güncelleme deploy ederken bu listeyi takip edin:

- [ ] HTML dosyasında `BURAYA_GERCEK_MINIMAX_API_KEY_YAZ` placeholder'ı var mı? (Gerçek key YOK)
- [ ] n8n webhook oluşturuldu mu? (`/webhook/kolay-kobi-{tool}`)
- [ ] n8n workflow'da gerçek API key ayarlandı mı?
- [ ] n8n `max_completion_tokens: 8000` ayarlandı mı?
- [ ] n8n `onError: continueErrorOutput` ayarlandı mı?
- [ ] n8n Response Transform'da `<think>` bloğu temizleniyor mu?
- [ ] n8n Response Transform'da Türkçe encoding düzeltmesi var mı? (bkz. Bölüm 15)
- [ ] WordPress REST API route'u eklendi mi?
- [ ] HTML dosyası WordPress'e yüklendi mi?
- [ ] WordPress sayfasında shortcode/widget doğru mu?
- [ ] LiteSpeed/W3 Total Cache temizlendi mi?
- [ ] **Rate bar** çalışıyor mu? (RATE_KEY, MONTHLY_LIMIT doğru)
- [ ] **Form gizleme** çalışıyor mu? (AI üretimi sırasında form ekranda görünmüyor)
- [ ] **beforeunload uyarısı** çalışıyor mu? (AI üretimi sırasında sayfa kapatmaya çalışınca uyarı geliyor)
- [ ] **Form collapse/expand** çalışıyor mu? (is-collapsed class)
- [ ] **Formu Kaydet / Form Yükle** çalışıyor mu? (JSON export/import)
- [ ] **Print CSS** test edildi mi? (form görünüyor, radio/checkbox cevapları görünüyor)
- [ ] Accordion bölümleri print'te açık görünüyor mu?
- [ ] **CTA bağlantısı** `kolaykobi.com/iletisim`'e mi yönlendiriyor?
- [ ] CTA metni statik mi? (AI-generated telefon/metin YOK)
- [ ] TXT İndir butonu YOK mu? (KALDIRILDI)
- [ ] Mobil görünüm test edildi mi?
- [ ] API hata durumunda kullanıcıya anlamlı mesaj gösteriliyor mu?

---

## 12. Sık Karşılaşılan Sorunlar

| Sorun | Neden | Çözüm |
|---|---|---|
| Canlı sitede değişiklik görünmüyor | WordPress/LiteSpeed Cache | WP Admin → Cache → Purge All |
| "Yanıt ayrıştırılamadı" hatası | MiniMax yanıtı kesildi veya `<think>` bloğu temizlenmedi | n8n'de think strip + JSON parse try/catch; `max_completion_tokens: 8000` ayarla |
| PDF'te form görünmüyor | Form is-collapsed durumda; #form-body display:none | Print CSS: `#form-body{display:block!important}` ekle |
| PDF'te radio/checkbox cevapları boş | .radio-group parent gizli; child override edemiyor | Parent'ı görünür bırak; `:not(:has(input:checked)){display:none}` kullan |
| PDF'te accordion kapalı | .cat-body display:none (collapsed state) | Print CSS: `.cat-body{display:block!important}` ekle |
| PDF'te WordPress header/footer görünüyor | Print CSS yoktu veya .app selector eksik | `body *{visibility:hidden} .app,.app *{visibility:visible}` |
| Form verisi sayfa yenilenmesinde kayboluyor | `restoreForm()` çağrılmıyor | DOMContentLoaded'da `restoreForm()` + `updateRateBar()` çağır |
| CTA'da yanlış telefon numarası gösteriyor | AI yanıtından ctaText dinamik kullanılıyordu | CTA statik HTML olmalı; AI-generated text kullanma |
| Türkçe karakterler bozuk (`ü` → `眉`) | MiniMax UTF-8 → GBK encoding sorunu | n8n Response Transform'da TR_RESTORE map kullan (bkz. Bölüm 15) |
| Form AI çalışırken ekranda görünüyor | showLoading() form-section'ı gizlemiyor | `fs.style.display = v ? 'none' : ''` ekle |
| Sayfa kapatma uyarısı gelmiyor | beforeunload event eklenmedi | `showLoading(true)` içinde `window._warnBU` pattern ekle |
| Gemini timeout hatası | 30sn timeout Gemini için yetersiz | n8n'de Gemini node timeout'unu 90000ms'e çek |
| `$json.jobId` undefined dönüyor | HTTP Request sonrası `$json` o node'un yanıtına işaret eder | `$('DüğümAdı').item.json.jobId` şeklinde açık referans kullan |

---

## 13. n8n Workflow Şablonu (JSON) — TD-13

Yeni araç için n8n workflow iskelet yapısı:

```json
{
  "name": "Kolay KOBİ - Yeni Araç",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "kolay-kobi-yeni-arac",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Build Request",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Form verilerini al\nconst body = $input.first().json.body;\n\n// MiniMax API isteği oluştur\nreturn [{\n  json: {\n    model: 'MiniMax-M3',\n    max_completion_tokens: 8000,\n    messages: [\n      {\n        role: 'system',\n        content: 'Sen KOBİ danışmanısın. Türkçe yanıt ver. Yanıtını JSON formatında döndür.'\n      },\n      {\n        role: 'user',\n        content: `İşletme: ${body.isletme_adi}\\nSektör: ${body.sektor}`\n      }\n    ]\n  }\n}];"
      }
    },
    {
      "name": "MiniMax API",
      "type": "n8n-nodes-base.httpRequest",
      "onError": "continueErrorOutput",
      "parameters": {
        "method": "POST",
        "url": "https://api.minimax.io/v1/chat/completions",
        "headers": {
          "Authorization": "Bearer BURAYA_GERCEK_MINIMAX_API_KEY_YAZ",
          "Content-Type": "application/json"
        },
        "body": "={{ $json }}",
        "options": {
          "timeout": 60000
        }
      }
    },
    {
      "name": "Response Transform",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const raw = $input.first().json;\nif (!raw.choices) {\n  return [{ json: { success: false, error: 'API yanıt vermedi' } }];\n}\n\nlet content = raw.choices[0].message.content;\n\n// <think> bloğunu temizle\ncontent = content.replace(/<think>[\\s\\S]*?<\\/think>/g, '').trim();\n\n// Türkçe encoding düzeltmesi (MiniMax GBK sorunu)\nconst TR_RESTORE = {\n  '\\u7109': '\\u00fc',  // 眉 → ü\n  '\\u8267': '\\u015f',  // 艧 → ş\n  '\\u679a': '\\u00f6',  // 枚 → ö\n  '\\u83bd': '\\u00e7',  // 莽 → ç\n  '\\u8c0b': '\\u0131',  // 谋 → ı\n  '\\u81d2': '\\u011f',  // 臒 → ğ\n  '\\u811f': '\\u00c7',  // 脟 → Ç\n  '\\u813a': '\\u00dc',  // 脺 → Ü\n  '\\u8266': '\\u015e',  // 艦 → Ş\n  '\\u8130': '\\u00d6',  // 脰 → Ö\n  '\\u81d1': '\\u011e',  // 臑 → Ğ\n  '\\u964c': '\\u0130',  // 陌 → İ\n};\nconst TR_KEYS = Object.keys(TR_RESTORE).join('');\nconst TR_RE = new RegExp('[' + TR_KEYS + ']', 'g');\ncontent = content.replace(TR_RE, ch => TR_RESTORE[ch] || ch);\n\n// JSON temizle (markdown code block varsa)\ncontent = content.replace(/^```json\\s*/i, '').replace(/^```\\s*/i, '').replace(/\\s*```$/, '').trim();\n\ntry {\n  const data = JSON.parse(content);\n  return [{ json: { success: true, data } }];\n} catch(e) {\n  return [{ json: { success: false, error: 'Yanıt ayrıştırılamadı', raw: content.slice(0, 500) } }];\n}"
      }
    },
    {
      "name": "Success Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [[ { "node": "Build Request", "type": "main", "index": 0 } ]] },
    "Build Request": { "main": [[ { "node": "MiniMax API", "type": "main", "index": 0 } ]] },
    "MiniMax API": { "main": [[ { "node": "Response Transform", "type": "main", "index": 0 } ]] },
    "Response Transform": { "main": [[ { "node": "Success Response", "type": "main", "index": 0 } ]] }
  }
}
```

---

## 14. Dosya Haritası

```
KitapAITool/
├── HTML Araçlar (11 araç)
│   ├── rakip_analiz_panosu.html
│   ├── musteri_persona_olusturucu.html
│   ├── icerik_takvimi_uretici.html
│   ├── whatsapp_satis_script_uretici.html
│   ├── musteri_geri_donus_senaryosu.html
│   ├── reklam_butce_dagitici.html
│   ├── trend_video_bulucu.html
│   ├── isletme_gorunurluk_skoru.html
│   ├── ai_visibility_tracker.html
│   ├── viral_video_uyarlayici.html
│   └── chatbot_senaryosu_hazırlayici.html
│
├── Şablon ve Kütüphane
│   ├── _template.html              ← yeni araç başlangıç noktası
│   └── kkb-shared.js               ← paylaşılan JS kütüphanesi
│
├── Dev Tools
│   └── kolay_kobi_test_launcher.html
│
├── Dokümantasyon
│   ├── kolay_kobi_gelistirme_rehberi_v3.md   ← BU DOSYA (TDD)
│   ├── kobikolayUygulamalar.md               ← İş Gereksinimleri (BRD)
│   └── KURULUM.md                            ← Teknik Mimari & Kurulum
│
└── n8n-workflows/
    ├── kolay-kobi-skor.json
    ├── kolay-kobi-persona.json
    ├── kolay-kobi-takvim-async.json
    ├── kolay-kobi-takvim-worker.json
    ├── kolay-kobi-wa.json
    ├── kolay-kobi-reklam.json
    ├── kolay-kobi-geri.json
    ├── kolay-kobi-rakip.json
    ├── kolay-kobi-chatbot.json
    ├── kolay-kobi-aivisibility.json
    ├── kolay-kobi-viral.json
    └── kolay-kobi-trend.json
```

---

## 15. MiniMax Türkçe Encoding Düzeltmesi

**TD-15b** — MiniMax API sunucusu, Türkçe karakterleri UTF-8 yerine GB2312 (GBK) ile encode eder. Bu nedenle Türkçe harfler CJK karakterlerine dönüşür. Aşağıdaki map ile düzeltilir:

### Kök Neden

MiniMax sunucusu `Content-Type: application/json; charset=gbk` döner. `ü` gibi bir Türkçe karakter UTF-8'de 2 byte (`0xC3 0xBC`) olarak kodlanır; GBK bu iki byte'ı tek bir CJK karakteri olarak yorumlar.

**Python ile doğrulama:**

```python
# Her Türkçe karakterin GBK karşılığını bulmak için:
tr_chars = 'üşöçığÇÜŞÖĞİ'
for ch in tr_chars:
    gbk_char = ch.encode('utf-8').decode('gbk')
    print(f"'{ch}' → '{gbk_char}' (U+{ord(gbk_char):04X})")
```

### n8n Response Transform — Türkçe Restore Kodu

```javascript
// Türkçe encoding düzeltmesi — CJK → gerçek Türkçe karakter
const TR_RESTORE = {
  '焉': 'ü',  // 眉 → ü
  '艧': 'ş',  // 艧 → ş
  '枚': 'ö',  // 枚 → ö
  '莽': 'ç',  // 莽 → ç
  '谋': 'ı',  // 谋 → ı
  '臒': 'ğ',  // 臒 → ğ
  '脟': 'Ç',  // 脟 → Ç
  '脺': 'Ü',  // 脺 → Ü
  '艦': 'Ş',  // 艦 → Ş
  '脰': 'Ö',  // 脰 → Ö
  '臑': 'Ğ',  // 臑 → Ğ
  '陌': 'İ',  // 陌 → İ
};
const TR_KEYS = Object.keys(TR_RESTORE).join('');
const TR_RE = new RegExp('[' + TR_KEYS + ']', 'g');
text = text.replace(TR_RE, ch => TR_RESTORE[ch] || ch);
```

> **Dikkat:** `Accept-Charset: utf-8` header gönderilmemelidir. Bu header encoding'i daha da bozar.

---

## 16. Sürüm Geçmişi

| Sürüm | Tarih | Değişiklikler |
|---|---|---|
| **v3.1** | 2026-08-07 | Form gizleme (AI üretimi sırasında) tüm araçlara eklendi; beforeunload uyarısı (`window._warnBU` pattern); Gemini timeout 90sn'e çekildi; MiniMax Türkçe encoding düzeltmesi (TR_RESTORE map); Doküman `.md` formatına dönüştürüldü |
| v3.0 | 2026-08-06 | AI Görünürlük Skoru (App 9) eklendi; Form collapse/expand pattern; Formu Kaydet / Form Yükle (.json); Print CSS radio/checkbox fix; Accordion print fix; _template.html ve kkb-shared.js |
| v2.0 | 2026-07-24 | 8 araç tamamlandı; n8n MiniMax-M3 entegrasyonu; WordPress REST API proxy; LocalStorage form kalıcılığı; Rate limiting |
| v1.0 | 2026-06 | İlk MVP — Rakip Analiz Panosu ve temel mimari |

---

*Kolay KOBİ AI Araçları — Teknik Tasarım Dokümanı v3.1 | 2026-08-07 | kolaykobi.com*
