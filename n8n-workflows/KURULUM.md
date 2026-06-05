# Kolay KOBİ — n8n Kurulum Kılavuzu

n8n adresi: https://n8n.srv1492396.hstgr.cloud

---

## 1. Anthropic API Key'i n8n'e Ekle

n8n → Settings → Environment Variables:
```
ANTHROPIC_API_KEY = sk-ant-...
```

Veya her workflow'da HTTP Request node içinde Header olarak eklenebilir:
`x-api-key: {{ $env.ANTHROPIC_API_KEY }}`

---

## 2. Workflow'ları Import Et

Her uygulama için ayrı JSON dosyası mevcut. n8n'e import adımları:
1. n8n → Workflows → Import from file
2. İlgili JSON'u seç
3. Import et → Activate (toggle'ı aç)

| Dosya | Webhook URL (Aktifleşince) |
|---|---|
| `kolay-kobi-skor.json` | `https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-skor` |
| `kolay-kobi-wa.json` | `https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-wa` |
| `kolay-kobi-persona.json` | `https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-persona` |
| `kolay-kobi-takvim.json` | `https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-takvim` |

---

## 3. Her Uygulama İçin Canlıya Alma Adımları

HTML dosyalarında N8N_PROXY zaten set edildi. **Sıra şöyle işleyecek:**

### Uygulama canlıya hazır mı?
- [ ] n8n'de ilgili workflow import edildi ve **aktif** mi?
- [ ] Postman / tarayıcıdan webhook test edildi mi? (aşağıya bak)
- [ ] HTML dosyası WordPress'e yüklendi mi?

### Webhook Test (Postman veya curl):
```bash
curl -X POST https://n8n.srv1492396.hstgr.cloud/webhook/kolay-kobi-skor \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Merhaba, bu bir test mesajıdır. Sadece JSON olarak {\"test\": true} döndür."}'
```
Başarılı cevap: `{"content": [{"type": "text", "text": "{\"test\": true}"}], ...}`

---

## 4. Geliştirme Moduna Dönmek

HTML dosyasında şu satırı değiştir:
```javascript
// Geliştirme:
const N8N_PROXY = null;
// Production:
// const N8N_PROXY = 'https://n8n.srv1492396.hstgr.cloud/webhook/...';
```

---

## 5. Rate Limit Nasıl Çalışır

- **İstemci tarafı (localStorage):** Anlık geri bildirim, browser bazlı, atlatılabilir
- **Sunucu tarafı (n8n Code node):** IP bazlı, günlük 5 istek, gece sıfırlanır
- Rate limit aşılınca n8n HTTP 429 döner → frontend kullanıcıya açıklayıcı mesaj gösterir

---

## 6. Uygulama Durumu

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
