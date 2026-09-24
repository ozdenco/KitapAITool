import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'

/** Hareketsizlik sınırı — bu süre sonunda oturum kapatılır. */
export const BOSTA_KALMA_SINIRI_DK = 30

/** Son etkinlik zamanı sekmeler arasında paylaşılır. */
const SON_ETKINLIK_ANAHTARI = 'kkb-son-etkinlik'

const ETKINLIK_OLAYLARI = [
  'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'focus',
] as const

/** Yazma sıklığını sınırla — her fare hareketinde localStorage'a yazmayalım. */
const YAZMA_ARALIGI_MS = 15_000

function simdi(): number {
  return Date.now()
}

function sonEtkinligiOku(): number {
  try {
    const deger = localStorage.getItem(SON_ETKINLIK_ANAHTARI)
    const sayi = deger ? Number(deger) : NaN
    return Number.isFinite(sayi) ? sayi : simdi()
  } catch {
    return simdi()
  }
}

function sonEtkinligiYaz(zaman: number): void {
  try {
    localStorage.setItem(SON_ETKINLIK_ANAHTARI, String(zaman))
  } catch {
    /* depolama yoksa yalnızca bu sekmede takip edilir */
  }
}

/**
 * Kullanıcı 30 dakika hiçbir işlem yapmazsa oturumu kapatır.
 *
 * NEDEN: Erişim jetonu 60 dk, yenileme jetonu 30 gün geçerli olduğu için
 * hareketsiz kullanıcı günlerce açık kalabiliyordu. Ortak kullanılan bir
 * bilgisayarda bu risk.
 *
 * Etkinlik zamanı localStorage üzerinden sekmeler arasında paylaşılır;
 * başka bir sekmede çalışan kullanıcı bu sekmede de "aktif" sayılır.
 *
 * SINIR: Bu koruma istemci tarafındadır. Tarayıcı depolamasına doğrudan
 * erişebilen biri jetonu kullanmaya devam edebilir. Sunucu tarafında da
 * zorlamak için her isteğe son-etkinlik damgası yazılması gerekir.
 */
export function useIdleTimeout(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const sonYazma = useRef(0)

  useEffect(() => {
    if (!isAuthenticated) return

    const sinirMs = BOSTA_KALMA_SINIRI_DK * 60_000

    const oturumuKapat = () => {
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem(SON_ETKINLIK_ANAHTARI)
      } catch { /* yok say */ }

      useAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/giris')) {
        window.location.href = '/giris?oturum=bosta'
      }
    }

    // Açılışta kontrol: tarayıcı kapatılıp uzun süre sonra açıldıysa
    // sayacı sıfırlamak yerine oturumu kapat. Aksi hâlde ortak bir
    // bilgisayarda "tarayıcıyı aç" hareketi korumayı boşa çıkarırdı.
    const kayitli = localStorage.getItem(SON_ETKINLIK_ANAHTARI)
    if (kayitli && simdi() - sonEtkinligiOku() >= sinirMs) {
      oturumuKapat()
      return
    }
    if (!kayitli) sonEtkinligiYaz(simdi())

    const etkinlikOldu = () => {
      const an = simdi()
      if (an - sonYazma.current < YAZMA_ARALIGI_MS) return
      sonYazma.current = an
      sonEtkinligiYaz(an)
    }

    for (const olay of ETKINLIK_OLAYLARI) {
      window.addEventListener(olay, etkinlikOldu, { passive: true })
    }

    const sayac = window.setInterval(() => {
      if (simdi() - sonEtkinligiOku() >= sinirMs) oturumuKapat()
    }, 30_000)

    return () => {
      for (const olay of ETKINLIK_OLAYLARI) {
        window.removeEventListener(olay, etkinlikOldu)
      }
      window.clearInterval(sayac)
    }
  }, [isAuthenticated])
}
