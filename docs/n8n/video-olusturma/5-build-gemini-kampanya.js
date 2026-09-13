/**
 * GEMİNİ GÖVDESİ — KAMPANYA MODU (videosuz)
 * n8n düğümü: "Gemini Gövde (Kampanya)" (Code)
 * ─────────────────────────────────────────────────────────────────────────────
 * Örnek video olmadan senaryo yazar. Format, videodan ÇIKARILMAZ; saklı bir
 * kurgudan VERİLİR. Kurgu tek bir değişkenden besleniyor:
 *
 *   ctx.ornekSenaryo  → kullanıcı kendi kurgusunu yapıştırdıysa o kullanılır
 *   yoksa             → doğrulanmış kurgu kütüphanesinden seçilir
 *
 * Bu yüzden "kullanıcı örnek senaryo versin" seçeneği sonradan eklenirken bu
 * düğüm DEĞİŞMEYECEK; yalnızca forma bir alan eklenip gövdede taşınacak.
 *
 * ⚠️ Aşağıdaki ORTAK KURAL bloğu 2-build-gemini-youtube.js ile BİREBİR aynı
 * olmak zorundadır. kural-sapma-test.js bunu kontrol ediyor.
 */

const ctx = $input.first().json;

const sector = ctx.sector || 'Genel';
const biz    = ctx.biz || '';
const tones  = Array.isArray(ctx.tones) ? ctx.tones.join(' + ') : (ctx.tones || 'Eğlendirici');
const note   = ctx.note || '';
const hizmetler = String(ctx.hizmetler || '').trim().slice(0, 1200);

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
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);
} catch (e) { firmaBilgisi = ''; }
if (ctx.siteOkunamadi) firmaBilgisi = '';

/*
 * KURGU KÜTÜPHANESİ — yalnızca ÇALIŞTIĞINI GÖRDÜĞÜMÜZ kurgular girer.
 * Uydurma kurgu eklemeyin; aracın değeri kanıtlanmış kurguyu ödünç almasıdır.
 */
const KUTUPHANE = `KURGU 1 — "Sayarken raydan çıkma" (prova yanılgısı)
  Yapı: İki kişi sakin bir ortamda oturur. Biri bir listeyi ezberden sayar
  ("bir…, iki…, üç…"). Dördüncü maddeye gelirken duraksar ve tam bir
  ciddiyetle, konuyla ilgisi olmayan kişisel bir itiraf yapar. Üçüncü bir kişi
  (çalışan, geçen biri, yan masadaki) buna tepki verir.
  Neden tutar: mükemmeliyetçi prova ile insanın kendi dağınık zihni arasındaki
  tezat. Gülünen şey kişinin aptallığı değil, herkesin tanıdığı bir alışkanlık.
  Korunması zorunlu: sayma ritmi, dördüncü maddede kopuş, üçüncü kişinin tepkisi.`;

const kurgu = String(ctx.ornekSenaryo || '').trim() || KUTUPHANE;
const kurguKaynagi = String(ctx.ornekSenaryo || '').trim()
  ? 'Kullanıcının verdiği örnek kurgu'
  : 'Kurgu kütüphanesi';

