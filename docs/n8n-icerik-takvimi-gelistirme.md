# İçerik Takvimi Üretici — Geliştirme Geçmişi Özeti

> **Kaynak**: GitHub `n8n-workflows/TAKVIM_GELISTIRME_GECMISI.md` (WordPress dönemi)  
> **Son güncelleme**: 2026-08-23  
> **Not**: Bu belge WordPress + standalone HTML mimarisini anlatır. KolayKOBİ SaaS'a geçişte
> ne değişti bilgisi için aşağıdaki "SaaS Geçiş Notları" bölümüne bak.

---

## Şu Anki Mimari (v13 — WordPress dönemi)

Sistem asenkron job/polling desenini kullanıyor:
- **İki ayrı n8n workflow**: "Job Başlat" (hızlı) ve "Worker + Durum" (arka planda)
- **Tarayıcı iletişimi**: Kısa `/start` ve `/status` sorguları (uzun HTTP bağlantısı yok)
- **Boyuta duyarlı parçalama**: Maksimum 5 gün/parça; 2 gün/hafta seçimi 2 parçaya bölünüyor
- **Dinamik token limitleri**: "Güvenli aralık" 6000-9000 token, MiniMax teknik önerisine göre
- **Haftalık paylaşım üst sınırı**: 1 gün/hafta (v13'te tekrarlanan kanıtlarla kalıcılaştırıldı)

## Kritik Bulgular

**`dayCount` değişkeni 4 dosyaya yayılmış**: HTML → PHP → Job Başlat → Worker.
Biri eski kalırsa sessizce yanlış davranış ortaya çıkar (hata vermeden).

**Bilinen 3. taraf kısıtlamalar**:
- `kolaykobi.com` CDN (Akamai) ~60–180 sn timeout → asenkron mimari bunu bypass ediyor
- `api.minimax.io` kendi Akamai'si → MiniMax origin yavaşsa 504 hatası alınabiliyor

**2 gün/hafta sorunu**: v11'de başarılı test sonrası v13'te tekrar 6+ dakika / zaman aşımı
göstermiş; haftalık üst sınır kalıcı olarak **1 gün/hafta**'ya indirildi.

## Tespit Edilen 25 Hata ve Düzeltmeleri (özet)

| # | Hata | Düzeltme |
|---|------|----------|
| 1 | Lazy fetch günlük limiti tüketiyordu | Eager preload'a geçildi |
| 2 | `job_id` HTTP düğümü sonrası kayboluyor | Açık referans (`$('Düğüm').item.json.job_id`) |
| 3 | `/status` 304 döndürüp cache kirleniyor | Cache-busting `?_=timestamp` eklendi |
| 4 | Parçalama 3–5× gereksiz MiniMax çağrısı | Tek parça mimarisine geçildi |
| 5 | `"day":SIRA_NO` placeholder kopyalama | `repairPlaceholderDayFields()` eklendi |
| 6 | Özel günler yanlış etiketleniyordu | Tarih-yakınlık kontrolü eklendi |
| … | (detaylar orijinal belgede) | |

## Kalıcı Mimari Kararlar

1. **Senkron → Asenkron geçiş** (v6): 180 sn cURL timeout'u kod tarafında çözülemediği için
2. **İki ayrı workflow** (v6.1): n8n'in "erken yanıt" deseni güvenilir değildi
3. **Tek parça mimarisi** (v7): Gereksiz kredi harcaması sonrası, sekmeler istemci tarafında bölündü
4. **Boyuta duyarlı re-chunking** (v11): MiniMax reasoning modelinde üssel süre artışı

## Uygulamalı Tavsiyeler (n8n genel)

- HTML düzenlemesi sonrası literal `&&` kontrolü (`grep -c '&&'`)
- n8n workflow JSON'ları: `json.tool` ile geçerlilik doğrulaması
- Canlı doğrulama: `curl` ile production endpoint'ine gerçek prompt atıp yanıt incelemek
- Düğüm referansları: Asla implicit çıktı akışına güvenme, her zaman `$('DüğümAdı').item.json.field` kullan

---

## SaaS Geçiş Notları (2026-08-23)

WordPress mimarisinden `.NET 8 + React + Docker` mimarisine geçişte ne değişti:

| Konu | WordPress dönemi | KolayKOBİ SaaS |
|------|-----------------|----------------|
| Timeout nedeni | Akamai CDN (kolaykobi.com) 180 sn | Yok — kendi nginx'imiz, sınır yok |
| Async mimari zorunluluğu | CDN timeout yüzünden | MiniMax ~54 sn sürdüğü için UX gereği |
| Polling aralığı | 7 sn (n8n status webhook tetikleniyor) | 10 sn (frontend `POLL_INTERVAL_MS`) |
| Sonuç kaydetme | n8n kaydetmiyordu | Backend `ExtractAsyncOutput` + DB |
| JSON parse hatası | Yok (PHP daha toleranslı) | `parseAiJson.ts` repair fonksiyonu eklendi |
| Günlük limit | HTML'de hardcoded | DB'de `ToolPurchase.MonthlyLimit` |

**Mevcut durum** (2026-08-23):
- MiniMax gerçek üretimde **~54 saniye** sürüyor (1 kanal, 1 gün/hafta)
- JSON'da eksik virgül hatası bulundu ve `parseAiJson.ts`'de `repairJson()` ile düzeltildi
- Polling 10 sn aralıklı, 15 dk timeout
- Async mimari kalıcı — senkrona geçiş planlanmıyor

**Açık sorular**:
- 2 gün/hafta veya çoklu kanal seçimi ne kadar sürer? (henüz SaaS'ta test edilmedi)
- n8n cloud → self-hosted geçişi yapılırsa workflow JSON'ları aynı kalır
