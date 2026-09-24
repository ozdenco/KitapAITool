/**
 * KolayKOBİ — Gömülebilir Chatbot Widget
 *
 * Kullanım (işletmenin kendi sitesine eklenir):
 *   <script src="https://app.kolaykobi.com/chatbot-widget.js"
 *           data-kolaykobi-id="SENARYO-ID"></script>
 *
 * Çalışma mantığı: senaryo bir kez KolayKOBİ'de yapay zeka ile üretilir ve
 * kaydedilir. Bu widget yalnızca o kayıtlı senaryoyu okur ve ziyaretçinin
 * sorusunu SSS kartlarıyla anahtar kelime eşleştirmesiyle yanıtlar.
 * ZİYARETÇİ MESAJI İÇİN YAPAY ZEKA ÇAĞRISI YAPILMAZ → ek token maliyeti yoktur.
 *
 * Bağımlılık yoktur; hiçbir framework gerektirmez.
 */
(function () {
  'use strict'

  var script = document.currentScript
  if (!script) return

  var senaryoId = script.getAttribute('data-kolaykobi-id')
  if (!senaryoId) {
    console.error('[KolayKOBİ] data-kolaykobi-id eksik.')
    return
  }

  // Widget'ın barındığı origin (script src'sinden türetilir)
  var apiKok = new URL(script.src, location.href).origin
  var RENK = script.getAttribute('data-renk') || '#1D9E75'

  // ─── Eşleştirme mantığı (KolayKOBİ önizlemesiyle aynı) ───────────────────

  /**
   * Türkçe karakterleri ASCII'ye indirger. Ziyaretçiler sıklıkla Türkçe klavye
   * kullanmadan yazar ("tesekkurler", "acik misiniz"); normalize etmezsek bu
   * mesajlar hiç eşleşmez. Hem kalıplar hem girdi bu haliyle karşılaştırılır.
   */
  function sadelestir(metin) {
    return String(metin || '')
      .toLocaleLowerCase('tr')
      .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
      .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
  }

  /*
   * Kalıplar sadeleştirilmiş metne uygulanır → hem "teşekkür" hem "tesekkur"
   * yakalanır.
   *
   * Kelime sınırları (\b) şart: sınırsız hâlde "gece" kalıbı "geçen" → "gecen"
   * içinde eşleşiyordu, dolayısıyla "Geçen yıldan izin devredebilir miyim?"
   * gibi meşru sorular SSS eşleştirmesine hiç ulaşmadan mesai dışı yanıtını
   * alıyordu (24 Eyl 2026'da ölçüldü). Türkçe eklemeli olduğu için kalıpların
   * sonu serbest ("mesaide", "aksamlari"); yalnızca başka kelimelerin ÖNEKİ
   * olanlar ("gece" → geçen/geçerli/gecikme, "tamam" → tamamen/tamamlandı)
   * sonundan da kapatılır.
   */
  var KAPANIS_RE = /\btesekkur|\btamam(dir)?\b|\banladim\b|\bgorusuruz|\biyi ki\b|\bharika|\bsuper\b|\bmukemmel|\biyi gunler\b|\bhosca kal|\bgule gule\b/
  var MESAI_RE = /\bsu an mevcut|\bmusait misiniz\b|\bacik misiniz\b|\bmesai|\bhafta sonu|\baksam(a|da|dan|i|lari|leyin)?\b|\bgece(de|den|leri|lerde|yi)?\b/

  /*
   * Etkisiz kelimeler. Soru ekleri ve "-ebilir/-abilir" yardımcı fiilleri de
   * elenir: ölçümde "kullanabilir" (+2.84) ve "miyim" (+1.74) tek başına 4.58
   * puan yapıp eşiği geçiyor, yani kart yalnızca CÜMLE BİÇİMİ yüzünden
   * kazanıyordu ("... kullanabilir miyim?" biçimindeki alakasız kart).
   */
  var ETKISIZ = ['nedir','nasil','nerede','neden','hangi','kac','kadar','icin','veya','ile','mi','mu','musunuz','misiniz','var','yok','bir','siz','sizin','bizim','olan','yapabilir','alabilir','sunuyor','calisiyor','ediyor',
    'miyim','miyiz','muyum','muyuz','midir','mudur',
    'kullanabilir','kullanabilirim','edebilir','edebilirim','olabilir','olabilirim','yapabilirim','alabilirim','verebilir',
    'gerekiyor','gerekir','oluyor','olacak','istiyorum','isterim','lazim','bana','beni','benim','bunu','sonra','once','ama']

  function kelimeler(metin) {
    return sadelestir(metin)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (k) { return k.length >= 3 && ETKISIZ.indexOf(k) === -1 })
  }

  /**
   * Bir SSS kartının arama kelimeleri: AI'nın verdiği `anahtar_kelimeler` +
   * soru metninden türetilenler.
   *
   * Soru metni tek başına yetmiyor çünkü ziyaretçi kartın sözcüklerini değil
   * kendi sözcüklerini yazıyor ("hastalık izni" ↔ "Raporlu olduğum günler…").
   * AI listesi bu köprüyü kuruyor; alanı taşımayan eski senaryolarda soru
   * metninden türetim yedek olarak kalıyor.
   */
  function kartKelimeleri(kart) {
    var cikti = [], gorulen = {}, i, j, parca
    var ai = kart.anahtar_kelimeler || []
    for (i = 0; i < ai.length; i++) {
      parca = kelimeler(ai[i])
      for (j = 0; j < parca.length; j++) {
        if (!gorulen[parca[j]]) { gorulen[parca[j]] = true; cikti.push(parca[j]) }
      }
    }
    parca = kelimeler(kart.soru)
    for (j = 0; j < parca.length; j++) {
      if (!gorulen[parca[j]]) { gorulen[parca[j]] = true; cikti.push(parca[j]) }
    }
    return cikti
  }

  /**
   * Türkçe eklemeli dil: "fiyat" ile "fiyatlarınız" eşleşmeli.
   * Kök 6 harf: 5 harfte "çalışıyorsunuz" ile "çalışanlarını" ("calis") yanlış
   * eşleşiyor ve alakasız kartlar kazanıyordu.
   */
  function kokEslesir(a, b) {
    var n = Math.min(a.length, b.length, 6)
    return n >= 4 && a.slice(0, n) === b.slice(0, n)
  }

  /**
   * Kelime ağırlıkları (IDF benzeri).
   *
   * "yıllık", "izin" gibi kelimeler neredeyse HER SSS kartında geçtiği için
   * ayırt edici değildir; düz kelime sayımında bunlar skoru şişirip alakasız
   * kartın kazanmasına yol açıyordu. Kaç kartta geçtiğine göre ağırlık veriyoruz:
   * nadir kelime = yüksek ağırlık.
   */
  function agirlikHesapla(kartlar) {
    var N = kartlar.length
    var df = {}
    for (var i = 0; i < N; i++) {
      var kw = kartKelimeleri(kartlar[i])
      for (var j = 0; j < kw.length; j++) df[kw[j]] = (df[kw[j]] || 0) + 1
    }
    return {
      idf: function (w) { return Math.log((N + 1) / ((df[w] || 0) + 1)) + 0.1 },
      // Kartların %40'ından fazlasında geçen kelime "genel" sayılır
      genelMi: function (w) { return (df[w] || 0) / N > 0.40 }
    }
  }

  /**
   * Cevap verebilmek için gereken en düşük skor.
   * Ölçümle belirlendi: daha düşük eşiklerde bot, bilgi olmayan sorulara
   * alakasız kartlarla cevap veriyordu (25 soruluk gerçek testte 6 uydurma
   * cevap). 3.0'da uydurma sıfıra indi ve toplam doğruluk arttı.
   * Yanlış bilgi vermektense "bilmiyorum" demek yeğdir.
   */
  var MIN_SKOR = 3.0

  function mesajBul(mesajlar, anahtarlar) {
    for (var i = 0; i < (mesajlar || []).length; i++) {
      var tip = sadelestir(mesajlar[i].tip)
      for (var j = 0; j < anahtarlar.length; j++) {
        if (tip.indexOf(anahtarlar[j]) !== -1) return mesajlar[i].metin
      }
    }
    return null
  }

  function yanitUret(senaryo, girdi) {
    var kucuk = sadelestir(girdi)

    if (MESAI_RE.test(kucuk)) {
      return mesajBul(senaryo.ozel_mesajlar, ['mesai'])
        || 'Şu an mesai saatleri dışındayız. En kısa sürede size dönüş yapacağız.'
    }
    if (KAPANIS_RE.test(kucuk)) {
      return mesajBul(senaryo.ozel_mesajlar, ['kapanis', 'tesekkur'])
        || 'Yardımcı olabildiysem ne mutlu! Başka bir sorunuz olursa buradayım.'
    }

    var girdiKelimeleri = kelimeler(girdi)
    var kartlar = senaryo.sss_kartlari || []
    var ag = senaryo._agirlik || (senaryo._agirlik = agirlikHesapla(kartlar))

    var enIyi = null, enIyiSkor = 0

    for (var i = 0; i < kartlar.length; i++) {
      var soruKelimeleri = kartKelimeleri(kartlar[i])
      var skor = 0, ayirtEdici = 0

      for (var s = 0; s < soruKelimeleri.length; s++) {
        var w = soruKelimeleri[s]
        var tam = girdiKelimeleri.indexOf(w) !== -1
        var kok = false
        if (!tam) {
          for (var g = 0; g < girdiKelimeleri.length; g++) {
            if (kokEslesir(w, girdiKelimeleri[g])) { kok = true; break }
          }
        }
        if (!tam && !kok) continue

        skor += ag.idf(w) * (tam ? 1 : 0.6)   // kök eşleşmesi kısmi puan alır
        if (!ag.genelMi(w)) ayirtEdici++       // yalnızca ayırt edici kelime sayılır
      }

      // Sadece "yıllık/izin" gibi genel kelimelerin tutması cevap için yetmez
      if (ayirtEdici >= 1 && skor > enIyiSkor) { enIyiSkor = skor; enIyi = kartlar[i] }
    }

    if (enIyi && enIyiSkor >= MIN_SKOR) return enIyi.cevap
    return 'Bu konuda elimde net bir bilgi yok. 🤔 Sorunuzu farklı bir şekilde yazabilir ya da bizimle doğrudan iletişime geçebilirsiniz.'
  }

  // ─── Arayüz ───────────────────────────────────────────────────────────────

  function el(tag, stil, metin) {
    var d = document.createElement(tag)
    if (stil) d.style.cssText = stil
    if (metin != null) d.textContent = metin
    return d
  }

  function baslat(senaryo) {
    var acik = false

    var kok = el('div', 'position:fixed;bottom:20px;right:20px;z-index:2147483000;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;')

    // Baloncuk
    var baloncuk = el('button', 'width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;' +
      'background:' + RENK + ';color:#fff;font-size:24px;box-shadow:0 4px 14px rgba(0,0,0,.22);' +
      'display:flex;align-items:center;justify-content:center;', '💬')
    baloncuk.setAttribute('aria-label', 'Sohbeti aç')

    // Pencere
    var pencere = el('div', 'display:none;flex-direction:column;width:340px;max-width:calc(100vw - 40px);' +
      'height:460px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;overflow:hidden;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.20);margin-bottom:12px;')

    var baslik = el('div', 'background:' + RENK + ';color:#fff;padding:12px 14px;font-size:14px;font-weight:600;' +
      'display:flex;align-items:center;justify-content:space-between;')
    baslik.appendChild(el('span', '', senaryo._bizName || 'Destek'))
    var kapat = el('button', 'background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;', '×')
    kapat.setAttribute('aria-label', 'Kapat')
    baslik.appendChild(kapat)

    var govde = el('div', 'flex:1;overflow-y:auto;padding:12px;background:#F7F6F2;display:flex;' +
      'flex-direction:column;gap:8px;')

    var altBar = el('div', 'display:flex;gap:6px;padding:10px;border-top:1px solid #E2E0D8;background:#fff;')
    var girdiKutusu = el('input', 'flex:1;padding:9px 11px;border:1px solid #D3D1C7;border-radius:8px;' +
      'font-size:13px;outline:none;')
    girdiKutusu.placeholder = 'Mesajınızı yazın...'
    var gonderBtn = el('button', 'padding:9px 14px;border:none;border-radius:8px;background:' + RENK + ';' +
      'color:#fff;font-size:13px;font-weight:600;cursor:pointer;', 'Gönder')
    altBar.appendChild(girdiKutusu)
    altBar.appendChild(gonderBtn)

    pencere.appendChild(baslik)
    pencere.appendChild(govde)
    pencere.appendChild(altBar)
    kok.appendChild(pencere)
    kok.appendChild(baloncuk)
    document.body.appendChild(kok)

    function balonEkle(kimden, metin) {
      var bot = kimden === 'bot'
      var b = el('div',
        'max-width:82%;padding:9px 11px;border-radius:12px;font-size:13px;line-height:1.5;' +
        'white-space:pre-wrap;word-break:break-word;' +
        (bot
          ? 'background:#fff;color:#1C1B19;align-self:flex-start;border:1px solid #E2E0D8;'
          : 'background:#DCF8C6;color:#1C1B19;align-self:flex-end;'),
        metin)
      govde.appendChild(b)
      govde.scrollTop = govde.scrollHeight
    }

    function gonder() {
      var metin = girdiKutusu.value.trim()
      if (!metin) return
      balonEkle('kullanici', metin)
      girdiKutusu.value = ''
      setTimeout(function () { balonEkle('bot', yanitUret(senaryo, metin)) }, 300)
    }

    gonderBtn.addEventListener('click', gonder)
    girdiKutusu.addEventListener('keydown', function (e) { if (e.key === 'Enter') gonder() })

    function ac(gorunur) {
      acik = gorunur
      pencere.style.display = gorunur ? 'flex' : 'none'
      baloncuk.textContent = gorunur ? '×' : '💬'
      if (gorunur) girdiKutusu.focus()
    }
    baloncuk.addEventListener('click', function () { ac(!acik) })
    kapat.addEventListener('click', function () { ac(false) })

    // Karşılama mesajı
    var karsilama = mesajBul(senaryo.ozel_mesajlar, ['karsilama', 'hos geldin'])
    if (karsilama) balonEkle('bot', karsilama)
  }

  // ─── Senaryoyu yükle ──────────────────────────────────────────────────────

  fetch(apiKok + '/api/public/chatbot/' + encodeURIComponent(senaryoId))
    .then(function (r) {
      if (!r.ok) throw new Error('Senaryo yüklenemedi (' + r.status + ')')
      return r.json()
    })
    .then(function (senaryo) {
      senaryo._bizName = script.getAttribute('data-baslik') || 'Destek'
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { baslat(senaryo) })
      } else {
        baslat(senaryo)
      }
    })
    .catch(function (err) {
      console.error('[KolayKOBİ] Chatbot yüklenemedi:', err.message)
    })
})()
