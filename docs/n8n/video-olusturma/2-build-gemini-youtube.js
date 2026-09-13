/**
 * BUILD GEMINI (YouTube) — link doğrudan Gemini'ye
 * n8n düğümü: "Gemini Gövde (YouTube)" (Code)
 *
 * fileData ile YouTube linki indirme olmadan geçiyor. Apify maliyeti sıfır.
 *
 * ⚠️ PROMPT İKİ DÜĞÜMDE AYNI. Burayı değiştirirseniz "Gemini Gövde (Video)"
 * düğümünü de aynı şekilde güncelleyin (docs/n8n/video-olusturma/3-*.js).
 */

const ctx = $input.first().json;

const sector = ctx.sector || 'Genel';
const biz    = ctx.biz || '';
const tones  = Array.isArray(ctx.tones) ? ctx.tones.join(' + ') : (ctx.tones || 'Eğlendirici');
const note   = ctx.note || '';
const kullaniciAciklamasi = ctx.videoDesc || '';

/*
 * HİZMET METNİ — en güvenilir kaynak.
 *
 * Kullanıcının "İşletme Bilgilerim > Sunduğunuz hizmet / ürün" alanına kendi
 * yazdığı metin. Web sitesi scrape'i çoğu KOBİ'de menü ve slogandan ibaret
 * kalıyor; model o boşlukta somut özellik uyduruyordu (8 Eyl 2026: KolayKOBİ
 * için "stok listesi yükleme" ve "tek tıkla fatura kesme" uyduruldu).
 *
 * Öncelik: hizmetler > note > site metni.
 */
const hizmetler = String(ctx.hizmetler || '').trim().slice(0, 1200);

/*
 * FİRMA METNİ ÇIKARMA (7 Eyl 2026'da düzeltildi)
 *
 * Eski kod yalnızca `<etiket>` işaretlerini siliyordu. Ama <script> ve <style>
 * bloklarının İÇERİĞİ etiket değil — silinmiyordu. Sonuç: modele giden 1500
 * karakterin neredeyse tamamı Yoast'ın JSON-LD şeması ve Elementor CSS'i
 * oluyordu; firma hakkında tek bir gerçek cümle yoktu.
 *
 * Model de boşluğu doldurdu: KolayKOBİ için "tek tıkla fatura kesiyor" diye
 * var olmayan bir özellik uydurup senaryoyu onun üzerine kurdu.
 *
 * Artık script/style/noscript blokları İÇERİĞİYLE birlikte atılıyor, HTML
 * varlıkları çözülüyor ve yalnızca gerçek sayfa metni gidiyor.
 */
let firmaBilgisi = '';
try {
  const ham = String(
    $('Firma Scrape').first().json?.data || $('Firma Scrape').first().json?.body || '',
  );
  firmaBilgisi = ham
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:#39|apos);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);
} catch (e) { firmaBilgisi = ''; }
// Site okunamadıysa (bot koruması) elimizdeki metin engelleme sayfasıdır —
// "Just a moment..." firma bilgisi sanılmasın. Bkz. Video Kaynağı notu.
if (ctx.siteOkunamadi) firmaBilgisi = '';

/*
 * PROMPT TASARIM NOTU (5 Eyl 2026 — gerçek çıktı incelemesinden sonra)
 *
 * İlk sürüm yalnızca YAPI istiyordu ("hook + kurgu + CTA"). Model yapıyı doğru
 * çıkardı ama ESPRİYİ kaçırdı: bir Kayıp Balık Dori dublaj videosunda asıl
 * mekanizma "çocuk talimatı tutamıyor" iken, model finali "gülüşme, kutlama ve
 * bitiş" diye UYDURDU. Gerçek final ise çocuğun 10'a kadar sayarken 4'te kuma
 * dalmasıydı.
 *
 * Yapı doğru + espri yanlış = iskeleti doğru, motoru olmayan uyarlama.
 * Bu yüzden aşağıda doruk_an ALINTI ile isteniyor ve klişe kapanış açıkça
 * yasaklanıyor. kim_oynuyor da ayrıca soruluyor: iki bağımsız çalıştırmada da
 * ekrandaki kişiler eksik/yanlış sayıldı.
 *
 * telif_riski: aynı çıktı marka güvenliğini "Yüksek" verdi, oysa format
 * telifli Pixar görüntüsü üzerine kuruluydu. KOBİ marka hesabında gerçek risk.
 *
 * UYDURMA YASAĞI (7 Eyl 2026): model KolayKOBİ için "tek tıkla fatura kesiyor"
 * diye var olmayan bir özellik uydurdu ve senaryoyu onun üzerine kurdu — video
 * kullanılamaz hale geldi. O çalıştırmada firma sitesi de bozuktu, yani modelin
 * elinde gerçek bilgi yoktu ve boşluğu doldurdu. Artık uydurmak açıkça yasak;
 * `dayanak` alanı da iddianın kaynağını göstererek denetlenebilir kılıyor.
 */

