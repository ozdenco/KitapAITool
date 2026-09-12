import type { Tool } from '@/types'

export const TOOLS: Tool[] = [
  {
    id: 'gorunurluk-skoru',
    name: 'İşletme Görünürlük Skoru',
    description: 'Google ve sosyal medyada ne kadar görünür olduğunuzu 0-100 arası puanlayın.',
    icon: '📊',
    category: 'analiz',
    isAsync: false,
    n8nPath: 'kolay-kobi-skor',
  },
  {
    id: 'musteri-persona',
    name: 'Müşteri Persona Oluşturucu',
    description: 'İdeal müşteri profilinizi ve iletişim stratejinizi yapay zeka ile oluşturun.',
    icon: '👤',
    category: 'analiz',
    isAsync: false,
    n8nPath: 'kolay-kobi-persona',
  },
  {
    id: 'icerik-takvimi',
    name: '30 Günlük İçerik Takvimi',
    description: 'Seçtiğiniz platformlar için 30 günlük hazır sosyal medya takvimi üretin.',
    icon: '📅',
    category: 'icerik',
    isAsync: true,
    n8nPath: 'kolay-kobi-takvim',
  },
  {
    id: 'whatsapp-satis',
    name: 'WhatsApp Satış Script Üretici',
    description: 'Müşterilerinize gönderilecek hazır WhatsApp satış metinleri üretin.',
    icon: '💬',
    category: 'satis',
    isAsync: false,
    n8nPath: 'kolay-kobi-wa',
  },
  {
    id: 'reklam-butce',
    name: 'Reklam Bütçe Dağıtıcı',
    description: 'Aylık reklam bütçenizi platformlara optimum şekilde dağıtın.',
    icon: '💰',
    category: 'analiz',
    isAsync: false,
    n8nPath: 'kolay-kobi-reklam',
  },
  {
    id: 'musteri-geri-donus',
    name: 'Müşteri Geri Dönüş Senaryosu',
    description: 'Kayıp müşterilerinizi geri kazanmak için iletişim senaryoları oluşturun.',
    icon: '🔄',
    category: 'satis',
    isAsync: false,
    n8nPath: 'kolay-kobi-geri',
  },
  {
    id: 'rakip-analiz',
    name: 'Rakip Analiz Panosu',
    description: 'Rakiplerinizin dijital varlığını analiz edin ve fırsatları keşfedin.',
    icon: '🔍',
    category: 'analiz',
    isAsync: false,
    n8nPath: 'kolay-kobi-rakip',
  },
  {
    id: 'chatbot-senaryo',
    name: 'Chatbot Senaryo Hazırlayıcı',
    description: 'Web siteniz veya WhatsApp için chatbot konuşma senaryoları oluşturun.',
    icon: '🤖',
    category: 'satis',
    isAsync: false,
    n8nPath: 'kolay-kobi-chatbot',
  },
  {
    id: 'ai-gorunurluk',
    name: 'AI Görünürlük Takipçisi',
    description: "ChatGPT, Gemini ve Copilot'ta işletmenizin ne kadar bilindiğini ölçün.",
    icon: '✨',
    category: 'analiz',
    isAsync: false,
    n8nPath: 'kolay-kobi-aivisibility',
  },
  {
    /*
     * MÜŞTERİYE AÇIK KALIYOR (12 Eyl 2026): senaryo üretimi çalışıyor ve
     * müşteriler kullanacak. Kapatılan yalnızca Trend Video Bulucu.
     */
    id: 'viral-video',
    name: 'Viral Video Uyarlayıcı',
    description: 'Viral videoları kendi işletmeniz için uyarlayın ve içerik üretin.',
    icon: '🎬',
    category: 'icerik',
    isAsync: false,
    n8nPath: 'kolay-kobi-viral',
  },
  {
    /*
     * Viral Video Uyarlayıcı'nın kopyası (4 Eyl 2026). Video üretimi (Veo) ve
     * linkten otomatik çözümleme burada geliştiriliyor; çalışan araç
     * bozulmasın diye ayrı tutuldu.
     *
     * active:false → tüm UI'dan gizli. Şu an ikizi olduğu için kullanıcıya
     * iki aynı araç göstermenin anlamı yok; ayrıştığında açılacak.
     */
    id: 'video-olusturma',
    name: 'Video Oluşturma',
    description: 'Bir video linki verin, işletmenize özel senaryo ve video üretilsin.',
    icon: '🎥',
    category: 'icerik',
    isAsync: false,
    n8nPath: 'kolay-kobi-video-olusturma',
    active: false,
    adminOnly: true,
    purchasable: false,
  },
  {
    /*
     * Seçilen uyarlamayı Veo ile gerçek videoya çevirir.
     *
     * Kullanıcı bunu Dashboard'dan AÇMIYOR — Video Oluşturma sayfasındaki
     * uyarlama kartlarından tetikleniyor. Bu yüzden active:false ve
     * adminOnly de YOK: hiçbir listede görünmesine gerek yok, yalnızca
     * kullanım sayacı ve backend eşlemesi için kayıtlı.
     */
    id: 'video-uret',
    name: 'Video Üretimi',
    description: 'Seçilen uyarlamayı Google Veo ile gerçek videoya çevirir.',
    icon: '🎞️',
    category: 'icerik',
    isAsync: true,
    n8nPath: 'kolay-kobi-video-uret',
    active: false,
    purchasable: false,
  },
  {
    /*
     * MÜŞTERİYE KAPALI (12 Eyl 2026, canlıya çıkış öncesi). active:false →
     * navigasyon, Dashboard, kullanım tablosu, PAKET KAPSAMI ve tek tek satın
     * alma listelerinden birlikte düşer; adminOnly:true → yalnızca yöneticinin
     * Dashboard'unda görünür. Apify maliyeti nedeniyle zaten paket dışıydı.
     */
    id: 'trend-video',
    name: 'Trend Video Bulucu',
    description: 'Sektörünüzdeki güncel viral videoları bulun ve adaptasyon önerileri alın.',
    icon: '📱',
    category: 'icerik',
    isAsync: true,
    n8nPath: 'kolay-kobi-trend',
    active: false,
    adminOnly: true,
    purchasable: false,
  },
]

