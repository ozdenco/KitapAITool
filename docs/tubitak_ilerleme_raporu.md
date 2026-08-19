# KolayKOBİ SaaS Platformu — Proje İlerleme Raporu

**Tarih:** 15 Ağustos 2026  
**Versiyon:** 2.1  
**Hazırlayan:** Özden Çolak  
**Gizlilik:** İç Kullanım

---

> ⚠️ **TÜBİTAK Başvurusu — Risk Durumu**  
> Başvuru için gerekli akademik koordinasyonu sağlayan Süleyman Bey'den yanıt alınamadı.  
> TÜBİTAK teşvik olmadan ürünü kendi kaynaklarımızla pazara sürmek birincil plan haline getirilmiştir.  
> İP4 (Akademik Validasyonlar) görevleri "nice to have" statüsüne alınmıştır.

---

## İş Paketleri — Güncel Durum

### ✅ İP1 — Temel SaaS Altyapısı (100% Tamamlandı)

- [x] Backend: ASP.NET Core 8 + PostgreSQL + Docker Compose
- [x] Kimlik doğrulama: JWT + Google OAuth
- [x] Abonelik sistemi: Ücretsiz / Standart / Premium / Kurumsal
- [x] Ödeme entegrasyonu: PayTR (iframe + callback + test modu)
- [x] Tekil araç satın alımı + otomatik yenileme servisi
- [x] Admin paneli: kullanıcı yönetimi, istatistikler, araç fiyatları
- [x] Nginx proxy, SSL, Hostinger VPS production deploy
- [x] E-posta servisi: SMTP (Brevo) — aktivasyon, şifre sıfırlama, yenileme bildirimleri

---

### ✅ İP2 — Araç Migrasyonu & Kullanıcı Arayüzü (100% Tamamlandı)

- [x] 11 araç WordPress'ten React SaaS platformuna taşındı
- [x] Geçmiş çıktılar sayfası — araç bazlı zengin renderer'lar
- [x] Araç kullanım istatistikleri (admin + kullanıcı)
- [x] Araç bazlı fiyatlandırma, toplu satın alım akışı
- [x] Kullanıcı hesabı sayfaları: profil, abonelik, ödeme geçmişi
- [x] n8n webhook entegrasyonu — tüm araçlar proxy üzerinden çalışıyor

---

### 🟡 İP3 — Gelişmiş Özellikler & Büyüme Altyapısı (~70% Devam Ediyor)

- [x] Yenileme bildirimleri e-postası (başarı / hata)
- [x] Admin kullanım raporları
- [x] Ödeme geçmişi — tarih aralığı, araç adları, paket özellikleri
- [ ] PayTR production aktivasyonu — test modu kaldırma _(bekliyor)_
- [ ] PDF rapor indirme (araç çıktıları) _(planlandı)_
- [ ] Referans / affiliate sistemi _(planlandı)_
- [ ] Kullanıcı geri bildirim widget'ı (NPS tarzı) _(planlandı)_

---

### ⭕ İP4 — Akademik Validasyonlar (Nice to Have — Askıya Alındı)

> **Karar:** TÜBİTAK teşviği olmadan ilerleme.  
> Akademik koordinasyon için gerekli yanıt alınamadı. TÜBİTAK başvurusu ileriki bir tarihe ertelendi veya tamamen devre dışı bırakılabilir. Ürün kendi finansmanı ile pazara çıkacak; ilk ticari gelir elde edildikten sonra TÜBİTAK 1512 yerine **TÜBİTAK 1507** (SME R&D) başvurusu değerlendirilebilir.

- [ ] Kullanıcı araştırması / UX testi (15 KOBİ, 3 sektör) _(askıda)_
- [ ] Akademik makale taslağı (AI-destekli KOBİ pazarlama) _(askıda)_
- [ ] TÜBİTAK 1512 BİGG başvurusu _(askıda)_
- [ ] Akademik danışman koordinasyonu (Süleyman Bey) _(yanıt bekleniyor)_

---

## İP5 — Pazarlama & Büyüme Planı (20 Ağustos 2026 →)

### Aşama 1 — Lansman (Ağustos – Eylül 2026)