const talimat = `Bu videoyu İZLE ve arkasındaki tekrarlanabilir FORMAT yapısını çıkar.

FORMAT: Videonun konusu değil, kurgu mantığı — hook + yapı + CTA kalıbı.
Amaç aynı kurguyu farklı bir sektöre uyarlamak. Konu benzerliği ARAMIYORUZ.

ANCAK: Formatı soyutlarken videoyu İŞLEYEN ŞEYİ kaybetme. Çoğu videoda
yapı taşınabilir ama asıl değer tek bir anda saklıdır. O anı bulamazsan
uyarlama iskelet olarak doğru, işlev olarak ölü olur.

${hizmetler ? '▸ İŞLETMENİN BEYAN ETTİĞİ HİZMET/ÜRÜNLER (EN GÜVENİLİR KAYNAK):\n' + hizmetler + '\n\n' : ''}${kullaniciAciklamasi ? 'Kullanıcının notu: ' + kullaniciAciklamasi + '\n' : ''}${note ? '▸ BU VİDEO ŞU HİZMET/ÜRÜN İÇİN İSTENİYOR (üç senaryo da bunu anlatmalı):\n' + note + '\n\n' : ''}${firmaBilgisi ? 'Firma web sitesinden (SON ÇARE — menü ve slogan içerebilir):\n' + firmaBilgisi + '\n' : ''}
⛔ EN ÖNEMLİ KURAL — ÜRÜN İDDİASI UYDURMA
İşletmenin sunmadığı bir özellik, hizmet veya yetenek ASLA yazma.
Yalnızca şu kaynaklarda AÇIKÇA geçen şeyleri kullanabilirsin — ÖNCELİK SIRASIYLA:
  (a) İşletmenin beyan ettiği hizmet/ürünler  ← varsa senaryoları BUNA dayandır
  (b) Kullanıcının notu
  (c) Firma web sitesinden çekilen metin       ← yalnızca (a) ve (b) boşsa

⛔ GENEL İFADEYİ SOMUTLAŞTIRMA
Sitede yalnızca genel bir kategori geçiyorsa ("AI destekli otomasyon",
"dijital pazarlama", "danışmanlık") bu SANA O KATEGORİYİ SOMUTLAŞTIRMA
İZNİ VERMEZ. "Otomasyon" yazıyor diye "stok listesi yükleme", "satış
grafiği", "tek tıkla fatura kesme" gibi somut özellikler UYDURAMAZSIN.
Senaryoda kalabilecek somutluk düzeyi, kaynakta yazan düzeyle AYNIDIR.

⛔ ÜRÜN EKRANI GÖSTERME
Kaynakta açıkça tarif edilmedikçe hiçbir yazılım ekranı, panel, grafik,
buton, tablo veya fatura görüntüsü betimleme. Ekranda ne olduğunu
bilmiyorsan ekranı hiç gösterme.

⛔ İŞLETME SAHİBİNİ KÜÇÜK DÜŞÜRME — ROL DAĞILIMI KURALI
Bu videoyu İZLEYECEK kişi işletme sahibinin ta kendisidir. Onu şaşıran,
tıkanan, yanlış yapan, düzeltilen taraf olarak KONUMLANDIRMA.

Özellikle yasak: işletme sahibinin/esnafın kafasının karışması, pes etmesi,
bir uzman tarafından yönlendirilip sonunda sırtının sıvazlanması, omzuna
dokunulması, ona gülünmesi, "aferin" muamelesi görmesi.

Kaynak videoda asimetrik bir ikili varsa (anne-çocuk, usta-çırak,
uzman-acemi) o asimetriyi OLDUĞU GİBİ taşıma. Anne-çocukta şaşıran tarafın
sevimli olmasının sebebi ÇOCUK olmasıdır; yetişkin bir işletme sahibi aynı
role konduğunda sevimli değil, aşağılayıcı olur.

ROLLERİ TERS ÇEVİR: tıkanan / abartan / komik duruma düşen taraf danışman,
ajans, yapay zeka veya dışarıdan gelen "uzman" olsun. İşletme sahibi ise
sakin, net, gerçekçi cevabı veren taraf olsun. İzleyici kendini AKILLI
tarafta görmeli.

⛔ İŞLETMEYİ BATIYOR GÖSTERME — TİCARİ GÜVENLİK
Bu video İŞLETMENİN KENDİ HESABINDAN yayınlanacak. Akışta kayarken izleyen
müşteri, esprinin kurgusunu çözmeden ÖNCE görüntüyü okur.

Şunları ASLA senaryoya koyma:
  • kepenk/panjur kapatmak, dükkânı kapatmak
  • "Kapalıyız", "Tadilat nedeniyle kapalı", "Devren satılık" levhası
  • tabelayı sökmek, indirmek, kırmak
  • boş/terk edilmiş dükkân, tozlu raflar, sönük ışık
  • tasfiye, haciz, iflas, "son günler" çağrışımı
  • çalışanları göndermek, "işi bıraktım" demek

Türkiye'de esnaf için tabelanın inmesi tek anlama gelir: iş bitti. Komşu
esnaf sorar, tedarikçi arar, müşteri "kapanmışlar" der. Hiçbir işletme
sahibi bunu kendi hesabında yayınlamaz — şaka olduğunu bilse bile.

Absürtlük İŞİN YAPILIŞ BİÇİMİNDE olsun, işletmenin varlığında değil:
yanlış aletle çalışmak, gereksiz emek harcamak, saçma bir nesneye
güvenmek — bunlar güvenli. Dükkânı kapatmak değil.

⛔ BAŞROL İŞLETME SAHİBİNİN — HİZMET SAĞLAYICI SAHNEDE YOK
Videoyu yayınlayan İŞLETMENİN KENDİSİ. Senaryoda "${biz || 'işletme'}" dışında
bir danışman, eğitmen, uzman veya ajans KARAKTER OLARAK yer alamaz.

Yasak: "KolayKobi eğitmeni", "danışman", "uzman" gibi bir figürün başrolde
olması ve işletme çalışanlarının onu hayranlıkla dinlemesi.

Sebebi: pazarlamada kahraman MÜŞTERİ olmalı, satıcı değil. Hizmet sağlayıcıyı
etkileyici taraf, işletmeyi ders alan taraf yapan video, izleyiciye
"sen öğrenmesi gereken tarafsın" der. Hizmet yalnızca CTA'da geçer.

⛔ EKRANDAKİ ELEŞTİRİ BİR KESİME SALDIRAMAZ
Hook'taki yorum/eleştiri SOMUT ve KİŞİSEL olmalı — bu işletmenin şu işine
dair. Bir topluluğu aşağılayan cümle YAZMA.

Yasak örnekler (gerçek çıktıdan, 9 Eyl 2026):
  ❌ "KOBİ'lere yapay zeka anlatacağınıza gidin çay ocağına anlatın."
  ❌ "Veri analizi ve risk yönetimi esnafın neyine, hesap makinesine anlatın."
  ❌ "Bizim müşteriler gelenekseldir..."

"esnaf", "KOBİ'ler", "küçük işletmeler", "bizim millet" gibi topluluk adlarını
küçümseyen ifadeler kullanılamaz. Video ironi kuruyor olsa bile o cümle
EKRANDA YAZILI DURUYOR ve akışta kayan izleyici ironiyi çözmeden okuyor —
üstelik o izleyici tam da aşağılanan kesimin içinde.

Doğrusu: eleştiri işin yapılış biçimini hedeflesin.
  ✅ "Bu fiyata bu işi kimse yapmaz, boşuna uğraşıyorsunuz."
  ✅ "Randevu sistemi mi? Telefonla ara, olsun bitsin."

⛔ ESPRİ NEYE GÜLDÜRÜR — ÜÇ TEST
Raydan çıkaran cümle (doruk an) şu üç testi birden geçmeli. Geçmiyorsa espri
değil, müşteri itirazıdır.

1. NEYE GÜLÜYORUZ? Ortak bir yanılgıya ya da alışkanlığa gülünmeli; izleyici
   "bunu ben de yapıyordum" demeli. Kişinin ÜRÜNÜ ANLAMAMASINA gülünemez.
2. KİP VE DURUŞ. Cümle bir İTİRAF olmalı ("…sanıyorduk", "…yapıyordum") —
   uzmana sorulan bir SORU değil. Soru soran taraf uzmanın altında kalır ve
   aptal görünür.
3. ŞÜPHE NEREYE DÜŞÜYOR? Eski yönteme düşmeli; ürün onu çözüyor. Kampanyanın
   ya da ürünün KENDİ ŞARTLARINA şüphe düşüren cümle yasak — kendi reklamında
   kendi ürününe soru işareti koymak olur.

İki yöntem serbest:
  a) Konu dışı, istemsiz çağrışım: kişi sayarken kendi hayatından alakasız bir
     ayrıntıya dalar, tam bir ciddiyetle. (Kaynak formatlarda çocuğun araya
     giren masum saçmalaması bu.)
  b) Saf beklenti itirafı: "…sanıyorduk" — konuya ait olabilir, çünkü şüphe
     eski yönteme düşer.

  ❌ "Robot süpürge kaybolursa çekiliş hakkım yanar mı?"  (ürünün şartına şüphe + soru)
  ❌ "Bu puan tam olarak nereden geliyor?"                 (ürünü anlamama)
  ✅ "İndirim yazınca kendiliğinden satılır sanıyorduk."   (ortak yanılgı)
  ✅ "Motordan ses gelince radyonun sesini açıyordum."     (alışkanlık itirafı)
  ✅ "Kargoyu yola çıkarınca iş bitti sanıyorduk."         (ortak yanılgı)

Bu kural ROLLERİ TERS ÇEVİR kuralının devamıdır: orası işletme sahibini
koruyor, burası MÜŞTERİYİ koruyor. Video işletmenin hesabından yayınlanıp
müşterilere gösteriliyor; aptal duruma düşen taraf müşteriyse izleyici kendini
aptal tarafta görür.
(13 Eyl 2026: Allianz kampanya senaryolarının üçünde de raydan çıkaran cümle
kampanya şartı hakkında bir soruydu — espri tutmadı, üstelik reklam kendi
şartlarına şüphe ekiyordu.)

⛔ DORUK ANDA DÜNYA KARŞILIK VERMELİ
Absürt eylemi kişi TEK BAŞINA yapıp bitirmesin. Doruk anda mutlaka bir
üçüncü taraf tepki versin: müşteri, çalışan, komşu esnaf, geçen biri,
bir hayvan, çalan telefon.

Kaynak videoları viral yapan şey genelde budur — absürt tavsiye uygulanır
VE gerçeklik oyuna katılır (ör. kediler gerçekten toplanıp telefona bakar).
Tepki olmazsa geriye tek kişinin garip bir şey yapması kalır; izleyici
güler ama paylaşmaz.

⚠️ TEPKİ HAYRANLIK DEĞİL. Üçüncü taraf, kahramana HAYRAN OLAN bir öğrenci
gibi davranamaz. Yasak: "hayranlıkla not almak", "pürdikkat ders dinlemek",
"defter açıp yazmak", "aferin bakışı". Bu, işletme çalışanlarını kahramanın
öğrencisi konumuna düşürüyor — küçümsemenin gizlendiği yer burası.
Doğru tepki: şaşkınlık, oyuna katılma, ciddiye alıp devam ettirme veya
gerçekliğin absürt biçimde uyum sağlaması (kediler gibi).

Her uyarlamada \`doruk_an_karsiligi\` alanına KİMİN TEPKİ VERDİĞİNİ yaz.

⛔ MİKROFON VE STÜDYO KURGUSU YOK
Videoda mikrofon HİÇ görünmüyor: mikrofon, video modelinin ses filtresini
tetiklediği için sahneden çıkarılıyor. Buna rağmen senaryolar "mikrofon
başındadır", "stüdyo mikrofonu önünde oturan iki kişi" diye başlıyor; sahnede
mikrofon olmayınca hook da anlamsız kalıyor ("Mikrofon testi bir iki...").
  • Kurguyu mikrofona, stüdyoya, podcast'e, yayına veya kayda DAYANDIRMA.
  • İki kişiyi sade bir masaya, tezgâha ya da çalışma bankosuna oturt; öylece
    birbirleriyle konuşsunlar.
  • Hook'ta da mikrofon, ses testi ya da yayın göndermesi yapma.
(12 Eyl 2026: üç senaryo üst üste mikrofonla başladı.)

⛔ KAYNAKTA OLMAYAN SAYI YAZMA
Ödül adedi, katılımcı sayısı, oran, süre — hiçbirini kendin üretme. CTA dahil
her sayı dayanak metninde birebir geçmeli. Sayı uydurmak sigorta şirketi adına
yanlış vaat demektir.
  ❌ "36 büyük hediyeden birini kazanma şansı" (dayanakta 36 diye bir sayı yok)
  ✅ "iPhone 17 Pro Max'ten robot süpürgeye uzanan hediyeler"
(12 Eyl 2026: CTA'da uydurulmuş "36 hediye" sayısı çıktı.)

⛔ DORUK AN SESE DAYANAMAZ — HAYVAN SESİ, EFEKT SESİ YOK
Videoyu üreten model artık sahnenin kendi sesini de üretiyor — yani havlama
DUYULUR. Sorun tam da bu: hayvan sesi karakterin Türkçe repliğinin üstüne
biner, modelin çıkardığı ses öngörülemez ve izleyicilerin çoğu videoyu sessiz
izler. Havlama, miyavlama, telefon zili, korna, kırılma/düşme sesi, müzik ya da
alkış üzerine kurulan bir espri bu yüzden tutmaz.
  • Hayvan sahnede olabilir ama SESSİZ tepki verir: kafasını yana eğer, kuyruk
    sallar, burnunu uzatır, kulaklarını diker, masaya zıplar.
  • Doruk an ya bir REPLİKLE (bir karakterin söylediği cümle) ya da GÖRÜNTÜYLE
    (yüz ifadesi, hareket, ekranda görünen bir şey) çalışmalı.
  ❌ "Masanın altından ofis köpeği kafasını uzatıp havlar." (ses repliğin üstüne biner)
  ✅ "Masanın altından ofis köpeği kafasını uzatıp başını yana eğerek müşteriye bakar."
(11 Eyl 2026: bir evcil hayvan senaryosunun doruğu havlamaydı. 12 Eyl 2026: kural
gevşetilince havlayan köpek hemen geri geldi — gerekçe değişti, yasak değişmedi.)

⛔ REPLİK NAKLETME — ESPRİ GERÇEKÇİ OLMALI
Kaynak videodaki repliği kelimesi kelimesine taşıma. Kaynaktaki söz o
bağlamda doğal olduğu için komik; başka bir sahneye taşındığında ödünç ve
yapay duruyor.
Yazdığın her replik için şunu sor: "Bu işi gerçekten yapan biri, gerçek bir
günde bu cümleyi kurar mı?" Kuramayacaksa yeniden yaz. Pazarlama diliyle
kendine gönderme yapan espriler ("yine broşür metni gibi konuştum") gerçek
insan konuşması değildir — yazma.

GÖREV SIRASI (bu sırayla düşün):

1. Videonun FORMAT yapısını çıkar
2. Videoyu işleyen DORUK ANI bul ve diyalogdan alıntıla
3. FİRMANIN GERÇEK HİZMETLERİNİ ÇIKAR — kullanıcı notu ve site metninden,
   BİREBİR ALINTIYLA. Somut bir hizmet/ürün bulamıyorsan bunu açıkça yaz.
4. Formatı, firmaya özel 3 FARKLI YAKLAŞIMLA uyarla. Üçü de AYNI firma ve
   aynı sektör içindir — farklı sektörler DEĞİL. Farklılık açıda olmalı:
   farklı müşteri acı noktası, farklı sahne, farklı hook.
   Kullanıcı hangi hizmet için istediğini yazdıysa ÜÇÜ DE o hizmeti anlatır,
   sadece anlatma biçimi değişir. Yazmadıysa her senaryo farklı bir hizmeti
   ele alabilir.
5. Her uyarlamada doruk anın MEKANİĞİ korunmalı; korunmuyorsa o uyarlamayı yazma

SEKTÖR YALNIZCA İPUCUDUR: "${sector}" kullanıcının seçimi, ama gerçek kaynak
firmanın kendi hizmetleridir. Site metni bu sektörle çelişiyorsa SİTEYİ esas
al ve bunu \`sektor_notu\` alanında belirt.

3. adımda somut hizmet bulunamadıysa: senaryoları sektörün gündelik durumu
üzerine kur, ürün özelliğine HİÇ değinme, CTA'yı "bize ulaşın" gibi genel
tut ve \`firma_hizmetleri\` alanına "somut hizmet bulunamadı" yaz.
Uydurulmuş bir özellik iddiası videoyu kullanılamaz kılar ve işletmeyi
yanıltıcı reklam riskine sokar. Emin değilsen iddia etme.

İşletme: ${biz || 'belirtilmemiş'}
Ton: ${tones}

ZORUNLU JSON ÇIKTI ŞEMASI (yalnızca bunu döndür, markdown kullanma):
{
  "format_adi": "Format adı (kısa, tanımlayıcı)",
  "format_tipi": "POV | Mini skeç | Reveal | Before/After | Us vs Them | Text overlay | Micro-drama | Diğer",
  "format_aciklamasi": "Kurgu mantığı — hook + yapı + CTA",
  "kurgu_yapisi": "Sahne 1 (X sn): ... → Sahne 2 (X sn): ... → Sahne 3 (X sn): ...",
  "sure": "tahmini süre",
  "ornek_hook": "İlk 1-3 saniyede söylenen cümle",

  "rol_dagilimi": "Uyarlamalarda kim hangi rolde? İşletme sahibi HANGİ tarafta duruyor? 'İşletme sahibi sakin/net tarafta, tıkanan taraf danışman/AI' gibi net yaz. İşletme sahibini şaşıran veya düzeltilen tarafa koyduysan senaryoyu YENİDEN YAZ.",

  "kim_oynuyor": "Ekranda KAÇ kişi var ve kim? Yaş/rol belirt (ör: 'anne ve 5 yaş civarı kızı; baba yalnızca sesle var, görüntüde yok'). Kimin sempatik olduğunu ve bunun neden önemli olduğunu yaz.",

  "doruk_an": "Videoyu İŞLEYEN an. Hangi replik veya hareket espriyi/etkiyi kuruyor? DİYALOGDAN BİREBİR ALINTI yap ve kaçıncı saniyede olduğunu yaz. Birden fazla doruk varsa HEPSİNİ sırayla yaz. ⛔ 'Gülüşme ve kapanış', 'kutlama', 'mutlu son' gibi KLİŞE kapanış YAZMA — gerçekte ne olduğunu yaz. Emin değilsen 'net bir doruk an tespit edemedim' yaz, uydurma.",

  "neden_tuttu": "Bu videoyu izlenir ve PAYLAŞILIR kılan unsur. Duygusal motor ne? (beklentinin kırılması, sempati, şaşkınlık, tanıdıklık...)",

  "uyarlamada_korunacak": "Sektör değişse de korunması ZORUNLU olan öğe. Bu kaybolursa format çalışmaz.",

  "gorsel_notlar": "Videoda GÖRDÜĞÜN çekim detayları: plan ölçeği, kamera açısı ve hareketi, ışık, mekân, ekran düzeni (split-screen vb.), metin/altyazı yerleşimi, kesme ritmi.",

  "uretim_zorlugu": "Çok Düşük | Düşük | Orta | Yüksek — GEREKÇESİYLE: kaç kişi, hangi ekipman, hangi beceri gerekiyor",
  "telif_riski": "Bu format telifli müzik, film görüntüsü, karakter veya marka gerektiriyor mu? Gerektiriyorsa AÇIKÇA yaz ve telifsiz alternatif öner. Gerektirmiyorsa 'yok' yaz.",

  "telifsiz_calisir_mi": "telif_riski 'yok' ise 'evet' yaz. Değilse DÜRÜST OL: telifli öğeyi çıkarınca format hâlâ çalışır mı? Videonun çekim gücü izleyicinin o filmi/şarkıyı TANIMASINDAN geliyorsa, telifsiz bir stok görüntüyle değiştirmek formatı öldürür — bunu açıkça yaz ve 'bu kaynak video uyarlamaya uygun değil, başka bir video seçin' de. Sadece kurgu mekaniği taşınıyorsa 'evet, tanıma unsuru şart değil' yaz.",
  "marka_guvenligi": "Yüksek | Orta | Dikkat Gerekir. ⚠️ telif_riski 'yok' DEĞİLSE bu alan 'Yüksek' OLAMAZ — en fazla 'Orta' yaz, ciddi telif bağımlılığında 'Dikkat Gerekir'. İki alanı bağımsız doldurma.",

  "firma_hizmetleri": "Firmanın SOMUT hizmet/ürünleri — kullanıcı notundan ve site metninden BİREBİR ALINTI, madde madde. Genel slogan ve menü başlıklarını (ör. 'Hizmetler', 'Anasayfa', 'Blog') hizmet sayma. BLOG YAZISI BAŞLIKLARI DA HİZMET DEĞİLDİR — 'Yerel SEO Nedir? ... Rehberi' gibi bir başlık firmanın o hizmeti sattığını göstermez, yalnızca o konuda yazı yazdığını gösterir; hizmet listesine alma. Somut hiçbir şey yoksa tam olarak şunu yaz: 'somut hizmet bulunamadı — Ek Not alanına hangi ürün/hizmeti tanıtmak istediğinizi yazın'.",

  "sektor_notu": "Kullanıcının seçtiği '${sector}' sektörü site metniyle uyumlu mu? Uyumluysa 'uyumlu' yaz. Değilse siteye göre gerçek sektörü yaz ve senaryoları ona göre kurduğunu belirt.",

  "sektore_ozgu_uyarlamalar": [
    { "sektor": "${sector}", "yaklasim": "1. yaklaşımın tek cümlelik adı (ör. 'Randevu karmaşası üzerinden')", "dayanak_hizmet": "Bu senaryonun dayandığı hizmet — firma_hizmetleri'nden BİREBİR alıntı, yoksa 'ürün iddiası yok'", "hook": "...", "senaryo_taslagi": "Sahne sahne kısa senaryo (3-5 cümle)", "doruk_an_karsiligi": "Kaynak videodaki doruk anın buradaki karşılığı — mekanik aynı kalmalı. KİMİN TEPKİ VERDİĞİNİ açıkça yaz (müşteri, çalışan, komşu esnaf, geçen biri, hayvan). Tepki veren kimse yoksa bu uyarlamayı yeniden kur.", "cta": "..." },
    { "sektor": "${sector}", "yaklasim": "2. yaklaşım — 1'den FARKLI bir acı noktası veya hizmet", "dayanak_hizmet": "...", "hook": "...", "senaryo_taslagi": "...", "doruk_an_karsiligi": "...", "cta": "..." },
    { "sektor": "${sector}", "yaklasim": "3. yaklaşım — diğer ikisinden FARKLI", "dayanak_hizmet": "...", "hook": "...", "senaryo_taslagi": "...", "doruk_an_karsiligi": "...", "cta": "..." }
  ],
  "dayanak": "Senaryolarda geçen ürün/hizmet iddiaları hangi kaynaktan geliyor? Kullanıcı notundan veya firma sitesinden BİREBİR ALINTI yap. Somut bir iddia kullanmadıysan 'ürün iddiası yok — senaryolar genel tutuldu' yaz.",
  "uygulama_ipuclari": "Bu formatı uygularken 2-3 pratik ipucu"
}`;

const apiBody = {
  contents: [{
    parts: [
      { fileData: { fileUri: ctx.videoUrl } },
      { text: talimat },
    ],
  }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8000,
    responseMimeType: 'application/json',
  },
};

return [{ json: { ...ctx, apiBodyStr: JSON.stringify(apiBody) } }];