/** active !== false olan araçlar — navigasyon, dashboard, kullanım tablosu, satın alma için */
export const ACTIVE_TOOLS = TOOLS.filter((t) => t.active !== false)

/**
 * Gizli ama admin'e gösterilecek araçlar — geliştirme aşamasındakiler.
 * Yalnızca Dashboard bunu ekler; navigasyon, satın alma ve kullanım tablosu
 * ACTIVE_TOOLS kullanmaya devam eder.
 */
export const ADMIN_ONLY_TOOLS = TOOLS.filter((t) => t.active === false && t.adminOnly === true)

/** Dashboard'da gösterilecek araç listesi. */
export function dashboardAraclari(isAdmin: boolean): Tool[] {
  return isAdmin ? [...ACTIVE_TOOLS, ...ADMIN_ONLY_TOOLS] : ACTIVE_TOOLS
}

/**
 * Dashboard ve sol menüdeki gruplama.
 *
 * 'video' kategorisi 29 Ağu 2026'da 'icerik' içine alındı: "İçerik Üretimi"
 * altında tek araç kalıyordu (30 Günlük İçerik Takvimi) ve tek kart bir satırın
 * solunda boşlukla duruyordu. Üç araç da aynı soruya hizmet ediyor —
 * "bu ay ne paylaşayım?" — ve Trend Video'nun "Bu Formatı Uyarla →" butonu
 * zaten doğrudan Viral Video'ya gidiyor.
 */
export const TOOL_CATEGORIES = {
  analiz: 'Analiz & Strateji',
  icerik: 'İçerik / Medya',
  satis: 'Satış & CRM',
} as const

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id)
}
