import { useMemo, useRef, useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OzelMesaj {
  tip: string
  metin: string
}

interface SssKart {
  soru: string
  cevap: string
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

const KAPANIS_REGEX =
  /teşekkür|tamam|anladım|görüşürüz|iyi ki|harika|süper|mükemmel|tamamdır|iyi günler|hoşça kal|güle güle/i

const MESAI_DISI_REGEX =
  /şu an mevcut|müsait misiniz|açık mısınız|mesai|hafta sonu|akşam|gece/i

/** Anahtar kelime çıkarımında elenecek Türkçe soru/bağlaç kelimeleri */
const ETKISIZ_KELIMELER = new Set([
  'nedir', 'nasıl', 'nerede', 'neden', 'hangi', 'kaç', 'kadar', 'için',
  'veya', 'ile', 'mi', 'mı', 'mu', 'mü', 'musunuz', 'misiniz', 'mısınız',
  'var', 'yok', 'bir', 'bu', 'şu', 'siz', 'sizin', 'bizim', 'olan',
  'yapabilir', 'alabilir', 'sunuyor', 'çalışıyor', 'ediyor',
])

const VARSAYILAN_FALLBACK =
  'Bunu tam anlayamadım. 🤔 Sorunuzu farklı bir şekilde yazabilir veya menüdeki başlıklardan birini seçebilirsiniz.'

/** "Mesai dışı testi" butonunun gönderdiği örnek metin — gerçek saatten bağımsız tetikler */
const MESAI_TEST_METNI = 'şu an açık mısınız?'

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

/** Belirli bir mesaj tipini "içeren" ilk mesajı bulur (tip adları AI'dan geldiği için esnek eşleşme) */
function mesajBul(mesajlar: OzelMesaj[], ...anahtarlar: string[]): string | null {
  const bulunan = mesajlar.find((m) =>
    anahtarlar.some((a) => m.tip.toLocaleLowerCase('tr').includes(a)),
  )
  return bulunan?.metin ?? null
}

/**
 * SSS sorusundan anahtar kelimeleri türetir.
 * Eski standalone araçta bu liste AI tarafından üretiliyordu; SaaS prompt'u
 * keyword döndürmediği için soru metninden çıkarıyoruz.
 */
function anahtarKelimeler(soru: string): string[] {
  return soru
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((k) => k.length >= 3 && !ETKISIZ_KELIMELER.has(k))
}

/**
 * Türkçe eklemeli bir dil olduğu için tam kelime eşleşmesi yetersiz kalıyor:
 * kullanıcı "fiyat" yazarken SSS sorusunda "fiyatlarınız" geçiyor. İlk birkaç
 * harfi (kök) karşılaştırarak bunu yakalıyoruz. 4 harften kısa ortak önek
 * kabul edilmez — aksi halde alakasız kelimeler eşleşirdi.
 */
const KOK_UZUNLUK = 5

function kokEslesir(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length, KOK_UZUNLUK)
  return n >= 4 && a.slice(0, n) === b.slice(0, n)
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export function MiniChatbotTest({ bizName, ozelMesajlar, sssKartlari }: Props) {
  const karsilama = useMemo(
    () => mesajBul(ozelMesajlar, 'karşılama', 'karsilama', 'hoş geldin'),
    [ozelMesajlar],
  )
  const kapanis = useMemo(
    () => mesajBul(ozelMesajlar, 'kapanış', 'kapanis', 'teşekkür'),
    [ozelMesajlar],
  )
  const mesaiDisi = useMemo(
    () => mesajBul(ozelMesajlar, 'mesai'),
    [ozelMesajlar],
  )

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
    const kucuk = metin.toLocaleLowerCase('tr')

    if (MESAI_DISI_REGEX.test(kucuk)) {
      return mesaiDisi ?? 'Şu an mesai saatleri dışındayız. En kısa sürede size dönüş yapacağız. 🌙'
    }

    if (KAPANIS_REGEX.test(kucuk)) {
      return kapanis ?? 'Yardımcı olabildiysem ne mutlu! Başka bir sorunuz olursa buradayım. 😊'
    }

    // En çok anahtar kelime eşleşen SSS kartı
    const kullaniciKelimeleri = anahtarKelimeler(metin)
    const { kart, skor } = sssKartlari.reduce<{ kart: SssKart | null; skor: number }>(
      (enIyi, k) => {
        const eslesme = anahtarKelimeler(k.soru).filter((kw) =>
          kullaniciKelimeleri.some((uk) => kokEslesir(kw, uk)),
        ).length
        return eslesme > enIyi.skor ? { kart: k, skor: eslesme } : enIyi
      },
      { kart: null, skor: 0 },
    )

    return kart && skor > 0 ? kart.cevap : VARSAYILAN_FALLBACK
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
