/**
 * Analytics — Posthog entegrasyonu
 *
 * Kullanım:
 *   initAnalytics()              → main.tsx'te çağır
 *   identifyUser(user)           → giriş / AuthGuard'da çağır
 *   resetAnalyticsUser()         → çıkışta çağır
 *   trackEvent(name, props?)     → herhangi bir yerde özel event
 *
 * Ortam değişkeni:
 *   VITE_POSTHOG_KEY = phc_xxxxxxxxxxxx   (.env.local'e ekle)
 */

import posthog from 'posthog-js'
import type { User } from '@/types'

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined ?? 'https://eu.i.posthog.com'

// ─── Init ────────────────────────────────────────────────────────────────────

export function initAnalytics(): void {
  if (!POSTHOG_KEY) return  // key yoksa sessizce atla

  posthog.init(POSTHOG_KEY, {
    api_host:              POSTHOG_HOST,
    person_profiles:       'identified_only',   // anonim profil oluşturma
    capture_pageview:      false,               // manuel yönetiyoruz (SPA)
    capture_pageleave:     true,
    session_recording: {
      maskAllInputs:       true,                // form alanlarını gizle (KVKK)
    },
    autocapture:           true,                // tıklama / girdi otomatik yakalanır
  })
}

// ─── Kullanıcı tanımlama ──────────────────────────────────────────────────────

export function identifyUser(user: User): void {
  if (!POSTHOG_KEY) return

  posthog.identify(user.id, {
    email:    user.email,
    name:     user.name,
    plan:     user.planType,
    is_admin: user.isAdmin,
  })
}

export function resetAnalyticsUser(): void {
  if (!POSTHOG_KEY) return
  posthog.reset()
}

// ─── Sayfa görüntüleme (SPA — manuel) ────────────────────────────────────────

export function trackPageView(path: string): void {
  if (!POSTHOG_KEY) return
  posthog.capture('$pageview', { $current_url: window.location.origin + path })
}

// ─── Genel event ─────────────────────────────────────────────────────────────

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return
  posthog.capture(name, properties)
}

// ─── Uygulama olayları ───────────────────────────────────────────────────────

/** Kullanıcı araç sayfasını açtı */
export function trackToolOpened(toolId: string, toolName: string): void {
  trackEvent('tool_opened', { tool_id: toolId, tool_name: toolName })
}

/** Kullanıcı araç formunu gönderdi (n8n çağrısı başladı) */
export function trackToolSubmitted(toolId: string, toolName: string): void {
  trackEvent('tool_submitted', { tool_id: toolId, tool_name: toolName })
}

/** Araç sonucu başarıyla döndü */
export function trackToolCompleted(toolId: string, toolName: string, durationMs?: number): void {
  trackEvent('tool_completed', {
    tool_id: toolId,
    tool_name: toolName,
    ...(durationMs != null && { duration_ms: Math.round(durationMs), duration_s: Math.round(durationMs / 100) / 10 }),
  })
}

/** Kullanıcı ödeme sayfasına gitti */
export function trackPaymentInitiated(planOrTool: string, price: number): void {
  trackEvent('payment_initiated', { item: planOrTool, price })
}

/** Ödeme başarıyla tamamlandı */
export function trackPaymentCompleted(planOrTool: string, price: number): void {
  trackEvent('payment_completed', { item: planOrTool, price })
}

/** Yeni kullanıcı kaydı */
export function trackSignUp(method: 'email' | 'google'): void {
  trackEvent('sign_up', { method })
}
