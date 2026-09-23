import { useMemo, useRef, useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OzelMesaj {
  tip: string
  metin: string
}

interface SssKart {
  soru: string
  cevap: string
  /**
   * AI'nın ürettiği arama kelimeleri (eşanlamlılar dahil). Varsa eşleştirmede
   * soru metninden türetilenlere EKLENİR — bkz. kartKelimeleri().
   *
   * 23 Eyl 2026: eskiden yalnızca soru metninden kelime türetiliyordu ve bu,
   * eşanlamlı sorularda kartı hiç bulamıyordu: "hastalık izni" ile "Raporlu
   * olduğum günler…" kartı ortak kelime taşımıyor, "haftasonları" ile "Pazar
   * ve resmi tatiller…" de öyle. Kitap sayfasındaki eski araçta bu liste
   * AI'dan geliyordu ve sorun yoktu; SaaS prompt'unda alan kaybolmuştu.
   */
  anahtar_kelimeler?: string[]
}

interface Props {
  bizName: string
  ozelMesajlar: OzelMesaj[]
  sssKartlari: SssKart[]
}

interface Mesaj {
  id: number
  kimden: 'bot' | 'kullanici'
  metin: string
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

/**
 * Türkçe karakterleri ASCII'ye indirger. Kullanıcılar sıklıkla Türkçe klavye
 * kullanmadan yazar ("tesekkurler", "acik misiniz"); normalize etmezsek bu
 * mesajlar hiç eşleşmiyordu. Gömülü widget (public/chatbot-widget.js) ile
 * aynı davranışı korumak için orada da aynısı uygulanır.
 */
function sadelestir(metin: string): string {
  return metin
    .toLocaleLowerCase('tr')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
}

/*
 * Kalıplar sadeleştirilmiş metne uygulanır → hem "teşekkür" hem "tesekkur" yakalanır.
 *
 * Kelime sınırları (\b) şart: sınırsız hâlde "gece" kalıbı "geçen" → "gecen"
 * içinde eşleşiyordu, dolayısıyla "Geçen yıldan izin devredebilir miyim?" gibi
 * meşru sorular SSS eşleşmesine hiç ulaşmadan mesai dışı yanıtını alıyordu
 * (23 Eyl 2026 testinde ölçüldü). Türkçe eklemeli olduğu için kalıpların
 * sonunu serbest bırakıyoruz ("mesaide", "aksamlari"); yalnızca başka
 * kelimelerin ÖNEKİ olan kalıplar ("gece" → geçen/geçerli/gecikme,
 * "tamam" → tamamen/tamamlandı) sonundan da kapatılır.
 */
const KAPANIS_REGEX =
  /\btesekkur|\btamam(dir)?\b|\banladim\b|\bgorusuruz|\biyi ki\b|\bharika|\bsuper\b|\bmukemmel|\biyi gunler\b|\bhosca kal|\bgule gule\b/

const MESAI_DISI_REGEX =
  /\bsu an mevcut|\bmusait misiniz\b|\bacik misiniz\b|\bmesai|\bhafta sonu|\baksam(a|da|dan|i|lari|leyin)?\b|\bgece(de|den|leri|lerde|yi)?\b/

/**
 * Anahtar kelime çıkarımında elenecek (sadeleştirilmiş) soru/bağlaç kelimeleri.
 *
 * Yalnızca soru eki değil, "-ebilir/-abilir" kalıbındaki yardımcı fiiller de
 * elenir: ölçümde "kullanabilir" (+2.84) ve "miyim" (+1.74) tek başına 4.58
 * puan yapıp eşiği geçiyor, yani kart yalnızca CÜMLE BİÇİMİ yüzünden
 * kazanıyordu ("... kullanabilir miyim?" biçimindeki alakasız kart).
 */
const ETKISIZ_KELIMELER = new Set([
  'nedir', 'nasil', 'nerede', 'neden', 'hangi', 'kac', 'kadar', 'icin',
  'veya', 'ile', 'mi', 'mu', 'musunuz', 'misiniz',
  'var', 'yok', 'bir', 'siz', 'sizin', 'bizim', 'olan',
  'yapabilir', 'alabilir', 'sunuyor', 'calisiyor', 'ediyor',
  // Soru ekleri
  'miyim', 'miyiz', 'muyum', 'muyuz', 'midir', 'mudur',
  // Yardımcı fiiller — ayırt edici değil, yalnızca cümle biçimini taşır
  'kullanabilir', 'kullanabilirim', 'edebilir', 'edebilirim',
  'olabilir', 'olabilirim', 'yapabilirim', 'alabilirim', 'verebilir',
  'gerekiyor', 'gerekir', 'oluyor', 'olacak', 'istiyorum', 'isterim',
  'lazim', 'bana', 'beni', 'benim', 'bunu', 'sonra', 'once', 'ama',
])

const VARSAYILAN_FALLBACK =
  'Bunu tam anlayamadım. 🤔 Sorunuzu farklı bir şekilde yazabilir veya menüdeki başlıklardan birini seçebilirsiniz.'

/** "Mesai dışı testi" butonunun gönderdiği örnek metin — gerçek saatten bağımsız tetikler */
const MESAI_TEST_METNI = 'şu an açık mısınız?'

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

/** Belirli bir mesaj tipini "içeren" ilk mesajı bulur (tip adları AI'dan geldiği için esnek eşleşme) */
function mesajBul(mesajlar: OzelMesaj[], ...anahtarlar: string[]): string | null {
  const bulunan = mesajlar.find((m) =>
    anahtarlar.some((a) => sadelestir(m.tip).includes(a)),
  )
  return bulunan?.metin ?? null
}

/** Serbest metinden aranabilir kelimeleri süzer (noktalama at, ekleri ve soru eklerini ele) */
function anahtarKelimeler(metin: string): string[] {
  return sadelestir(metin)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length >= 3 && !ETKISIZ_KELIMELER.has(k))
}

/**
 * Bir SSS kartının arama kelimeleri: AI'nın verdiği `anahtar_kelimeler` +
 * soru metninden türetilenler.
 *
 * Soru metni tek başına yetmiyor çünkü kullanıcı kartın sözcüklerini değil
 * kendi sözcüklerini yazıyor ("hastalık izni" ↔ "Raporlu olduğum günler…").
 * AI listesi bu köprüyü kuruyor; eski kayıtlarda alan bulunmadığı için
 * soru metninden türetim yedek olarak korunuyor.
 */
function kartKelimeleri(kart: SssKart): string[] {
  const ai = (kart.anahtar_kelimeler ?? []).flatMap(anahtarKelimeler)
  return [...new Set([...ai, ...anahtarKelimeler(kart.soru)])]
}

/**
 * Türkçe eklemeli bir dil olduğu için tam kelime eşleşmesi yetersiz kalıyor:
 * kullanıcı "fiyat" yazarken SSS sorusunda "fiyatlarınız" geçiyor. İlk birkaç
 * harfi (kök) karşılaştırarak bunu yakalıyoruz. 4 harften kısa ortak önek
 * kabul edilmez — aksi halde alakasız kelimeler eşleşirdi.
 */
// 6 harf: 5'te "çalışıyorsunuz" ile "çalışanlarını" ("calis") yanlış eşleşiyordu
const KOK_UZUNLUK = 6

function kokEslesir(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length, KOK_UZUNLUK)
  return n >= 4 && a.slice(0, n) === b.slice(0, n)
}

