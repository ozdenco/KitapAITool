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

**Çözüm:** `kolay-kobi-takvim.json` yerine `kolay-kobi-takvim-async.json`
import edilmeli. Bu workflow aynı webhook path'ini (`kolay-kobi-takvim`)
POST için kullanır ama HEMEN (1-2sn) bir `job_id` ile döner; AI çağrısını
arka planda yapmaya devam eder ve sonucu kendi hafızasında saklar. Ayrıca
`kolay-kobi-takvim-status` adlı ikinci bir GET webhook'u ekler — tarayıcı
sonucu buradan periyodik olarak (polling) sorgular.

**Import adımları:**
1. n8n → Workflows → mevcut `kolay-kobi-takvim.json`'ı **Deactivate** et
   (aynı webhook path'i iki workflow'da aktif olamaz)
2. `kolay-kobi-takvim-async.json`'ı Import et
3. "MiniMax API" node'unu aç → Authorization header'ına key'i yaz
4. Workflow'u **Activate** et

**WordPress tarafı:** `wordpress-ai-proxy.php` güncellendi — artık iki yeni
REST ucu var:
- `POST /wp-json/kolaykobi/v1/ai/{tool}/start` → n8n'in job-başlatma
  webhook'unu tetikler, `{job_id, status}` döner (kısa timeout, 15sn yeterli)
- `GET /wp-json/kolaykobi/v1/ai/{tool}/status/{job_id}` → n8n'in
  `-status` webhook'undan job durumunu okur

Bu iki yeni fonksiyonu içeren güncel `wordpress-ai-proxy.php`'yi Code
Snippets'e (veya functions.php'ye) yeniden yükleyin — eski senkron uç
(`POST /ai/{tool}`) da geriye dönük uyumluluk için hâlâ duruyor.

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
