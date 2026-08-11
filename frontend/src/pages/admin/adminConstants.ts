// ─── Shared types, constants, and helpers for admin pages ─────────────────────

export interface MonthlyStat {
  monthYear: string
  totalUsed: number
  activeUsers: number
  newRegistrations: number
}

export interface ToolBreakdown {
  toolId: string
  totalUsed: number
}

export interface AdminStats {
  totalUsers: number
  totalEvaluations: number
  activeUsers: number
  monthlyStats: MonthlyStat[]
  toolBreakdown: ToolBreakdown[]
}

export interface AdminPlan {
  id: number
  type: string
  name: string
  description: string
  priceMonthly: number
  usagePerToolPerMonth: number | null
  pricePerUse: number | null
  isActive: boolean
  periodType: number   // 0=Monthly, 1=Daily, 2=Yearly, 3=DateRange
  periodDays: number | null
  periodStartDate: string | null
  periodEndDate: string | null
}

export const PERIOD_TYPE_LABELS: Record<number, string> = {
  0: 'Aylık',
  1: 'Günlük',
  2: 'Yıllık',
  3: 'Belirli Tarih Aralığı',
}

export const TOOL_LABELS: Record<string, string> = {
  'gorunurluk-skoru':   'Görünürlük Skoru',
  'musteri-persona':    'Müşteri Persona',
  'icerik-takvimi':     'İçerik Takvimi',
  'whatsapp-satis':     'WhatsApp Script',
  'reklam-butce':       'Reklam Bütçe',
  'musteri-geri-donus': 'Geri Dönüş',
  'rakip-analiz':       'Rakip Analiz',
  'chatbot-senaryo':    'Chatbot Senaryo',
  'ai-gorunurluk':      'AI Görünürlük',
  'viral-video':        'Viral Video',
  'trend-video':        'Trend Video',
}

export const PLAN_LABELS: Record<string, string> = {
  free: 'Ücretsiz', standard: 'Standart', premium: 'Premium', enterprise: 'Kurumsal',
}

export const PLAN_COLORS: Record<string, string> = {
  free:       'bg-gray-100 text-gray-600',
  standard:   'bg-blue-100 text-blue-700',
  premium:    'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const ms  = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1)  return 'Az önce'
  if (min < 60) return `${min} dk önce`
  const hr  = Math.floor(min / 60)
  if (hr  < 24) return `${hr} saat önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} gün önce`
  return formatDate(iso)
}

export function shortMonth(monthYear: string) {
  const [y, m] = monthYear.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
}
