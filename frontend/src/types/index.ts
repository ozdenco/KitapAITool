// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
  isAdmin: boolean   // Admin kullanıcılar sınırsız kullanım hakkı alır (backend limit=null gönderir)
  planType: PlanType // Aktif abonelik planı
  createdAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

// ─── Plans & Subscriptions ───────────────────────────────────────────────────

/**
 * Abonelik plan tipleri:
 *  free       → 3 kullanım/araç/ay,  sınırlı araç erişimi
 *  standard   → 10 kullanım/araç/ay, tüm araçlar
 *  premium    → 25 kullanım/araç/ay, tüm araçlar + öncelikli destek
 *  enterprise → Özel müzakere edilen limit (ör. 100/ay), tüm araçlar
 *  admin      → Sınırsız (dahili kullanıcılar — veritabanında saklanmaz,
 *               users.is_admin alanından türetilir)
 */
export type PlanType = 'free' | 'standard' | 'premium' | 'enterprise'

export interface Plan {
  id: string
  name: string
  type: PlanType
  priceMonthly: number
  /**
   * Araç başına aylık kullanım limiti:
   * - free/standard/premium: sabit sayı (3 | 10 | 25)
   * - enterprise: kullanıcıya özel müzakere edilen sayı (ör. 100)
   * - null: sadece admin — sınırsız
   */
  toolLimitPerMonth: number | null
  description: string
  features: string[]
}

export interface Subscription {
  id: string
  planId: string
  plan: Plan
  status: 'active' | 'cancelled' | 'expired'
  currentPeriodStart: string
  currentPeriodEnd: string
}

// ─── Tools ───────────────────────────────────────────────────────────────────
export type ToolId =
  | 'gorunurluk-skoru'
  | 'musteri-persona'
  | 'icerik-takvimi'
  | 'whatsapp-satis'
  | 'reklam-butce'
  | 'musteri-geri-donus'
  | 'rakip-analiz'
  | 'chatbot-senaryo'
  | 'ai-gorunurluk'
  | 'viral-video'
  | 'trend-video'

export interface Tool {
  id: ToolId
  name: string
  description: string
  icon: string
  category: 'analiz' | 'icerik' | 'satis' | 'video'
  isAsync: boolean  // İçerik Takvimi ve Trend Video async çalışır
  n8nPath: string
}

export interface ToolUsage {
  toolId: ToolId
  usedCount: number
  /**
   * Backend'in çözümlediği efektif limit.
   * Tüm mantık (plan mi, tekil araç mı, enterprise özel limit mi)
   * backend tarafında halledilir — frontend sadece bu sayıyı gösterir.
   *
   * null = sınırsız (yalnızca admin kullanıcılar)
   */
  limit: number | null
  /**
   * Rate-bar'da gösterilecek kısa etiket.
   * Backend tarafından üretilir — frontend olduğu gibi gösterir.
   * Örnekler: "Ücretsiz" | "Standart" | "Premium" | "Kurumsal" | "Tekil" | "Admin"
   */
  planLabel: string
  monthYear: string  // "2026-08"
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ─── Tool Payloads (BRD'den JSON şemaları) ───────────────────────────────────
export interface GorunurlukSkoruPayload {
  isletme_adi: string
  sehir: string
  sektor: string
  web_sitesi: string
  google_isletme_profili: boolean
  sosyal_medya: string[]
}

export interface MusteriPersonaPayload {
  isletme_adi: string
  urun_hizmet: string
  mevcut_musteriler: string
  hedef_kitle: string
  cografya: string
  fiyat_araligi: string
}

export interface IcerikTakvimiPayload {
  isletme_adi: string
  sektor: string
  hedef_kitle: string
  urun_hizmet: string
  platformlar: string[]
  sure_hafta: 1 | 2 | 4
  ton: 'profesyonel' | 'samimi' | 'eglenceli' | 'bilgilendirici'
}
