import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/lib/analytics'

/**
 * SPA sayfa geçişlerini Posthog'a bildirir.
 * BrowserRouter içinde, tek bir yerde çağır (App.tsx AppRoutes içi).
 */
export function useAnalyticsPageView(): void {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])
}
