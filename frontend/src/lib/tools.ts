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
    id: 'viral-video',
    name: 'Viral Video Uyarlayıcı',
    description: 'Viral videoları kendi işletmeniz için uyarlayın ve içerik üretin.',
    icon: '🎬',
    category: 'video',
    isAsync: false,
    n8nPath: 'kolay-kobi-viral',
  },
  {
    id: 'trend-video',
    name: 'Trend Video Bulucu',
    description: 'Sektörünüzdeki güncel viral videoları bulun ve adaptasyon önerileri alın.',
    icon: '📱',
    category: 'video',
    isAsync: true,
    n8nPath: 'kolay-kobi-trend',
  },
]

export const TOOL_CATEGORIES = {
  analiz: 'Analiz & Strateji',
  icerik: 'İçerik Üretimi',
  satis: 'Satış & CRM',
  video: 'Video & Trend',
} as const

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id)
}
