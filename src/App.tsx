import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChartPage from './pages/ChartPage';
import UsersPage from './pages/UsersPage';
import StationsPage from './pages/StationsPage';
import ProfilePage from './pages/ProfilePage';
import DataHistoryPage from './pages/DataHistoryPage';
import SubscribePage from './pages/SubscribePage';
import CitizenRegisterPage from './pages/CitizenRegisterPage';
import ManagementHubPage from './pages/ManagementHubPage';
import SetupCredentialsPage from './pages/SetupCredentialsPage';

/**
 * Automatically handle LINE LIFF deep-link forwarding (?liff.state=/path)
 */
function LiffRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const liffState = params.get('liff.state');
    if (liffState) {
      try {
        const decodedPath = decodeURIComponent(liffState);
        if (decodedPath.startsWith('/') && decodedPath !== location.pathname) {
          params.delete('liff.state');
          const remainingSearch = params.toString() ? `?${params.toString()}` : '';
          navigate(`${decodedPath}${remainingSearch}`, { replace: true });
        }
      } catch (e) {
        console.warn('[LIFF] Failed to decode liff.state:', e);
      }
    }
  }, [location, navigate]);

  return null;
}

function RootRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: '/dashboard', search: location.search }} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRoute({
  children,
  allowGuest = false,
  requiredRoles,
}: {
  children: React.ReactNode;
  allowGuest?: boolean;
  requiredRoles?: ('citizen' | 'staff' | 'admin')[];
}) {
  const { user, isGuest, isLoading, loginAsCitizen } = useAuth();

  useEffect(() => {
    if (!isLoading && !user && allowGuest) {
      loginAsCitizen();
    }
  }, [user, isLoading, allowGuest, loginAsCitizen]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 45%, #818CF8 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FloodGuard
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>กำลังเชื่อมต่อระบบเตือนภัยน้ำ FloodGuard...</div>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(14,165,233,0.2)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Auto-grant citizen access for public citizen routes if not logged in
  if (!user && allowGuest) {
    return <>{children}</>;
  }

  if (!user || (isGuest && !allowGuest)) return <Navigate to="/login" replace />;

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    // If visitor or citizen tries to access staff/admin routes, send to login
    if (user.role === 'citizen') {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isGuest } = useAuth();
  const isAuthenticated = Boolean(user && !isGuest);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/setup-credentials" element={<SetupCredentialsPage />} />
      <Route path="/register" element={<CitizenRegisterPage />} />
      <Route path="/subscribe" element={<SubscribePage />} />
      <Route
        path="/nodes/:nodeId"
        element={
          <ProtectedRoute allowGuest>
            <Layout>
              <ChartPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowGuest>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chart"
        element={
          <ProtectedRoute allowGuest>
            <Layout>
              <ChartPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/management"
        element={
          <ProtectedRoute allowGuest>
            <Layout>
              <ManagementHubPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <Layout>
              <UsersPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stations"
        element={
          <ProtectedRoute requiredRoles={['staff', 'admin']}>
            <Layout>
              <StationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute allowGuest>
            <Layout>
              <DataHistoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LiffRedirectHandler />
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
