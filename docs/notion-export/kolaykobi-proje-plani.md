# 📋 KolayKOBİ — Proje İlerleme Raporu

> **Versiyon:** v2.2 · **Tarih:** 15 Ağustos 2026 · **Gizlilik:** İç Kullanım

---

## ⚠️ TÜBİTAK Başvurusu — Risk Durumu

Başvuru için gerekli akademik koordinasyonu sağlayan Süleyman Bey'den yanıt alınamadı. TÜBİTAK teşvik olmadan ürünü kendi kaynaklarımızla pazara sürmek **birincil plan** haline getirilmiştir. İP4 görevleri "nice to have" statüsüne alınmıştır.

---

## 👥 Görev Dağılımı

| Kişi | Rol | Toplam Görev | Tamamlanan | İlerleme |
|---|---|---|---|---|
| **Özden Çolak** | Teknik SaaS Geliştirme | 34 | 22 | %65 |
| **Sezgin Çolak** | Pazarlama & Büyüme | 53 | — | Başlamadı (20 Ağu) |

### Özden — Kategori Kırılımı

| Kategori | Tamamlanan | Toplam |
|---|---|---|
| İP1 — Temel Altyapı | 8 | 8 |
| İP2 — Araç Migrasyonu | 6 | 6 |
| İP3 — Gelişmiş Özellikler | 4 | 7 |
| Pazarlama Planı — Teknik | 4 | 13 |

---

## 🔧 İş Paketleri

### ✅ İP1 — Temel SaaS Altyapısı (100%)

- [x] Backend: ASP.NET Core 8 + PostgreSQL + Docker Compose
- [x] Kimlik doğrulama: JWT + Google OAuth
- [x] Abonelik sistemi: Ücretsiz / Standart / Premium / Kurumsal
- [x] Ödeme entegrasyonu: PayTR (iframe + callback + test modu)
- [x] Tekil araç satın alımı + otomatik yenileme servisi
- [x] Admin paneli: kullanıcı yönetimi, istatistikler, araç fiyatları
- [x] Nginx proxy, SSL, Hostinger VPS production deploy
- [x] E-posta servisi: SMTP (Brevo) — aktivasyon, şifre sıfırlama, yenileme bildirimleri

### ✅ İP2 — Araç Migrasyonu & Kullanıcı Arayüzü (100%)

- [x] 11 araç WordPress'ten React SaaS platformuna taşındı
- [x] Geçmiş çıktılar sayfası — araç bazlı zengin renderer'lar
- [x] Araç kullanım istatistikleri (admin + kullanıcı)
- [x] Araç bazlı fiyatlandırma, toplu satın alım akışı
- [x] Kullanıcı hesabı sayfaları: profil, abonelik, ödeme geçmişi
- [x] n8n webhook entegrasyonu — tüm araçlar proxy üzerinden çalışıyor

### 🟡 İP3 — Gelişmiş Özellikler (~71%)

- [x] Yenileme bildirimleri e-postası (başarı / hata)
- [x] Admin kullanım raporları
- [x] Ödeme geçmişi — tarih aralığı, araç adları, paket özellikleri
- [x] PDF rapor indirme (araç çıktıları)
- [ ] PayTR production aktivasyonu — test modu kaldırma
- [ ] Referans / affiliate sistemi
- [ ] Kullanıcı geri bildirim widget'ı (NPS tarzı)

### ⭕ İP4 — Akademik Validasyonlar (Nice to Have — Askıda)

- [ ] ~~Kullanıcı araştırması / UX testi (15 KOBİ, 3 sektör)~~
- [ ] ~~Akademik makale taslağı~~
- [ ] ~~TÜBİTAK 1512 BİGG başvurusu~~
- [ ] ~~Akademik danışman koordinasyonu (Süleyman Bey)~~

> 💡 İlk ticari gelir sonrası TÜBİTAK 1507 (SME R&D) değerlendirilebilir.

---

## 🛠️ Özden — Pazarlama Planı Teknik Görevleri

