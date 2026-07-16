# Kolay KOBİ — n8n Kurulum Kılavuzu (MiniMax)

n8n adresi: https://n8n.srv1492396.hstgr.cloud

---

## 1. MiniMax API Key'i n8n'e Ekle

n8n → **Credentials** → **Add Credential** → **Header Auth**:
- Name: `MiniMax API Key`
- Header Name: `Authorization`
- Header Value: `Bearer eyJ...` (MiniMax key'in)

> API key almak için: platform.minimax.io → API Keys → Create Key

Workflow JSON'larında key şu şekilde çağrılıyor:
```
Authorization: Bearer {{ $env.MINIMAX_API_KEY }}
```
n8n'de Environment Variables (Enterprise) yoksa, HTTP Request node'unda
credential olarak seçersin — workflow import sonrası node'u düzenle.

---

## 2. Workflow'ları Import Et

| Dosya | Webhook URL | Model |
|---|---|---|
| `kolay-kobi-skor.json` | `.../webhook/kolay-kobi-skor` | MiniMax-M3 |
| `kolay-kobi-wa.json` | `.../webhook/kolay-kobi-wa` | MiniMax-M3 |
| `kolay-kobi-persona.json` | `.../webhook/kolay-kobi-persona` | MiniMax-M3 |
| `kolay-kobi-takvim.json` | `.../webhook/kolay-kobi-takvim` | MiniMax-M3 (4000 token) |

**Import adımları:**
1. n8n → Workflows → Import from file
2. İlgili JSON'u seç → Import et
3. HTTP Request node'unu aç → Authorization header'ına MiniMax key'i yaz
4. Workflow'u **Activate** et (toggle)

---

## 3. MiniMax API Formatı

**Endpoint:** `https://api.minimax.io/v1/chat/completions`

**Request:**
```json
{
  "model": "MiniMax-M3",
  "max_completion_tokens": 1500,
  "messages": [{"role": "user", "content": "..."}]
}
```

**Response (OpenAI formatı):**
```json
{
  "choices": [{"message": {"content": "..."}}]
}
```

n8n workflow'larında "Response Transform" node'u bu formatı
HTML'lerin beklediği Anthropic formatına (`content[0].text`) dönüştürür.

---

## 4. Webhook Test

```bash
curl -X POST https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-skor \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Sadece JSON olarak {\"test\": true} döndür."}'
```

Beklenen cevap:
```json
{"content": [{"type": "text", "text": "{\"test\": true}"}]}
```

---

## 6. Takvim için ASENKRON (job/polling) Kurulum — Akamai Gateway Timeout Çözümü

**Neden gerekli:** kolaykobi.com Akamai/CDN arkasında; Akamai kendi gateway
timeout'unu (gözlemlenen ~60-120sn civarı) uyguluyor ve bu, WordPress veya
n8n tarafında ayarlanan timeout değerlerinden TAMAMEN BAĞIMSIZ. Takvim
aracında MiniMax'ın büyük parçalarda 3-4dk sürebilen üretimi, tek bir
senkron (bekle-ve-dön) istekte bu gateway timeout'una takılıp
"Gateway timed out" / "Takvim oluşturulamadı" hatası veriyordu.

**İKİ AYRI WORKFLOW gerekiyor** (v1'deki tek-workflow "erken yanıt ver +
arka planda devam et" tasarımı canlıda başarısız oldu — muhtemelen n8n'in
Hostinger'daki reverse proxy'si bu erken yanıtı tüm execution bitene kadar
buffer'lıyor, yani tarayıcıya/WordPress'e hiç ulaşmıyordu; execution log'da
tek bir 4dk'lık çalıştırma görülüyordu, WordPress ise kendi 15sn'lik
timeout'unda vazgeçip hata veriyordu). Bu yüzden mimari, ERKEN-YANIT
TRIGİĞİNE hiç bağımlı olmayacak şekilde ikiye bölündü:

- **`kolay-kobi-takvim-async.json` ("Job Başlat")** — tarayıcının/WordPress'in
  konuştuğu tek workflow. Rate-limit kontrolü yapar, job_id üretir, Worker
  workflow'unu **fire-and-forget** (5sn kısa timeout, sonucunu beklemeden)
  tetikler, ve normal/senkron şekilde `{job_id, status:'pending'}` döner.
  Bu workflow'un TAMAMI birkaç saniye içinde biter — "erken yanıt" numarasına
  hiç ihtiyaç duymaz, dolayısıyla proxy buffering sorunu ondan tamamen bağımsızdır.
- **`kolay-kobi-takvim-worker.json` ("Worker + Durum")** — AI çağrısını
  gerçekten yapan ve `kolay-kobi-takvim-status` (GET) polling ucunu barındıran
  workflow. Job Başlat'tan gelen tetikleme isteği zaman aşımına uğrasa/
  koparsa bile, n8n isteği ALDIĞI an bu workflow'un execution'ı başlar ve
  bağımsız şekilde tamamlanana kadar (AI çağrısı dahil) çalışmaya devam eder.

**DÜZELTİLEN BAŞKA BİR HATA (v2, canlı testte bulundu):** İlk versiyonda
"Respond With Job ID" düğümü `$json.jobId` ifadesini kullanıyordu — ama
ondan hemen önceki "Trigger Worker" bir HTTP çağrısı olduğu için `$json`
artık Worker'ın ack yanıtına işaret ediyordu, `Generate Job`'ın ürettiği
jobId'ye değil. Sonuç: `job_id` alanı yanıttan sessizce düşüyordu
(`JSON.stringify` `undefined` alanları atar), tarayıcı da anında
"Takvim oluşturulamadı" hatası veriyordu. AYNI hata deseni Worker
workflow'unda da vardı ("Response Transform" ve "Save Job Error" düğümleri
`MiniMax API`'nin YANITINDAN jobId okumaya çalışıyordu, ama o yanıt da
kendi HTTP gövdesiyle jobId'yi eziyordu — bu, sonucun `staticData.jobs`'a
YANLIŞ anahtarla [`undefined`] yazılmasına yol açardı). Düzeltme: her
ikisinde de jobId artık `$('Düğüm Adı').item.json.jobId` şeklinde AÇIKÇA
isimlendirilmiş bir düğüm referansından okunuyor — n8n'de bir HTTP Request
düğümünden sonra girdi alanlarının otomatik taşınmadığını unutmayın, her
zaman `$('NodeName').item.json...` kullanın. **Bu düzeltmeyi içeren
JSON'ları yeniden import etmeniz gerekiyor** (eski import'ları güncellemek
için: workflow'u açıp ilgili düğümleri elle düzeltebilir VEYA JSON'u
yeniden import edip node ID'lerinin eşleştiğinden emin olun).

**Import adımları:**
1. n8n → Workflows → mevcut `kolay-kobi-takvim.json`'ı **Deactivate** et
   (aynı webhook path'i iki workflow'da aktif olamaz)
2. `kolay-kobi-takvim-async.json`'ı ("Job Başlat") Import et → Activate et
3. `kolay-kobi-takvim-worker.json`'ı ("Worker + Durum") Import et →
   "MiniMax API" node'unu aç → Authorization header'ına key'i yaz → Activate et
4. Her iki workflow da AYNI ANDA aktif olmalı (birbirini tetikliyorlar)

**DÜZELTİLEN 3. HATA (v3, canlı testte bulundu — LiteSpeed Cache):**
Tarayıcı DevTools Network sekmesinde, `/status/{job_id}` sorgularının
İLKİ `200`, sonrakiler ise hepsi `304 Not Modified` dönüyordu — yani
WordPress'in LiteSpeed Cache eklentisi bu GET ucunu önbelleğe alıyor,
2. ve sonraki sorgular n8n'e HİÇ gitmeden ilk yanıtı (o an "not_found"
veya "pending" ise onu) tekrar tekrar döndürüyordu. Sonuç: durum asla
"completed"a geçemiyor, tarayıcı sonunda "İşlem sunucuda bulunamadı"
hatası veriyordu.

