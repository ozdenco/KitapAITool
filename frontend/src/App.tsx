import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Layout } from '@/components/Layout'
import { AuthGuard } from '@/components/AuthGuard'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { HesabimLayout } from '@/pages/account/HesabimLayout'
import { AbonelikPage } from '@/pages/account/AbonelikPage'
import { AraclarimPage } from '@/pages/account/AraclarimPage'
import { ProfilBilgileriPage } from '@/pages/account/ProfilBilgileriPage'
import { SifreDegistirPage } from '@/pages/account/SifreDegistirPage'
import { KullanimGecmisiPage } from '@/pages/account/KullanimGecmisiPage'
import { ToolPage } from '@/pages/tools/ToolPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/giris" element={<LoginPage />} />
          <Route path="/kayit" element={<RegisterPage />} />
          <Route path="/e-posta-dogrula" element={<VerifyEmailPage />} />
          <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
          <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />

          {/* Protected */}
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/hesabim" element={<HesabimLayout />}>
              <Route index element={<Navigate to="abonelik" replace />} />
              <Route path="abonelik" element={<AbonelikPage />} />
              <Route path="araclarim" element={<AraclarimPage />} />
              <Route path="profil" element={<ProfilBilgileriPage />} />
              <Route path="sifre" element={<SifreDegistirPage />} />
              <Route path="kullanim-gecmisi" element={<KullanimGecmisiPage />} />
            </Route>
            <Route path="/arac/:toolId" element={<ToolPage />} />
          </Route>

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default function App() {
  // GoogleOAuthProvider yalnızca Client ID tanımlıysa wrap eder
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppRoutes />
      </GoogleOAuthProvider>
    )
  }
  return <AppRoutes />
}