| # | Görev | Son Tarih | Durum |
|---|---|---|---|
| 1 | GA4 + Meta Pixel kurulumu | 20 Ağu 2026 | ✅ Tamamlandı |
| 2 | Brevo e-posta hesabı teknik kurulumu | 20 Ağu 2026 | ✅ Tamamlandı |
| 3 | kolaykobi.com/araclar sayfası yayına | 25 Ağu 2026 | ✅ Tamamlandı |
| 4 | 8 araç için QR kod üret | 25 Ağu 2026 | ✅ Tamamlandı |
| 5 | Brevo hoş geldin e-posta serisi (otomasyon) | 1 Eyl 2026 | ⬜ Bekliyor |
| 6 | Site e-posta form entegrasyonu ve testi | 1 Eyl 2026 | ⬜ Bekliyor |
| 7 | Zoom Starter hesabı aç ve yapılandır | 8 Eyl 2026 | ⬜ Bekliyor |
| 8 | 8 Ekim workshop online kayıt formu | 8 Eyl 2026 | ⬜ Bekliyor |
| 9 | Zoom ses / ekran paylaşım testi | 22 Eyl 2026 | ⬜ Bekliyor |
| 10 | 1. Workshop teknik rihearsal | 6 Eki 2026 | ⬜ Bekliyor |
| 11 | 1. Workshop — katılımcı listesini e-posta sistemine aktar | 8 Eki 2026 | ⬜ Bekliyor |
| 12 | 2. Workshop — katılımcı listesini e-posta sistemine aktar | 5 Kas 2026 | ⬜ Bekliyor |
| 13 | Ödeme sistemi araştır ve kur (İyzico / Shopier) | 10 Kas 2026 | ⬜ Bekliyor |

---

## 📣 İP5 — Pazarlama Planı (Sezgin Çolak)

> **Süre:** 20 Ağustos – 10 Kasım 2026 · **Tempo:** Perşembe & Salı, haftada 2 gün · **Toplam:** 24 adam*gün

### Aşama 1 — Lansman (20 Ağu – 29 Eyl · 12 gün)

#### 🎬 Video Serisi: "60 Saniyede Bir KOBİ Sorunu" (8 video)

| Tarih | Video | Araç |
|---|---|---|
| 27 Ağu | "Müşteriler sizi buluyor mu?" | İşletme Görünürlük Skoru |
| 1 Eyl | "Müşterinizi tanımıyor musunuz?" | Müşteri Persona Oluşturucu |
| 3 Eyl | "30 günlük içerik kafanızı şişirmesin" | İçerik Takvimi Üreticisi |
| 8 Eyl | "Reklam bütçenizi doğru dağıtıyor musunuz?" | Reklam Bütçe Dağıtıcı |
| 10 Eyl | "Kaybettiğiniz müşteriyi geri kazanın" | Geri Dönüş Senaryosu |
| 15 Eyl | "WhatsApp'ta satış yapmayı biliyor musunuz?" | WhatsApp Satış Script Üretici |
| 17 Eyl | "Rakipleriniz ne yapıyor?" | Rakip Analiz Panosu |
| 22 Eyl | "Chatbot kurmanın en kolay yolu" | Chatbot Senaryosu Hazırlayıcı |

#### 📱 Sosyal Medya

- LinkedIn carousel (1–2. Hafta): "Kitabım çıktı" + ürün tanıtımı
- Instagram & TikTok: Araç ekran kaydı klipleri, keşfedilebilirlik

#### 📧 E-posta Hoş Geldin Serisi (Brevo otomasyon)

| Gün | Konu | CTA |
|---|---|---|
| 0 | Hoş geldiniz — En çok işinize yarayacak 3 araç | Araçları aç |
| 3 | İşletme Görünürlük Skorunuzu hesapladınız mı? | Skoru hesapla |
| 7 | Bir KOBİ sahibi nasıl persona çıkardı — örnek | Bağlantı kur |
| 14 | Ücretsiz Workshop'a davet — 8 Ekim | Kayıt ol |
| 21 | Danışmanlık görüşmesi ayarlayalım mı? | Görüşme ayarla |

---

### Aşama 2 — Büyüme (1 Eki – 3 Kas · 10 gün)

#### 🎓 Workshop Programı

