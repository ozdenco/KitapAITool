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
