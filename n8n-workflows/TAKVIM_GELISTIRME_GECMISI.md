# İçerik Takvimi Üretici — Geliştirme Geçmişi, Denemeler ve Kök Neden Analizi

Bu doküman, "30 Günlük İçerik Takvimi" aracının (icerik_takvimi_uretici.html +
n8n workflow'ları + wordpress-ai-proxy.php) geliştirme sürecinde yapılan TÜM
mimari denemeleri, neden başarısız olduklarını (somut kanıtlarla), bulunan
hataları ve düzeltmelerini, ve şu anki (2026-07-16 itibarıyla) nihai durumu
kronolojik olarak belgeler.

**Amaç:** Bu araç ileride satışa/canlıya çıkarılmak istendiğinde, ya da yeni
biri (insan veya AI) üzerinde çalışmaya başladığında, "neden böyle yapıldı"
sorularına baştan deney yapmadan cevap bulunabilsin.

---

## TL;DR — Şu anki durum (2026-07-16 sonu itibarıyla)

- **Mimari:** Asenkron job/polling (2 ayrı n8n workflow'u: "Job Başlat" +
  "Worker + Durum"). Tarayıcı kısa `/start` + kısa `/status` sorgularıyla
  çalışır, tek bir uzun HTTP isteğine hiç bağımlı değildir.
- **Parçalama (chunking) YOK** — 30 günün tamamı TEK bir MiniMax çağrısında
  isteniyor. Görüntüleme hâlâ 5 haftalık sekmeye bölünüyor ama bu saf
  istemci-tarafı bölme, ek AI çağrısı yok.
- **`max_completion_tokens` dinamik** — isteğin gerçek gün sayısına
  (`dayCount`) göre hesaplanıyor: `Math.min(20000, Math.max(6000, 2500 +
  dayCount*1800))`.
- **Haftalık paylaşım günü üst sınırı: 1 gün** (önceden 2'ydi — 2 günün
  35+ dakika sürüp 185 kredi tükettiği canlı testte görüldü, geri 1'e
  düşürüldü — bkz. "Deneme 9" aşağıda).
- **Bilinen, kod tarafında ÇÖZÜLEMEYEN kısıtlamalar** (3. taraf altyapı):
  - kolaykobi.com Akamai/CDN arkasında (~60-120sn gateway timeout) — ASENKRON mimari bunu bypass eder.
  - `api.minimax.io` (MiniMax'ın kendi API'si) DA Akamai arkasında — MiniMax'ın kendi origin sunucusu yavaşsa Akamai onu da 504'ler. Kod tarafında sadece retry ile mitigasyon yapılabiliyor, kalıcı çözüm MiniMax destek/altyapı meselesi.
- **Diğer 7 araç** (whatsapp, persona, chatbot, geri-dönüş, rakip, bütçe,
  görünürlük skoru) hâlâ ESKİ senkron mimaride — bu dokümandaki sorunların
  hiçbiri onları etkilemedi, çünkü onlar hiç bu ölçekte (30 günlük, çok
  parçalı) içerik üretmiyorlar. Aynı Akamai/timeout sorunu onlarda
  yaşanırsa aynı asenkron deseni uygulamak gerekir.

---

## Mimari Evrimi — Kronolojik Sıra

### v0: Orijinal senkron mimari (proje başlangıcı)
Tarayıcı → WordPress proxy → n8n → MiniMax, TEK senkron istek, tüm 30 gün
tek promptta. `max_completion_tokens: 24000`.

**Neden değiştirildi:** Prompt kampanya sayısı arttıkça (çok sayıda özel
gün/kampanya) yanıt süresi uzuyor, bazı denemelerde WordPress'in
`wp_remote_post` timeout'una (o zamanki ayar) takılıyordu.

### v1: Lazy (istek-üzerine) haftalık parçalama, sekmeye tıklayınca fetch
30 gün 5 haftalık parçaya bölündü, her sekmeye TIKLANDIĞINDA o haftanın
AI isteği atılıyordu.

**FAIL — kanıt:** Kullanıcı raporu: "İlk haftayı çıkardı. 2. haftaya
geldiğim an günlük limitiniz sonlandı dedi." Sekmeye tıklamak günlük
kullanım hakkını (`DAILY_LIMIT`) harcıyordu — kullanıcı 5 haftayı görmeden
limiti tüketiyordu.

### v2: Eager (önceden yükleme) haftalık parçalama
`generate()` tüm 5 haftalık parçayı SIRAYLA (`for...await`) önceden
yüklüyor, sekmeler salt gösterim (tıklamak yeni istek atmıyor).

**Sorun değil, ama kanıtlanan bir gerçek üzerine bir sonraki adımda
gereksiz yere terk edildi** (bkz. v3).

### v3: Tek 30 günlük istek (v2'den geri dönüş denemesi)
Kullanıcı, n8n execution loglarında 5 ardışık tek-istek çalıştırmanın
45sn-1dk16sn'de başarıyla tamamlandığını gösteren kanıt sundu (10-11
Temmuz tarihli). Bu kanıta dayanarak mimari tekrar TEK 30 günlük isteğe
döndürüldü.