İki katmanlı düzeltme yapıldı:
1. `wordpress-ai-proxy.php`'de `kolaykobi_ai_job_status()` artık
   `nocache_headers()` + açık `Cache-Control: no-store` header'ları
   gönderiyor.
2. `icerik_takvimi_uretici.html`'de her `/status` sorgusuna benzersiz bir
   zaman damgası (`?_=timestamp`) ekleniyor ve `cache: 'no-store'`
   kullanılıyor — bu, URL'yi her seferinde farklı kıldığı için LiteSpeed
   dahil HERHANGİ bir URL-tabanlı önbellekleme katmanını tamamen atlatır
   (WordPress panelinde ayrı bir ayar yapmanıza GEREK KALMADAN).

Ek güvence isterseniz (opsiyonel): LiteSpeed Cache eklentisi ayarlarından
(**LiteSpeed Cache → Cache → Excludes** veya **Advanced**) `/wp-json/kolaykobi/v1/*`
için bir "Do Not Cache" kuralı ekleyebilirsiniz — ama yukarıdaki
cache-busting sorgu parametresi sayesinde bu artık ZORUNLU değil.

**Test (her iki workflow da aktifken):**
```bash
# 1) Job başlat — birkaç SANİYE içinde dönmeli (job_id ile)
curl -X POST https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-takvim \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Sadece JSON olarak {\"test\": true} döndür."}'
# → {"job_id":"...", "status":"pending"}   (HIZLI dönmeli, 1-2sn)

# 2) Durumu sorgula (job_id'yi yukarıdan al) — birkaç saniye sonra 'pending',
#    AI bitince 'completed' görmelisiniz
curl "https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-takvim-status?jobId=JOB_ID_BURAYA"
```
Eğer adım 1 hâlâ dakikalarca sürüyorsa, sorun WordPress/tarayıcı katmanında
değil — n8n'in kendisinde (Worker workflow'u aktif değil veya Trigger Worker
çağrısı n8n içinde bir sebeple bloklanıyor) demektir.