/**
 * Cevap için gereken en düşük skor.
 * 25 soruluk gerçek testte düşük eşik, bilgi olmayan sorulara alakasız kartlarla
 * cevap üretiyordu (6 uydurma cevap). 3.0'da uydurma sıfırlandı, doğruluk arttı.
 */
const MIN_SKOR = 3.0

/**
 * Kelime ağırlıkları (IDF benzeri). "yıllık", "izin" gibi kelimeler neredeyse
 * her kartta geçtiğinden ayırt edici değildir; düz sayımda skoru şişirip
 * alakasız kartın kazanmasına yol açıyorlardı.
 */
function agirlikHesapla(kartlar: SssKart[]) {
  const N = kartlar.length
  const df = new Map<string, number>()
  for (const k of kartlar) {
    for (const w of kartKelimeleri(k)) {
      df.set(w, (df.get(w) ?? 0) + 1)
    }
  }
  return {
    idf: (w: string) => Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 0.1,
    genelMi: (w: string) => (df.get(w) ?? 0) / Math.max(1, N) > 0.40,
  }
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export function MiniChatbotTest({ bizName, ozelMesajlar, sssKartlari }: Props) {
  const karsilama = useMemo(
    () => mesajBul(ozelMesajlar, 'karsilama', 'hos geldin'),
    [ozelMesajlar],
  )
  const kapanis = useMemo(
    () => mesajBul(ozelMesajlar, 'kapanis', 'tesekkur'),
    [ozelMesajlar],
  )
  const mesaiDisi = useMemo(
    () => mesajBul(ozelMesajlar, 'mesai'),
    [ozelMesajlar],
  )

  const agirlik = useMemo(() => agirlikHesapla(sssKartlari), [sssKartlari])

  const [mesajlar, setMesajlar] = useState<Mesaj[]>(() =>
    karsilama ? [{ id: 0, kimden: 'bot', metin: karsilama }] : [],
  )
  const [girdi, setGirdi] = useState('')
  const sonMesajRef = useRef<HTMLDivElement>(null)

  // Yeni mesajda en alta kaydır
  useEffect(() => {
    sonMesajRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [mesajlar])

  const ekle = (kimden: Mesaj['kimden'], metin: string) =>
    setMesajlar((prev) => [...prev, { id: prev.length, kimden, metin }])

  /**
   * Kullanıcı metnine göre bot yanıtını seçer.
   *
   * Not: Bu bir TEST/önizleme widget'ı — gerçek canlı bot değil. Eskiden
   * gerçek saat (mesaiDisiMi()) her mesajı otomatik "mesai dışı"na yönlendiriyordu;
   * bu yüzden akşam test edildiğinde ne yazılırsa yazılsın hep aynı sabit cevap
   * geliyor, SSS eşleşmesi hiç görünmüyordu (23:00'te bildirilen hata buydu).
   * Mesai dışı artık yalnızca kullanıcı açıkça sorarsa (MESAI_DISI_REGEX) veya
   * "Mesai Dışını Test Et" butonuyla tetiklenir — gerçek saatten bağımsızdır.
   */
  const botYaniti = (metin: string): string => {
    const kucuk = sadelestir(metin)

    if (MESAI_DISI_REGEX.test(kucuk)) {
      return mesaiDisi ?? 'Şu an mesai saatleri dışındayız. En kısa sürede size dönüş yapacağız. 🌙'
    }

    if (KAPANIS_REGEX.test(kucuk)) {
      return kapanis ?? 'Yardımcı olabildiysem ne mutlu! Başka bir sorunuz olursa buradayım. 😊'
    }

    // Ağırlıklı eşleşme: nadir kelimeler belirleyici, genel kelimeler değil
    const kullaniciKelimeleri = anahtarKelimeler(metin)
    const { kart, skor } = sssKartlari.reduce<{ kart: SssKart | null; skor: number }>(
      (enIyi, k) => {
        let puan = 0
        let ayirtEdici = 0

        for (const kw of kartKelimeleri(k)) {
          const tam = kullaniciKelimeleri.includes(kw)
          const kok = !tam && kullaniciKelimeleri.some((uk) => kokEslesir(kw, uk))
          if (!tam && !kok) continue

          puan += agirlik.idf(kw) * (tam ? 1 : 0.6)
          if (!agirlik.genelMi(kw)) ayirtEdici++
        }

        // Yalnızca genel kelimelerin ("yıllık", "izin") tutması yetmez
        return ayirtEdici >= 1 && puan > enIyi.skor ? { kart: k, skor: puan } : enIyi
      },
      { kart: null, skor: 0 },
    )

    return kart && skor >= MIN_SKOR ? kart.cevap : VARSAYILAN_FALLBACK
  }

  const gonder = (metin: string) => {
    const temiz = metin.trim()
    if (!temiz) return
    ekle('kullanici', temiz)
    setGirdi('')
    // Küçük gecikme: yazıyor hissi
    setTimeout(() => ekle('bot', botYaniti(temiz)), 350)
  }

  const testEt = (tur: 'kapanis' | 'mesai' | 'fallback') => {
    const örnekler = {
      kapanis:  'teşekkürler',
      mesai:    MESAI_TEST_METNI,
      fallback: 'qwerty asdf zxcv',
    }
    gonder(örnekler[tur])
  }

  const sifirla = () =>
    setMesajlar(karsilama ? [{ id: 0, kimden: 'bot', metin: karsilama }] : [])

  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden no-print">
      {/* Başlık */}
      <div className="px-5 py-3.5 border-b border-[#E2E0D8] flex items-center gap-2">
        <span className="text-[16px]">💬</span>
        <h3 className="text-[14px] font-semibold text-[#1C1B19]">Mini Chatbot Testi</h3>
      </div>

      {/* WhatsApp benzeri pencere */}
      <div className="p-4">
        <div className="rounded-xl border border-[#E2E0D8] overflow-hidden">
          {/* Pencere başlığı */}
          <div className="bg-[#1D9E75] px-4 py-2.5 flex items-center gap-2">
            <span className="text-[15px]">📱</span>
            <span className="text-[13px] font-medium text-white">
              {bizName.trim() || 'İşletmeniz'} Bot
            </span>
          </div>

          {/* Mesajlar */}
          <div className="bg-[#F7F6F2] px-3 py-3 h-[260px] overflow-y-auto flex flex-col gap-2">
            {mesajlar.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                  m.kimden === 'bot'
                    ? 'bg-white text-[#1C1B19] self-start rounded-tl-sm border border-[#E2E0D8]'
                    : 'bg-[#DCF8C6] text-[#1C1B19] self-end rounded-tr-sm'
                }`}
              >
                {m.metin}
              </div>
            ))}
            <div ref={sonMesajRef} />
          </div>

          {/* Test kısayolları */}
          <div className="bg-white border-t border-[#E2E0D8] px-3 py-2 flex items-center gap-1.5 flex-wrap">
            {([
              { tur: 'kapanis',  etiket: '↩ Kapanışı Test Et' },
              { tur: 'mesai',    etiket: '🌙 Mesai Dışını Test Et' },
              { tur: 'fallback', etiket: '? Fallback’i Test Et' },
            ] as const).map(({ tur, etiket }) => (
              <button
                key={tur}
                type="button"
                onClick={() => testEt(tur)}
                className="px-2.5 py-1 rounded-lg border border-[#D3D1C7] text-[11px] text-[#6B6963] hover:border-[#1D9E75] hover:text-[#085041] transition-colors"
              >
                {etiket}
              </button>
            ))}
            <button
              type="button"
              onClick={sifirla}
              className="ml-auto px-2.5 py-1 text-[11px] text-[#9A9792] hover:text-red-500 transition-colors"
            >
              ↺ Sıfırla
            </button>
          </div>

          {/* Mesaj girişi */}
          <div className="bg-white border-t border-[#E2E0D8] px-3 py-2.5 flex items-center gap-2">
            <input
              value={girdi}
              onChange={(e) => setGirdi(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') gonder(girdi) }}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-[#D3D1C7] text-[12px] focus:outline-none focus:border-[#1D9E75]"
            />
            <button
              type="button"
              onClick={() => gonder(girdi)}
              disabled={!girdi.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gönder
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[#9A9792] mt-2.5 leading-relaxed">
          Test butonlarıyla kapanış, mesai dışı ve fallback mesajlarını doğrudan görebilirsiniz.
          Sohbette <strong>&ldquo;teşekkür&rdquo;</strong> veya <strong>&ldquo;tamam&rdquo;</strong> yazarsanız
          kapanış mesajı tetiklenir. Yanıtlar SSS kartlarınızdaki kelimelere göre eşleştirilir —
          yapay zekâ çağrısı yapılmaz, kullanım hakkınızdan düşmez.
        </p>
      </div>
    </div>
  )
}
