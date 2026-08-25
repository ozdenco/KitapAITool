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

  var KAPANIS_RE = /teşekkür|tamam|anladım|görüşürüz|iyi ki|harika|süper|mükemmel|tamamdır|iyi günler|hoşça kal|güle güle/i
  var MESAI_RE = /şu an mevcut|müsait misiniz|açık mısınız|mesai|hafta sonu|akşam|gece/i
  var ETKISIZ = ['nedir','nasıl','nerede','neden','hangi','kaç','kadar','için','veya','ile','mi','mı','mu','mü','musunuz','misiniz','mısınız','var','yok','bir','bu','şu','siz','sizin','bizim','olan','yapabilir','alabilir','sunuyor','çalışıyor','ediyor']

  function kelimeler(metin) {
    return String(metin || '')
      .toLocaleLowerCase('tr')
      .replace(/[^\wğüşıöçĞÜŞİÖÇ\s]/g, ' ')
      .split(/\s+/)
      .filter(function (k) { return k.length >= 3 && ETKISIZ.indexOf(k) === -1 })
  }

  /** Türkçe eklemeli dil: "fiyat" ile "fiyatlarınız" eşleşmeli */
  function kokEslesir(a, b) {
    var n = Math.min(a.length, b.length, 5)
    return n >= 4 && a.slice(0, n) === b.slice(0, n)
  }

  function mesajBul(mesajlar, anahtarlar) {
    for (var i = 0; i < (mesajlar || []).length; i++) {
      var tip = String(mesajlar[i].tip || '').toLocaleLowerCase('tr')
      for (var j = 0; j < anahtarlar.length; j++) {
        if (tip.indexOf(anahtarlar[j]) !== -1) return mesajlar[i].metin
      }
    }
    return null
  }

  function yanitUret(senaryo, girdi) {
    var kucuk = String(girdi).toLocaleLowerCase('tr')

    if (MESAI_RE.test(kucuk)) {
      return mesajBul(senaryo.ozel_mesajlar, ['mesai'])
        || 'Şu an mesai saatleri dışındayız. En kısa sürede size dönüş yapacağız.'
    }
    if (KAPANIS_RE.test(kucuk)) {
      return mesajBul(senaryo.ozel_mesajlar, ['kapanış', 'kapanis', 'teşekkür'])
        || 'Yardımcı olabildiysem ne mutlu! Başka bir sorunuz olursa buradayım.'
    }

    var girdiKelimeleri = kelimeler(girdi)
    var enIyi = null, enIyiSkor = 0
    var kartlar = senaryo.sss_kartlari || []

    for (var i = 0; i < kartlar.length; i++) {
      var soruKelimeleri = kelimeler(kartlar[i].soru)
      var skor = 0
      for (var s = 0; s < soruKelimeleri.length; s++) {
        for (var g = 0; g < girdiKelimeleri.length; g++) {
          if (kokEslesir(soruKelimeleri[s], girdiKelimeleri[g])) { skor++; break }
        }
      }
      if (skor > enIyiSkor) { enIyiSkor = skor; enIyi = kartlar[i] }
    }

    if (enIyi && enIyiSkor > 0) return enIyi.cevap
    return 'Bunu tam anlayamadım. Sorunuzu farklı bir şekilde yazabilir misiniz?'
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
    var karsilama = mesajBul(senaryo.ozel_mesajlar, ['karşılama', 'karsilama', 'hoş geldin'])
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