**WordPress tarafı:** `wordpress-ai-proxy.php`'de değişiklik GEREKMİYOR —
`/ai/{tool}/start` ve `/ai/{tool}/status/{job_id}` uçları zaten aynı webhook
path adlarını (`kolay-kobi-takvim`, `kolay-kobi-takvim-status`) hedefliyor,
bu adlar iki workflow'a bölünse de değişmedi.

**HTML tarafı:** `icerik_takvimi_uretici.html` artık `/start` + `/status`
polling akışını kullanıyor (`fetchJsonAsyncJob`, 4sn'de bir sorgular, en
fazla 6dk bekler). Diğer 7 araç henüz senkron kalmaya devam ediyor — aynı
Akamai timeout sorunu onlarda da yaşanırsa aynı deseni (ayrı bir
`-async.json` workflow + aynı proxy uçları) uygulamak yeterli.

**Test:**
```bash
# 1) Job başlat
curl -X POST https://kolaykobi.com/wp-json/kolaykobi/v1/ai/takvim/start \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Sadece JSON olarak {\"test\": true} döndür."}'
# → {"job_id":"...", "status":"pending"}

# 2) Durumu sorgula (job_id'yi yukarıdan al)
curl https://kolaykobi.com/wp-json/kolaykobi/v1/ai/takvim/status/JOB_ID_BURAYA
# → {"status":"pending"} veya {"status":"completed","result":{...}}
```

---

## 5. Uygulama Durumu

| # | Uygulama | Workflow | HTML | Canlı |
|---|---|---|---|---|
| 1 | İşletme Görünürlük Skoru | kolay-kobi-skor.json | ✅ hazır | ⏳ |
| 2 | Müşteri Persona Oluşturucu | kolay-kobi-persona.json | ✅ hazır | ⏳ |
| 3 | 30 Günlük İçerik Takvimi | kolay-kobi-takvim.json | ✅ hazır | ⏳ |
| 6 | WhatsApp Satış Script Üretici | kolay-kobi-wa.json | ✅ hazır | ⏳ |
| 4 | Reklam Bütçe Dağıtıcı | — | ❌ kodlanmadı | ⏳ |
| 5 | Müşteri Geri Dönüş Senaryosu | — | ❌ kodlanmadı | ⏳ |
| 7 | Rakip Analiz Panosu | — | ❌ kodlanmadı | ⏳ |
| 8 | Chatbot Senaryosu Hazırlayıcı | — | ❌ kodlanmadı | ⏳ |
