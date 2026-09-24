import type React from 'react'
import { ToolOutputRenderer } from '@/components/ui/ToolOutputRenderer'
import { VideoCiktisi } from '@/components/ui/VideoCiktisi'

/**
 * ÇIKTI GÖVDESİ — kaydedilmiş bir araç çıktısını ekrana basar.
 *
 * NEDEN ORTAK: Bu mantık önce yalnızca Geçmiş Çıktılar'da vardı. Yönetici
 * "Rapor Detayı" sayfası ise doğrudan ToolOutputRenderer çağırıyordu; o da
 * tanımadığı araç kimliği için hiçbir şey döndürmediğinden Video Oluşturma
 * raporları BOŞ açılıyordu (8 Eyl 2026'da bildirildi). Yedek render tek
 * yerde tutulmazsa bu tür sessiz boşluklar tekrar eder.
 *
 * Sıra önemli: özel durumlar (video, bekleyen iş, eski bilet) araç kimliğine
 * DEĞİL verinin şekline bakar; böylece yeni bir araç eklendiğinde burayı
 * güncellemek gerekmez.
 */


// ─── JSON output renderer ─────────────────────────────────────────────────────

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-[#9A9792]">—</span>

  if (typeof value === 'number') {
    return <span className="font-semibold text-[#1D9E75] text-[15px]">{value}</span>
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`font-medium ${value ? 'text-[#1D9E75]' : 'text-[#E05252]'}`}>
        {value ? 'Evet' : 'Hayır'}
      </span>
    )
  }

  if (typeof value === 'string') {
    if (value.length > 200) {
      return <p className="text-[13px] text-[#3A3935] leading-relaxed whitespace-pre-wrap">{value}</p>
    }
    return <span className="text-[13px] text-[#3A3935]">{value}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#9A9792] text-[12px]">Boş</span>
    return (
      <div className="flex flex-col gap-2 mt-1">
        {value.map((item, i) => (
          <div key={i} className="pl-3 border-l-2 border-[#E2E0D8]">
            {typeof item === 'object' && item !== null ? (
              <OutputObject obj={item as Record<string, unknown>} depth={depth + 1} />
            ) : (
              renderValue(item, depth + 1)
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    return <OutputObject obj={value as Record<string, unknown>} depth={depth + 1} />
  }

  return <span className="text-[13px] text-[#3A3935]">{String(value)}</span>
}

const KEY_LABELS: Record<string, string> = {
  score: 'Skor', level: 'Seviye', summary: 'Özet', items: 'Değerlendirmeler',
  ctaText: 'Öneri', name: 'Ad', desc: 'Açıklama', description: 'Açıklama',
  badge: 'Etiket', status: 'Durum', icon: 'İkon', title: 'Başlık',
  text: 'Metin', content: 'İçerik', platform: 'Platform', budget: 'Bütçe',
  percentage: 'Yüzde', amount: 'Tutar', reason: 'Neden', action: 'Aksiyon',
  priority: 'Öncelik', days: 'Günler', week: 'Hafta', posts: 'Gönderiler',
  tip: 'İpucu', recommendation: 'Öneri', message: 'Mesaj', script: 'Senaryo',
  subject: 'Konu', body: 'İçerik', category: 'Kategori', type: 'Tür',
  value: 'Değer', url: 'Bağlantı', link: 'Bağlantı', date: 'Tarih',
  time: 'Zaman', ad: 'Ad', guclu: 'Güçlü Yönler', zayif: 'Zayıf Yönler',
  firsat: 'Fırsat', tehdit: 'Tehdit Seviyesi', rakipler: 'Rakipler',
  genel_degerlendirme: 'Genel Değerlendirme', oneriler: 'Öneriler',
}

function labelFor(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
}

const PRIORITY_KEYS = ['score', 'level', 'summary', 'ctaText', 'title', 'name']

function OutputObject({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const keys = Object.keys(obj)
  const prioritized = [
    ...PRIORITY_KEYS.filter((k) => k in obj),
    ...keys.filter((k) => !PRIORITY_KEYS.includes(k)),
  ]

  return (
    <div className={`flex flex-col gap-${depth === 0 ? '4' : '2'}`}>
      {prioritized.map((key) => {
        const val = obj[key]
        const isArray = Array.isArray(val)
        const isObj = typeof val === 'object' && val !== null && !isArray
        const isBigString = typeof val === 'string' && val.length > 80

        return (
          <div key={key} className={depth === 0 ? 'border-b border-[#F2F1ED] pb-4 last:border-0 last:pb-0' : ''}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] mb-1">
              {labelFor(key)}
            </p>
            {(isArray || isObj || isBigString) ? (
              <div className="mt-1">{renderValue(val, depth)}</div>
            ) : (
              renderValue(val, depth)
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Rich renderer with generic fallback ─────────────────────────────────────

// Tool IDs that have a dedicated rich renderer in ToolOutputRenderer.
const RICH_TOOL_IDS = new Set([
  'gorunurluk-skoru', 'musteri-persona', 'icerik-takvimi', 'reklam-butce',
  'whatsapp-satis', 'musteri-geri-donus', 'chatbot-senaryo', 'ai-gorunurluk',
  'viral-video', 'trend-video', 'rakip-analiz',
])

export function CiktiGovdesi({
  toolId,
  parsed,
  olusturmaTarihi,
  sonucId,
  isletmeAdi,
}: {
  toolId: string
  parsed: Record<string, unknown>
  olusturmaTarihi?: string
  /**
   * Kaydın kimliği. Verildiğinde iki şey açılır: senaryo içeren çıktılarda
   * "bu senaryolardan video üret" bağlantısı, chatbot çıktısında da "Sitenize
   * Ekleyin" gömme kodu.
   *
   * YÖNETİCİ RAPOR SAYFASI BUNU GÖNDERMEZ — iki ayrı gerekçeyle:
   * 1. Gizlilik (asıl gerekçe): gömme kodu müşterinin kendi sitesine koyduğu
   *    şeydir, yöneticinin işi değil. Yönetici müşteri şirketin verilerine
   *    gerekmedikçe erişmemeli.
   * 2. Faturalandırma: başkasının kaydından video üretimi başlatmak, kullanımı
   *    yöneticinin hesabına yazardı.
   *
   * 24 Eyl 2026'da bu alan yöneticide de açılmıştı (gömme kodu görünmüyor
   * diye); Özden "şirket verilerini görmemem gerekiyor admin olarak, verilerin
   * gizliliğine uyumlu" diyerek geri aldırdı. Tekrar açma.
   */
  sonucId?: string
  /** Kaydın giriş özeti (işletme adı) — chatbot mini testi başlığında kullanılır. */
  isletmeAdi?: string
}) {
  /*
   * VİDEO — araç kimliğine değil, verinin ŞEKLİNE bakıyoruz. `videoUrl` içeren
   * her çıktı oynatılabilir; yeni bir video aracı eklendiğinde burayı
   * güncellemek gerekmesin.
   */
  if (typeof parsed.videoUrl === 'string' && parsed.videoUrl.length > 0) {
    return (
      <VideoCiktisi
        videoUrl={parsed.videoUrl}
        klipSayisi={typeof parsed.klipSayisi === 'number' ? parsed.klipSayisi : undefined}
        bayt={typeof parsed.bayt === 'number' ? parsed.bayt : undefined}
        olusturmaTarihi={olusturmaTarihi}
      />
    )
  }

  /*
   * SONUÇ BEKLENİYOR — async araçlarda çalıştırma anında açılan yer tutucu.
   * Backend (AsyncJobWatcher) iş bitince bu satırı gerçek çıktıyla günceller;
   * kullanıcı sekmeyi kapatmış olsa bile. Burada ne olduğunu söylüyoruz ki
   * kayıt "bozuk" sanılıp araç ikinci kez çalıştırılmasın — video üretimi
   * ücretli.
   */
  if (parsed._bekliyor === true) {
    return (
      <div className="bg-[#FFF9E8] border border-[#F0DFA8] rounded-xl p-4">
        <p className="text-[13px] font-semibold text-[#7A5C10] mb-1">
          Sonuç hazırlanıyor
        </p>
        <p className="text-[12.5px] text-[#7A5C10] leading-relaxed">
          Bu araç arka planda çalışıyor. Sonuç hazır olduğunda bu kayıt kendiliğinden
          güncellenir — sayfayı açık tutmanız gerekmez. Birkaç dakika sonra
          sayfayı yenileyip tekrar bakın.
        </p>
        <p className="text-[11.5px] text-[#9A8A5A] mt-2">
          Aracı yeniden çalıştırmayın; bu kullanım zaten sayıldı.
        </p>
      </div>
    )
  }

  /*
   * ESKİ İŞ BİLETİ — 8 Eyl 2026 öncesi async çalıştırmalarda ham bilet
   * ({_ok, isId, ...}) ayrı bir kayıt olarak saklanıyordu. Artık tek bir yer
   * tutucu satır açılıyor (yukarıdaki `_bekliyor` dalı), ama eski biletler
   * veritabanında duruyor ve açıldığında anlamsız görünüyorlar.
   */
  if (parsed._ok === true && typeof parsed.isId === 'string' && !('videoUrl' in parsed)) {
    return (
      <div className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-xl p-4">
        <p className="text-[13px] font-semibold text-[#3A3935] mb-1">
          Bu kayıt bir işlem kaydıdır, sonuç değil
        </p>
        <p className="text-[12.5px] text-[#5A5852] leading-relaxed">
          Uzun süren araçlarda çalıştırma başlatıldığında bir işlem kaydı
          oluşuyordu. Videonun kendisi, aynı tarihli <strong>bir sonraki</strong>{' '}
          kayıtta yer alır.
        </p>
      </div>
    )
  }

  /*
   * SENARYO KAYDI — diğer senaryolar için video üretimine dönüş.
   *
   * Araç üç senaryo üretiyor ama kullanıcı bir seferde birini videoya
   * çeviriyor. Sonradan ikinciyi istediğinde aracı yeniden çalıştırması
   * gerekiyordu; bu hem kullanım hakkı yakıyor hem model bambaşka üç senaryo
   * üretiyordu — beğenilen senaryo bir daha geri gelmiyordu.
   */
  if (sonucId && Array.isArray(parsed.sektore_ozgu_uyarlamalar)) {
    return (
      <div className="flex flex-col gap-4">
        <a
          href={`/arac/video-olusturma?sonuc=${encodeURIComponent(sonucId)}`}
          className="flex items-center gap-2 bg-[#F1FAF6] border border-[#9FE1CB] rounded-xl px-4 py-3 text-[13px] text-[#085041] hover:bg-[#E6F6EF] transition-colors"
        >
          <span className="text-[16px] leading-none">🎬</span>
          <span>
            <strong>Bu senaryolardan video üret</strong>
            <span className="block text-[12px] text-[#2E7D63]">
              Formu yeniden doldurmanıza gerek yok — aynı senaryolar açılır.
            </span>
          </span>
        </a>
        <OutputObject obj={parsed} depth={0} />
      </div>
    )
  }

  if (RICH_TOOL_IDS.has(toolId)) {
    return (
      <ToolOutputRenderer
        toolId={toolId}
        data={parsed}
        isletmeAdi={isletmeAdi}
        sonucId={sonucId}
      />
    )
  }
  return <OutputObject obj={parsed} depth={0} />
}
