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
import { GecmisCiktilarPage } from '@/pages/account/GecmisCiktilarPage'
import { PaketSecPage } from '@/pages/account/PaketSecPage'
import { OdemeSonucPage } from '@/pages/account/OdemeSonucPage'
import { OdemeGecmisiPage } from '@/pages/account/OdemeGecmisiPage'
import { AracKullanimPage } from '@/pages/account/AracKullanimPage'
import { ToolPage } from '@/pages/tools/ToolPage'
import { AdminGuard } from '@/components/AdminGuard'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminIstatistiklerPage } from '@/pages/admin/AdminIstatistiklerPage'
import { AdminKullaniciListesiPage } from '@/pages/admin/AdminKullaniciListesiPage'
import { AdminKullaniciIslemleriPage } from '@/pages/admin/AdminKullaniciIslemleriPage'
import { AdminPaketIslemleriPage } from '@/pages/admin/AdminPaketIslemleriPage'
import { AdminKullaniciGecmisiPage } from '@/pages/admin/AdminKullaniciGecmisiPage'
import { AdminKullanimRaporuPage } from '@/pages/admin/AdminKullanimRaporuPage'
import { AdminRaporDetayPage } from '@/pages/admin/AdminRaporDetayPage'
import { AdminAracFiyatlariPage } from '@/pages/admin/AdminAracFiyatlariPage'

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

            {/* Account */}
            <Route path="/hesabim" element={<HesabimLayout />}>
              <Route index element={<Navigate to="abonelik" replace />} />
              <Route path="abonelik"         element={<AbonelikPage />} />
              <Route path="araclarim"        element={<AraclarimPage />} />
              <Route path="profil"           element={<ProfilBilgileriPage />} />
              <Route path="sifre"            element={<SifreDegistirPage />} />
              <Route path="kullanim-gecmisi" element={<KullanimGecmisiPage />} />
              <Route path="gecmis-ciktilar"  element={<GecmisCiktilarPage />} />
              <Route path="paket-sec"        element={<PaketSecPage />} />
              <Route path="odeme-sonuc"     element={<OdemeSonucPage />} />
              <Route path="odeme-gecmisi"   element={<OdemeGecmisiPage />} />
              <Route path="arac-kullanim"   element={<AracKullanimPage />} />
            </Route>

            <Route path="/arac/:toolId" element={<ToolPage />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              }
            >
              <Route index element={<Navigate to="istatistikler" replace />} />
              <Route path="istatistikler"       element={<AdminIstatistiklerPage />} />
              <Route path="kullanici-listesi"   element={<AdminKullaniciListesiPage />} />
              <Route path="kullanici-islemleri" element={<AdminKullaniciIslemleriPage />} />
              <Route path="paket-islemleri"     element={<AdminPaketIslemleriPage />} />
              <Route path="arac-fiyatlari"      element={<AdminAracFiyatlariPage />} />
              <Route path="kullanim-raporu"     element={<AdminKullanimRaporuPage />} />
            </Route>

            {/* Admin: user usage history — outside AdminLayout (full-page) */}
            <Route
              path="/admin/kullanici/:userId/gecmis"
              element={
                <AdminGuard>
                  <AdminKullaniciGecmisiPage />
                </AdminGuard>
              }
            />

            {/* Admin: rapor detay — outside AdminLayout (full-page) */}
            <Route
              path="/admin/rapor/:resultId"
              element={
                <AdminGuard>
                  <AdminRaporDetayPage />
                </AdminGuard>
              }
            />
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
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppRoutes />
      </GoogleOAuthProvider>
    )
  }
  return <AppRoutes />
}
