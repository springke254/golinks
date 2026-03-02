import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { ROUTES } from './utils/constants';
import Spinner from './components/ui/Spinner';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Workspace pages
import OnboardingPage from './pages/onboarding/OnboardingPage';
import InviteAcceptPage from './pages/invite/InviteAcceptPage';

// Short URL redirect passthrough
import GoRedirect from './pages/GoRedirect';

// App pages
import DashboardPage from './pages/dashboard/DashboardPage';
import LinksPage from './pages/links/LinksPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import AuditPage from './pages/audit/AuditPage';
import SettingsPage from './pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/** Route guard — redirects unauthenticated users to login */
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}

/** Route guard — redirects authenticated users to dashboard */
function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}

/** Protected route that also checks for workspace — redirects to onboarding if none */
function WorkspaceGuard() {
  const { hasWorkspace, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hasWorkspace) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Short URL passthrough — before any guards */}
      <Route path="/go/:slug" element={<GoRedirect />} />

      {/* Guest-only routes (auth pages) */}
      <Route element={<GuestRoute />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      </Route>

      {/* Public routes */}
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
      <Route path={ROUTES.INVITE} element={<InviteAcceptPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding — shown when user has no workspace */}
        <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />

        {/* App shell — requires workspace */}
        <Route element={<WorkspaceGuard />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.LINKS} element={<LinksPage />} />
            <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            <Route path={ROUTES.AUDIT} element={<AuditPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <AppRoutes />
          </WorkspaceProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'go-toast',
              style: {
                background: '#282828',
                color: '#FFFFFF',
                border: '2px solid #3E3E3E',
                borderRadius: '12px',
              },
              success: {
                iconTheme: { primary: '#1DB954', secondary: '#FFFFFF' },
              },
              error: {
                iconTheme: { primary: '#E35454', secondary: '#FFFFFF' },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