#### 1.2 Sosyal Medya — Lansman İçerikleri (1–2. Hafta)

- **LinkedIn — B2B Ana Kanal**: Ürün tanıtım carousel, "neden yaptım" hikâyesi, KOBİ içgörüleri. Haftalık 3–4 gönderi.
- **Instagram & TikTok — Keşfedilebilirlik**: Kısa form içerik, araç ekran kaydı klipleri, KOBİ hedef kitleye erişim.

#### 1.3 Kısa Video Serileri (2–4. Hafta)

- **Seri 1 — "60 Saniyede Bir KOBİ Sorunu"**: 8 video — her araç için 1 bölüm. Problem → araç → çözüm formatı.
- **Seri 2 — "Kitap Arkası"**: Aylık, düşük prodüksiyon. Perde arkası, geliştirme süreci, kullanıcı hikayeleri.

---

### Aşama 2 — Büyüme (Ekim – Aralık 2026)

#### 2.1 Workshop Programı

- İlk workshop: Online, ücretsiz, Zoom ile **30+ kişi hedefi**.
- "AI ile KOBİ Pazarlaması" teması. Araç tanıtımı + canlı demo + soru-cevap.

#### 2.2 E-posta Pazarlama (Damla Kampanyası)

- Kayıt sonrası 5–7 günlük damla dizisi. Araç tanıtımı, başarı hikayeleri, paket yükseltme CTA.
- Siteye kayıt formu, kurşun mıknatıs (ücretsiz KOBİ rehberi), workshop kayıtları ile liste büyütme.

#### 2.3 Ortaklık & Ekosistem

- KOBİ danışmanları, dijital ajanslar, muhasebe yazılımları ile cross-promotion.
- Hedef: 3 aktif ortaklık H4'te.

---

### Uzun Vadeli Kanallar (Sürekli)

#### 3.2 Kitap–Araç Entegrasyonu (Ek Gelir Kanalı)

- Kitap arka kapağı / QR kodu ile platforma yönlendirme.
- Kitap alıcıları = sıcak lead. İlk ay ücretsiz veya indirimli paket.

#### 3.3 SEO — Uzun Vadeli Organik Trafik

- Her araç için ayrı landing page: "KOBİ için içerik takvimi", "işletme görünürlük analizi" gibi long-tail anahtar kelimeler.
- Blog içerikleri ile destekleme.
- Basın bülteni gönderimi ve podcast pitching: girişimcilik ve KOBİ odaklı medyaya konuk yazar / konuk olma teklifleri.

---

## 12 Haftalık Eylem Takvimi (20 Ağustos →)

| Hafta | Tarih | Öncelik | Eylemler |
|-------|-------|---------|----------|
| H1 | 20–27 Ağu | **KRİTİK** | Analytics kurulumu, e-posta listesi altyapısı, sosyal medya profilleri, `/araclar` landing page yayına |
| H2 | 27 Ağu–3 Eyl | **KRİTİK** | Kitap duyuru içerikleri yayına: LinkedIn carousel + Instagram Reels. PayTR canlıya alma |
| H3 | 3–10 Eyl | YÜKSEK | Video serisi çekimine başla (2 video/hafta hedefi); e-posta listesi formu siteye eklenir |
| H4 | 10–17 Eyl | YÜKSEK | İlk workshop duyurusu; ortaklık görüşmeleri başlar (3 hedef kuruluş) |
| H5–6 | 17 Eyl–1 Eki | ORTA | Video serisi devam; hoş geldin e-posta serisi kurulumu ve A/B testi |
| H7 | 1–8 Eki | YÜKSEK | İlk workshop — online, ücretsiz, Zoom ile **30+ kişi hedefi**; katılımcıları platforma davet |
| H8–10 | 8–29 Eki | ORTA | Workshop geri bildirimleri; ücretli reklam testi (₺500 bütçe ile A/B — LinkedIn + Meta) |
| H11–12 | 29 Eki–12 Kas | ORTA | Basın bülteni gönderimi; podcast pitching; 2. workshop planı; Q4 büyüme hedefleri |

> *Takvim, geliştirme öncelikleri ve ekip kapasitesine göre kaydırılabilir.*