const talimat = `Aşağıdaki KURGUYU kullanarak, firmanın KENDİ kampanya ve
hizmetlerinden üç video senaryosu yaz. Ortada izlenecek bir kaynak video YOK;
kurgu sana veriliyor, senin işin onu firmaya uyarlamak.

▸ KULLANILACAK KURGU (${kurguKaynagi}):
${kurgu}

${hizmetler ? '▸ İŞLETMENİN BEYAN ETTİĞİ HİZMET/ÜRÜNLER (EN GÜVENİLİR KAYNAK):\n' + hizmetler + '\n\n' : ''}${note ? '▸ BU VİDEO ŞU HİZMET/ÜRÜN İÇİN İSTENİYOR (üç senaryo da bunu anlatmalı):\n' + note + '\n\n' : ''}${firmaBilgisi ? 'Firma web sitesinden (SON ÇARE — menü ve slogan içerebilir):\n' + firmaBilgisi + '\n' : ''}
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

⚠️ ÜÇ UYARLAMADA AYNI TEPKİ OLMAZ. "Gülümseyip başını sallamak" tek başına
tepki sayılmaz; üç uyarlamada birden kullanılırsa ortada tepki yok demektir.
Üçünün tepkisi birbirinden FARKLI olsun ve en az birinde üçüncü taraf
KONUŞSUN ya da somut bir şey YAPSIN: elindekini bırakması, oyuna katılması,
kendi hikâyesini eklemesi gibi.
(13 Eyl 2026: üç uyarlamada da tepki "gülümseyip başını salladı" oldu ve
sahneler düzleşti. Bir önceki turda ofis çaycısının kendi süpürgesinin adını
söylemesi partinin en iyi anıydı — aranan şey budur.)

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

⛔ ÜRÜN VE KAMPANYA ADINI DAYANAKTAKİ GİBİ YAZ
Ad, dayanak metninde nasıl geçiyorsa HARFİ HARFİNE öyle yazılır; çevirme,
kısaltma, İngilizceleştirme yok.
  ❌ "Healthy Puan"   ✅ "Sağlıklı Puan"
(13 Eyl 2026: üründen "Healthy Puan" diye söz edildi — müşteriye gidecek
metinde marka adının bozulması kabul edilemez.)

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

⛔ KAYNAĞIN KALIP SÖZÜ UYARLAMAYA GEÇMEZ
\`doruk_an\` alanında kaynağın repliğini BİREBİR alıntılaman isteniyor — o alan
ANALİZ içindir. Uyarlamaların repliklerinde ise kaynağın ayırt edici hiçbir
sözü geçmeyecek; özellikle kalıp açılışlar ("Aklıma bak…", "Bak şimdi…" gibi
kaynağa ait imza ifadeler). Espriyi kopyalamamak yetmez, SÖZCÜKLERİ de
kopyalamayacaksın. Karakter kendi ağzıyla, kendi cümlesini kursun.

⛔ ÜÇ UYARLAMA BİRBİRİNE BENZEMEYECEK
Üç senaryonun doruk replikleri aynı kalıpla başlayamaz; ilk iki kelimeleri
farklı olmalı. Aynı firma için üç video da aynı kalıpla açılırsa izleyici
yazılmış değil, üretilmiş olduğunu anlar.

  ❌ 13 Eyl 2026 (Allianz): üç uyarlamanın ÜÇÜ de "Aklıma bak, …" diye başladı
     — kaynak videodaki çocuğun imza cümlesinden kopyalanmıştı.
  ❌ 13 Eyl 2026 (ikinci deneme): bu bloğa örnek diye, AYNI firmanın kendi
     kampanyaları için yazılmış üç cümle konmuştu; model üçünü de birebir geri
     yazdı ve senaryolar yazılmak yerine kuraldan okundu.

⚠️ BU KURALLARDAKİ ÖRNEK CÜMLELER BAŞKA İŞLETMELERDENDİR — KOPYALAMA
Aşağıdaki örnekler kuaför, pastane, oto servis gibi ilgisiz işletmelerden
gelir ve yalnızca MEKANİĞİ gösterir. Hiçbirini bu videoya taşıma; senin
yazacağın cümleler yalnızca yukarıdaki SENARYO ile firmanın kendi
hizmetlerinden çıkar.
  ✅ kuaför:     "Aynaya bakmadan önce gözümü kapatırdım eskiden."
  ✅ pastane:    "Fırın alarmını üç kez kurar, yine de kapağı açıp bakardım."
  ✅ oto servis: "Motordan ses gelince radyonun sesini açıyordum."
     — aynı mekanik (kendi alışkanlığını itiraf), üç ayrı ağız, ortak kalıp yok.
⚠️ YUKARIDAKİ KURALLARI BU MODA GÖRE OKU
Ortak kurallar her iki modda da geçerli ama örnek video üzerinden yazılmış.
Bu modda ortada izlenen bir video YOK:
  • "kaynak video" geçen her yeri "SANA VERİLEN KURGU" diye oku.
  • Kaynağın imza sözünü kopyalama kuralı burada da geçerlidir: verilen
    kurgunun örnek cümlelerini uyarlamalarına taşıma, kendi cümleni kur.
  • Bu modda doruk_an diye ayrı bir çıktı alanı YOK; kurgunun doruk anının
    karşılığını her uyarlamanın doruk_an_karsiligi alanına yaz.

GÖREV SIRASI (bu sırayla düşün):

1. FİRMANIN GERÇEK HİZMET/KAMPANYALARINI ÇIKAR — yukarıdaki kaynaklardan
   BİREBİR ALINTIYLA. Somut bir şey bulamıyorsan bunu açıkça yaz.
2. Verilen kurgunun MEKANİĞİNİ çöz: hangi an espriyi kuruyor, ne korunmalı.
3. Kurguyu, firmaya özel 3 FARKLI YAKLAŞIMLA uyarla. Üçü de AYNI firma içindir.
   Farklılık açıda olmalı: farklı kampanya, farklı acı noktası, farklı sahne.
4. Her uyarlamada kurgunun MEKANİĞİ korunmalı; korunmuyorsa yeniden yaz.

SEKTÖR YALNIZCA İPUCUDUR: "${sector}" kullanıcının seçimi, gerçek kaynak
firmanın kendi hizmetleridir.

İşletme: ${biz || 'belirtilmemiş'}
Ton: ${tones}

ZORUNLU JSON ÇIKTI ŞEMASI (yalnızca bunu döndür, markdown kullanma):
{
  "format_adi": "Kullanılan kurgunun kısa adı",
  "format_tipi": "POV | Mini skeç | Reveal | Before/After | Us vs Them | Micro-drama | Diğer",
  "format_aciklamasi": "Kurgu mantığı — hook + yapı + CTA",
  "kurgu_yapisi": "Sahne 1 (X sn): ... → Sahne 2 (X sn): ... → Sahne 3 (X sn): ...",
  "sure": "tahmini süre",
  "ornek_hook": "İlk 1-3 saniyede söylenen cümle",

  "rol_dagilimi": "Kim hangi rolde? İşletme sahibi HANGİ tarafta? Onu şaşıran veya düzeltilen tarafa koyduysan yeniden yaz.",

  "neden_tuttu": "Bu kurguyu izlenir ve PAYLAŞILIR kılan duygusal motor.",
  "uyarlamada_korunacak": "Kaybolursa kurgunun çalışmayacağı öğe.",

  "telif_riski": "yok",
  "telifsiz_calisir_mi": "evet — kaynak video kullanılmıyor",
  "marka_guvenligi": "Yüksek | Orta | Dikkat Gerekir",
  "uretim_zorlugu": "Çok Düşük | Düşük | Orta | Yüksek — GEREKÇESİYLE",

  "firma_hizmetleri": "Firmanın SOMUT hizmet/ürün/kampanyaları — BİREBİR ALINTI, madde madde. Somut hiçbir şey yoksa: 'somut hizmet bulunamadı — Ek Not alanına hangi ürün/hizmeti tanıtmak istediğinizi yazın'.",

  "sektor_notu": "Seçilen '${sector}' sektörü firmanın hizmetleriyle uyumlu mu?",

  "sektore_ozgu_uyarlamalar": [
    { "sektor": "${sector}", "yaklasim": "1. yaklaşımın tek cümlelik adı", "dayanak_hizmet": "firma_hizmetleri'nden BİREBİR alıntı, yoksa 'ürün iddiası yok'", "hook": "...", "senaryo_taslagi": "Sahne sahne kısa senaryo (3-5 cümle)", "doruk_an_karsiligi": "Kurgunun doruk anının buradaki karşılığı — mekanik aynı kalmalı. KİMİN TEPKİ VERDİĞİNİ açıkça yaz. Tepki veren kimse yoksa yeniden kur.", "cta": "..." },
    { "sektor": "${sector}", "yaklasim": "2. yaklaşım — 1'den FARKLI", "dayanak_hizmet": "...", "hook": "...", "senaryo_taslagi": "...", "doruk_an_karsiligi": "...", "cta": "..." },
    { "sektor": "${sector}", "yaklasim": "3. yaklaşım — diğer ikisinden FARKLI", "dayanak_hizmet": "...", "hook": "...", "senaryo_taslagi": "...", "doruk_an_karsiligi": "...", "cta": "..." }
  ],
  "dayanak": "Senaryolardaki ürün/kampanya iddiaları hangi kaynaktan geliyor? BİREBİR ALINTI yap.",
  "uygulama_ipuclari": "Bu kurguyu uygularken 2-3 pratik ipucu"
}`;

const apiBody = {
  contents: [{ parts: [{ text: talimat }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8000,
    responseMimeType: 'application/json',
  },
};

return [{ json: { ...ctx, apiBodyStr: JSON.stringify(apiBody) } }];