**FAIL — kanıt (kesin, tekrarlanabilir):** Canlı curl testi 3dk2sn sonra
`HTTP 502` ve gövde:
```json
{"error":"cURL error 28: Operation timed out after 180000 milliseconds with 0 bytes received"}
```
**Kök neden:** kolaykobi.com'un önündeki hosting/WAF katmanı (o zaman
Akamai olduğu henüz bilinmiyordu, sadece "180sn cURL tavanı" olarak
biliniyordu), `wp_remote_post`'a verilen 320sn timeout'tan TAMAMEN
BAĞIMSIZ olarak 180000ms'de kesiyor. Bu, kod tarafında değiştirilemeyen
bir sunucu/CDN seviyesi limit.

**Geri dönüldü:** v2'ye (eager haftalık parçalama, 5 parça).

### v4: Dinamik parça boyutlandırma (asymmetric workload düzeltmesi)
**FAIL kanıtı:** 2 gün/hafta seçiminde sabit 7 günlük (haftalık) parçalar,
1 gün/hafta'ya göre parça başına 2 KAT paylaşım günü (iş yükü) demekti.
Canlı test: "haftada 1 gün seçim sonucunu 3,5 dk'da getirdi. 2 gün
seçtiğimde 'Takvim oluşturulamadı...' hatası verdi, workflow 18 dk sürdü."