| | 1. Workshop | 2. Workshop |
|---|---|---|
| **Tarih** | 8 Ekim 2026 (Perşembe) | 5 Kasım 2026 (Perşembe) |
| **Saat** | 19:00 – 21:00 | 19:00 – 21:00 |
| **Platform** | Zoom (online) | Zoom (online) |
| **Ücret** | Ücretsiz | Ücretsiz + ücretli plan sunumu |
| **Hedef** | 30 katılımcı | 50 katılımcı |

#### 🤝 Ortaklık & Medya

- KOSGEB ve TESK'e workshop teklifi (15 Eyl)
- Basın bülteni → Girişim Haber + Webrazzi (15 Eki)
- 5 podcast'e konuşmacı teklifi (15 Eki)
- Meta reklam A/B testi: ₺250 × 2 versiyon

#### 🔍 SEO Blog

| Tarih | Başlık | Hedef Kelime |
|---|---|---|
| 15 Eki | "KOBİler için 8 ücretsiz yapay zeka aracı" | KOBİ yapay zeka araçları |
| 22 Eki | "WhatsApp'ta satış için hazır script nasıl yazılır?" | WhatsApp satış scripti |
| Kas | "Müşteri persona nedir, nasıl oluşturulur?" | müşteri persona oluşturma |
| Kas | "İşletme görünürlük skoru neden önemli?" | işletme görünürlük skoru |

---

### Aşama 3 — Monetizasyon (5–10 Kas · 2 gün)

#### 💰 SaaS Fiyatlandırma

| Plan | Fiyat | Özellikler |
|---|---|---|
| Ücretsiz | ₺0 | Günde 5 kullanım |
| Starter | ₺149/ay | Tüm araçlar, günde 20 kullanım |
| Pro | ₺299/ay | Sınırsız + export + öncelikli destek |
| Danışmanlık | ₺2.500+ | Araçlarla desteklenen 1:1 strateji |

---

## 📅 12 Haftalık Eylem Takvimi

| Hafta | Tarih | Öncelik | Eylemler |
|---|---|---|---|
| H1 | 20–27 Ağu | 🔴 KRİTİK | Analytics, e-posta altyapısı, sosyal medya profilleri, /araclar sayfası yayına |
| H2 | 27 Ağu–3 Eyl | 🔴 KRİTİK | Kitap duyuru (LinkedIn carousel + Reels), Video 1 & 2 yayınlanır |
| H3 | 3–10 Eyl | 🟠 YÜKSEK | Video 3 & 4; Brevo hoş geldin serisi; e-posta form |
| H4 | 10–17 Eyl | 🟠 YÜKSEK | Video 5 & 6; workshop duyurusu; KOSGEB & TESK e-postası |
| H5–6 | 17 Eyl–1 Eki | 🟡 ORTA | Video 7 & 8 (seri tamam); workshop slaytları; Eylül KPI |
| H7 | 1–8 Eki | 🟠 YÜKSEK | 1. Workshop (30+ kişi hedefi); Meta reklam A/B başlıyor |
| H8–10 | 8–29 Eki | 🟡 ORTA | Workshop takip; basın bülteni & podcast; SEO blog 1 & 2; aylık bülten |
| H11–12 | 29 Eki–12 Kas | 🟡 ORTA | 2. Workshop (5 Kas); ödeme sistemi kurulumu; 3 aylık KPI değerlendirmesi |

---

## 📊 KPI Hedefleri

| Metrik | Eylül Sonu | Ekim Sonu | Kasım Sonu |
|---|---|---|---|
| Arac kullanım sayısı | 500 | 1.500 | 3.000 |
| E-posta listesi | 200 | 500 | 900 |
| LinkedIn takipçi artışı | +300 | +600 | +900 |
| Workshop katılımcısı | — | 30 | 80+ |
| Danışmanlık lead | 10 | 25 | 40 |
| Ücretli kullanıcı | — | — | 10+ |
| Kitap satışı (tahmini) | 80 | 180 | 300 |

---

*Bu plan yaşayan bir belgedir — aylık KPI sonuçlarına göre revize edilmeli.*