**Düzeltme:** `computeChunkGroups` parça başına SABİT ~3 paylaşım günü
hedefleyecek şekilde dinamikleştirildi (parça sayısı/aralığı
`weekdayCount`'a göre hesaplanıyor).

### v5: MiniMax (kullanıcı tarafından paylaşılan) dosya incelemesi + entegrasyon
Kullanıcı, MiniMax ile çalışıp düzenlettiği bir dosya paylaştı. İncelendi,
değerli kısımları alındı:
- `CLIENT_TIMEOUT_MS` + `AbortController` (90sn, sonra canlı kanıtla 150sn'ye çıkarıldı — 3 günlük bir parçanın normalde 120sn sürebildiği görüldü, 90sn bu meşru süreyi keserdi).
- `dayCardHtml()` dedup, `renderDays()` tek `innerHTML` ataması (30 reflow → 1), `printFullCalendar()` cache.
- Bulunan hata: kaynak dosyada literal `&&` vardı (WordPress'te script'i bozar) — porta ederken düzeltildi.
- Bulunan hata: dosyada `</html>` sonrası ikinci bir `<script>` bloğu vardı (bozuk HTML yapısı) — bu session'ın ÖNCEKİ bir turunda (kayıt dışı) atlanmış, MiniMax bir sonraki turda tekrar tespit etti, birleştirilip düzeltildi.

### v6: ASENKRON JOB/POLLING mimarisine geçiş (kalıcı çözüm denemesi)
**Tetikleyen kanıt:** n8n execution 4dk 13sn'de tamamlandı ama WordPress
15-20sn'de "Takvim oluşturulamadı" hatası verdi. Bu, WordPress'in kendi
kısa timeout'unda vazgeçtiğini, ama n8n'in arka planda çalışmaya devam
ettiğini gösterdi — senkron mimarinin temel sınırı: TEK istek, ne kadar
uzun sürerse sürsün, tarayıcı/WordPress'in sabrından uzun olamaz.

**MiniMax'ın önerdiği çözüm (Seçenek C):** Asenkron job mimarisi.
WordPress endpoint'i n8n'i tetikler, hemen `job_id` döner; n8n arka planda
çalışır; tarayıcı periyodik olarak durum sorgular (polling).

**İlk implementasyon (TEK n8n workflow'unda "erken yanıt ver, sonra arka
planda devam et" — `Respond to Webhook` düğümü ortada, sonrasında da
düğümler çalışmaya devam ediyor):**

**FAIL — kanıt:** n8n execution log'unda "Kolay KOBİ - 30 Gün İçerik
Takvimi - Asyn" workflow'u 144 saniyede tamamlandı olarak görünüyordu, ama
WordPress ANINDA hata verdi. Düğüm bazlı inceleme: `Trigger Worker: Success
in 113ms`, `Respond With Job ID: Success in 1ms` — yani düğümlerin TOPLAM
aktif süresi <150ms'ydi, ama workflow'un TAMAMI 144sn görünüyordu. Bu,
gecikmenin execution BAŞLAMADAN ÖNCE (kuyrukta) olduğunu düşündürdü.

**Kök neden (asıl bulunan, curl ile doğrulanan):** `curl -i` ile `/start`
ucunun GERÇEK yanıtı incelendi: `{"status":"pending"}` — **`job_id` alanı
YOKTU**. Sebep: n8n'de bir düğümün çıktısı (`$json`), SADECE kendisinden
ÖNCEKİ düğümün çıktısına işaret eder. `Respond With Job ID` düğümü
`$json.jobId` kullanıyordu, ama hemen öncesinde bir HTTP çağrısı (`Trigger
Worker`) vardı — bu düğümün çıktısı KENDİ yanıt gövdesiydi, `Generate
Job`'ın ürettiği `jobId`'yi taşımıyordu. `JSON.stringify({job_id:
undefined, ...})` da `undefined` alanları sessizce düşürüyordu. Tarayıcı
`job_id` olmadan anında `JOB_START_FAILED` hatası fırlatıyordu.

**AYNI hata deseni** Worker workflow'unda da vardı (`Response Transform` ve
`Save Job Error`, `MiniMax API`'nin — bir HTTP Request düğümünün —
yanıtından `jobId` okumaya çalışıyordu). Bulunmasaydı, ilk hata düzeltilse
bile sonuç asla doğru `job_id` altında kaydedilmeyecekti.

**Düzeltme:** Her üç düğümde de `$('Düğüm Adı').item.json.jobId` şeklinde
AÇIKÇA isimlendirilmiş düğüm referansı kullanıldı.

### v6.1: İki ayrı n8n workflow'una bölme
Job_id düzeltmesi sonrası bile, canlı testte AYNI "erken yanıt + arka
planda devam et" numarası GÜVENİLİR ÇALIŞMADI (muhtemelen n8n'in
Hostinger'daki reverse proxy'si erken yanıtı execution bitene kadar
buffer'lıyordu). Mimari, erken-yanıt trigine hiç bağımlı olmayacak şekilde
İKİYE bölündü:
- **`kolay-kobi-takvim-async.json` ("Job Başlat")**: rate-limit + job_id
  üretimi + Worker'ı fire-and-forget (5sn kısa timeout, sonucu
  beklemeden) tetikleme + normal SENKRON `{job_id, status}` yanıtı. Tüm
  workflow birkaç saniyede biter.
- **`kolay-kobi-takvim-worker.json` ("Worker + Durum")**: asıl AI
  çağrısını yapan ve `/status` polling ucunu barındıran workflow.

### v6.2: LiteSpeed Cache'in polling'i önbelleğe alması
**FAIL — kanıt:** DevTools Network sekmesi: `/status/{job_id}` sorgularının
İLKİ `200`, SONRAKİLERİN HEPSİ `304 Not Modified`. WordPress'in LiteSpeed
Cache eklentisi bu GET ucunu önbelleğe alıyordu — 2. ve sonraki sorgular
n8n'e hiç gitmeden ilk yanıtı tekrar tekrar döndürüyordu, durum asla
değişmiyordu.

**Düzeltme:** Her `/status` sorgusuna benzersiz zaman damgası (`?_=`) +
`cache:'no-store'` eklendi (URL her seferinde farklı → önbellekten
tamamen bağımsız). PHP tarafında da `nocache_headers()` eklendi (ek
güvence).

### v6.3: "not_found" toleransı yetersiz
304 sorunu çözüldükten sonra bile bazı job'lar `not_found` dönmeye devam
etti (muhtemelen n8n'in eşzamanlı execution sınırına takılan bir önceki
işlemin, yeni job'un "pending" kaydını yazmasını geciktirmesi). İlk
düzeltme (5 ardışık `not_found`'a tolerans, sonra hata ver) yetersiz
kaldı — canlıda hâlâ erken hata alınıyordu.

**Düzeltme:** `not_found`, ayrı bir sayaç/eşik olmadan `pending` ile
TAMAMEN AYNI ele alınacak şekilde basitleştirildi — tek üst sınır genel
`POLL_TIMEOUT_MS` (6dk).

### v6.4: MiniMax'ın KENDİ Akamai sorunu (kod dışı, 3. taraf)
**FAIL — kanıt:** `/status` sorgusu şunu döndürdü:
```json
{"status":"error","error":"504 - ... errors.edgesuite.net ..."}
```
`errors.edgesuite.net` Akamai'nin hata sayfası domaini — yani
`api.minimax.io` (MiniMax'ın KENDİ API'si) DA Akamai arkasında, ve
MiniMax'ın origin sunucusu yavaş yanıt verince Akamai KENDİ gateway
timeout'unu uyguluyor. Bu, kolaykobi.com'un önündeki Akamai'den TAMAMEN
AYRI, bizim kod tarafımızdan kontrol EDİLEMEYEN bir sorun.

**Mitigasyon (kalıcı çözüm değil):** `MiniMax API` düğümüne
`retryOnFail: true, maxTries: 3, waitBetweenTries: 3000` eklendi.

### v7: Parçalamanın (chunking) TAMAMEN kaldırılması — kredi krizi
**FAIL — kanıt (kredi takibi):** Sabah 3800 kredi → birkaç saatlik test
sonrası ~1200 kredi. Tek bir "Oluştur" tıklaması ~250 kredi harcıyordu.

**Kök neden:** `computeChunkGroups` 30 günü weekdayCount'a göre 1-5
parçaya bölüyordu, HER PARÇA AYRI BİR MiniMax çağrısı demekti (2 gün/hafta
→ 3 parça → 3 kat kredi). Bu parçalamanın ORİJİNAL gerekçesi
(kolaykobi.com önündeki Akamai timeout'u) v6'daki asenkron mimariyle
ARTIK GEÇERSİZDİ — parçalama sadece gereksiz kredi harcıyordu.

**Düzeltme:** `computeChunkGroups` her zaman TEK grup döner (tüm 30 gün,
TEK MiniMax çağrısı). `computeViewTabs` fetch'ten TAMAMEN BAĞIMSIZ hale
getirildi (5 haftalık gösterim sekmesi kalmaya devam etti, ama hepsi aynı
tek fetch sonucunu istemci tarafında bölerek gösteriyor — ek maliyet yok).

### v7.1: "day":SIRA_NO placeholder kopyalama hatası
**FAIL — kanıt:** Konsol hatası: `SyntaxError: Unexpected token 'S', ...
"day": SIRA_NO,`. Model, şemadaki soyut yer tutucuyu ("SIRA_NO") gerçek
bir sayıyla değiştirmek yerine olduğu gibi kopyalamış — JSON bozuldu, 203
kredilik üretim TAMAMEN boşa gitti.

**İki katmanlı düzeltme:**
1. Önleme: şema artık soyut "SIRA_NO" yerine bu isteğin GERÇEK ilk Sıra
   No'sunu somut örnek olarak gösteriyor (`"day":6`), + "asla yer tutucu
   yazma" talimatı.
2. Kurtarma: `repairPlaceholderDayFields()` — JSON.parse başarısız olursa,
   "day" alanlarının dizideki sırasını takip ederek sayısal olmayan
   değerleri doğru gerçek Sıra No ile değiştirip yeniden dener. Başarılı
   olursa PAHALI bir yeniden üretime gerek kalmadan mevcut (ödenmiş) yanıt
   kurtarılır.

### v7.2: `max_completion_tokens` — sabit tahmin tartışması
MiniMax önce `24000`'i (hiç düşürülmemiş) fark etti, `6000`'e indirdi.
Ben bunu `16000`'e çıkardım (6000'in 3 günlük bir parça için bile sınırda
olduğunu gösteren kanıt vardı — 3 günlük bir yanıt 25026 karakter/~6250
token'dı). MiniMax sonra `8000`'i önerdi (`1000 + gün×350` formülüyle),
ben bunu REDDETTİM çünkü gerçek ölçümle (gün başına ~2083 token) matematik
tutmuyordu — bu formülle neredeyse HER istek kesilirdi (truncate).

**Nihai çözüm (kabul edilen):** Sabit bir tahmin yerine DİNAMİK hesaplama.
`dayCount` (gerçek gün sayısı) HTML → WordPress proxy → n8n Job Başlat →
n8n Worker zincirinde taşınıyor, Worker'ın "Build Request Body" düğümü
`Math.min(20000, Math.max(6000, 2500 + dayCount*1800))` formülüyle bir
tavan hesaplıyor.

**Gerekçe:** MiniMax faturalaması GERÇEKTE üretilen token sayısına göre
yapılıyor, cap'in kendisi maliyeti artırmaz — cap'i ihtiyaçtan düşük
tutmanın (kesilme = tam kayıp) riski, yüksek tutmanın riskinden çok daha
büyük.

### v7.3: Babalar Günü erken kutlama hatası
**FAIL — kanıt (PDF çıktısı incelendi):** 6 Mayıs-4 Haziran dönemi, Gün 21
(26 Mayıs) "Babalar Günü yaklaşıyor; 21 Haziran için..." diyordu (doğru),
ama Gün 28 (2 Haziran) "**Babalar Günü kutlu olsun**" diyordu — sanki o
gün bayrammış gibi, oysa gerçek tarih (21 Haziran) dönemin 19 gün DIŞINDA.

**Kök neden:** `resolveCampaigns`'daki `matchedHolidays` ve
`namedDateMatches` döngülerinde stage ataması (`i===0 ? 'gün mesajı' :
'öncesi hatırlatma'`) SADECE dizideki sıraya bakıyordu, seçilen günün
gerçek tarihe ne kadar YAKIN olduğuna bakmıyordu. Dönem gerçek tarihten
önce bitince `findLastNOnOrBefore` dönemdeki EN SON günü döndürüyor, bu
gün haftalarca uzak olsa bile "gün mesajı" (o günmüş gibi) etiketleniyordu.

**Düzeltme:** `isCloseToTarget()` kontrolü eklendi — en yakın eşleşen gün
gerçek tarihe ≤3 gün mesafede değilse, TÜM aşamalar "hazırlık/duyuru"
niteliğinde kalıyor, prompt metni asıl tarihi açıkça belirtiyor.

### v8: 2 gün/hafta'nın 35+ dakika sürmesi — GEÇİCİ olarak 1 güne düşürüldü
**FAIL — kanıt:** Kullanıcı 2 gün/hafta seçimiyle (dayCount~8-9,
dinamik formülle ~18700 token tavanı) test başlattı, 35+ dakika sonra
hâlâ bitmediği için MANUEL olarak iptal etti. Kredi: 4987 → 4802 (185
kredi harcandı, sonuç hiç kullanılamadı).

**Olası nedenler (kesin doğrulanamadı, kullanıcı test öncesi maliyet
riskini almak istemedi):**
1. ~18700 token'lık büyük/karmaşık tek prompt, reasoning modelinin
   orantısız yavaşlamasına yol açmış olabilir.
2. `retryOnFail: 3` — eğer her deneme kendi başına uzun sürüp başarısız
   oluyorsa (MiniMax'ın kendi Akamai 504'ü gibi), 3 deneme × uzun süre =
   35+ dakika, ve HER denemede kısmi kredi tüketimi oluyor olabilir (bu,
   185 kredilik "boşa giden" tüketimi açıklar — tek bir başarılı küçük
   test sadece 13 kredi harcamıştı).

**Sunulan seçenekler (kullanıcıya, karar için):**
- **Seçenek A:** Token tavanını dayCount'tan bağımsız, daha düşük SABİT
  bir üst sınırda (örn. 12000) tut + `retryOnFail`'i 3'ten 1'e düşür. En
  kötü senaryoda süre/maliyeti sınırlar, ama büyük isteklerde JSON kesilme
  riski artar.
- **Seçenek B:** Büyük istekleri (dayCount > ~5) otomatik olarak 2 parçaya
  böl — süre/risk sınırlı kalır, kredi tasarrufu biraz azalır (tek yerine
  2 çağrı) ama eski 3-5 parçalı sisteme göre yine de büyük tasarruf.
  Claude'un ÖNERİSİ buydu (daha öngörülebilir/güvenli).

**Kullanıcının KARARI (ne A ne B — daha basit bir 3. yol):** "Böyle
kalsın. Daha fazla para harcamak istemiyorum. Eğer ürünü almak isteyen
olursa o zaman masraf yaparız. Haftada 1 gün max seçilsin." Yani:
mimariye (dinamik tek-parça sistemine) DOKUNULMADI, bunun yerine haftalık
paylaşım günü ÜST SINIRI 2'den 1'e düşürüldü — bu, `dayCount`'un pratikte
her zaman küçük (~4-5 gün, ~9700 token tavanı) kalmasını garanti eder,
35+ dakikalık büyük istek senaryosunun ORTAYA ÇIKMASINI baştan önler.

**Değiştirilen 3 yer** (`icerik_takvimi_uretici.html`): `enforceWeekdayCap()`
(canlı checkbox sınırı), `generate()`'in form doğrulaması, statik yardım
metni. Hepsi "En fazla 1 gün seçebilirsiniz... Ücretsiz görüşme
ayarlayın..." mesajını gösteriyor.

**Gelecekte 2+ gün/hafta açılmak istenirse:** Yukarıdaki A/B seçenekleri
hâlâ geçerli bir başlangıç noktası — hangisinin seçileceği, o zamanki
maliyet toleransına bağlı.

---

## Tespit Edilen Ve Düzeltilen Tüm Hatalar (Özet Tablo)

| # | Hata | Kanıt | Düzeltme |
|---|---|---|---|
| 1 | Lazy per-tab fetch günlük limiti tüketiyor | Kullanıcı raporu (2. hafta'da limit bitti) | Eager preload, sekmeler salt gösterim |
| 2 | Sabit 7 günlük parça = asimetrik iş yükü | "18 dk sürdü" (2 gün/hafta) | Dinamik parça boyutlandırma (v4) — sonra tamamen kaldırıldı (v7) |
| 3 | Tek 30 günlük istek 180sn cURL tavanına takılıyor | `cURL error 28: ... 180000 milliseconds` | Asenkron job/polling mimarisi (v6) |
| 4 | job_id, HTTP Request düğümü sonrası kayboluyor (3 yerde) | curl: `{"status":"pending"}`, job_id YOK | `$('Düğüm Adı').item.json.jobId` açık referans |
| 5 | "Erken yanıt + arka planda devam" güvenilir çalışmıyor | 144sn execution, ama WordPress 15-20sn'de hata | 2 ayrı n8n workflow'una bölme |
| 6 | LiteSpeed Cache /status polling'i önbelleğe alıyor | DevTools: 200 sonra hep 304 | Cache-busting `?_=timestamp` + `no-store` |
| 7 | "not_found" toleransı (5 deneme) yetersiz | Erken JOB_NOT_FOUND hatası | not_found = pending gibi ele al, tek üst sınır POLL_TIMEOUT_MS |
| 8 | MiniMax'ın KENDİ Akamai 504'ü | `errors.edgesuite.net` | retryOnFail (3. taraf sorunu, kalıcı çözüm değil) |
| 9 | Parçalama = 3-5x gereksiz MiniMax çağrısı | 3800→1200 kredi (birkaç saat) | Tek parça mimarisi |
| 10 | "day":SIRA_NO placeholder kopyalama | `SyntaxError ... "day": SIRA_NO` | Somut örnek + repairPlaceholderDayFields() |
| 11 | max_completion_tokens sabit tahmin (24000/6000/16000/8000 tartışması) | 3 günlük parça ~6250 token kullanmış (ölçüldü) | dayCount'a göre dinamik formül |
| 12 | Gerçek tarihten uzak özel günler "kutlu olsun" deniyor | PDF: "Babalar Günü kutlu olsun" (2 Haz, gerçek tarih 21 Haz) | isCloseToTarget() kontrolü |
| 13 | 2 gün/hafta 35+ dakika + 185 kredi (sonuçsuz) | Kullanıcı manuel iptal, kredi 4987→4802 | Haftalık üst sınır 2→1 |

---

## Kalıcı (Kod Dışı) Kısıtlamalar — Unutulmamalı

1. **kolaykobi.com önündeki Akamai/CDN**, ~60-180sn arası bir gateway
   timeout uyguluyor. Asenkron mimari bunu bypass ediyor (her tekil istek
   kısa), ama eğer ileride tekrar senkron bir uç eklenirse bu sorun geri
   gelir.
2. **api.minimax.io'nun KENDİ Akamai'si**, MiniMax'ın origin sunucusu
   yavaşsa 504 verebiliyor. Bu bizim kontrolümüzde DEĞİL. Tek mitigasyon
   n8n seviyesinde retry. Sık yaşanırsa MiniMax destek ekibiyle görüşülmeli.
3. **n8n'in Hostinger'daki hosting'i**, "erken yanıt ver + arka planda
   devam et" (`Respond to Webhook` ortada) numarasını güvenilir şekilde
   desteklemiyor gibi görünüyor (muhtemelen reverse proxy buffering). Bu
   yüzden iki ayrı workflow deseni tercih edildi — yeni bir async akış
   eklenecekse aynı desen (ayrı trigger + ayrı worker workflow) izlenmeli.
4. **MiniMax kredi/faturalama**: cap'in kendisi (max_completion_tokens)
   maliyeti belirlemiyor, GERÇEKTE üretilen token sayısı belirliyor. Cap'i
   düşürmek "tasarruf" değil, sadece kesilme (ve dolayısıyla tam kayıp)
   riski demek.

---

## Uygulama Genelinde Kalıcı İyileştirme Kalıpları

Bu proje boyunca birkaç kez tekrar kullanılan, gelecekte de faydalı
olacak kalıplar:

- **Her HTML düzenlemesinden sonra:** `grep -c '&&'` = 0 kontrolü
  (WordPress, `<script>` içindeki literal `&&`'i `&#038;&#038;`'ye
  çevirip script'i tamamen bozuyor — `[a,b].every(Boolean)` kalıbı
  kullanılmalı).
- **Her düzenlemeden sonra:** `new Function(scriptContent)` ile
  sözdizimi kontrolü.
- **n8n workflow JSON'ları için:** `python3 -m json.tool` ile geçerlilik
  kontrolü.
- **PHP değişiklikleri için:** `php -l` ile sözdizimi kontrolü.
- **Regresyon test paketi**: `resolveCampaigns`/`computeChunkGroups`/
  `buildCalendarPrompt` fonksiyonları HTML'den çıkarılıp Node.js'te
  `new Function()` ile izole test ediliyor (bkz. session'daki
  `regression.js` — bu dosya repoya dahil değil, session scratchpad'inde;
  ileride kalıcı bir test dosyası olarak repoya eklenmesi faydalı olur).
- **n8n'de bir HTTP Request düğümünden SONRAKİ düğüm**, önceki düğümlerin
  alanlarına ASLA otomatik erişemez — her zaman `$('Düğüm Adı').item.json.field`
  ile açıkça referans verilmeli.
- **Canlı doğrulama metodolojisi**: extractJson/buildCalendarPrompt gibi
  fonksiyonları Node'da çalıştırıp gerçek prompt'u üretmek, sonra
  `curl --max-time N` ile doğrudan production endpoint'ine atıp yanıtı
  incelemek — varsayımla ilerlemek yerine.

---

## Dosya Haritası

| Dosya | Rol |
|---|---|
| `icerik_takvimi_uretici.html` | Tarayıcı tarafı — form, prompt üretimi, asenkron polling, render |
| `wordpress-ai-proxy.php` | WordPress REST proxy — `/ai/{tool}`, `/ai/{tool}/start`, `/ai/{tool}/status/{job_id}` |
| `n8n-workflows/kolay-kobi-takvim.json` | ESKİ senkron workflow (deaktif, referans için tutuluyor) |
| `n8n-workflows/kolay-kobi-takvim-async.json` | AKTİF — "Job Başlat" (rate-limit, job_id, Worker'ı tetikle, hızlı yanıt) |
| `n8n-workflows/kolay-kobi-takvim-worker.json` | AKTİF — "Worker + Durum" (asıl AI çağrısı + `/status` polling ucu) |
| `n8n-workflows/KURULUM.md` | Import/deploy adımları, curl test komutları, tüm v1-v7 hata notları |
| `n8n-workflows/TAKVIM_GELISTIRME_GECMISI.md` | Bu doküman |

**Diğer 7 araç** (`kolay-kobi-{chatbot,geri-donus,rakip,butce,wa,persona,skor}.json`)
hâlâ eski senkron mimaride, bu dokümandaki sorunlardan etkilenmedi.
