import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ChartPage = lazy(() => import('./pages/ChartPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const StationsPage = lazy(() => import('./pages/StationsPage'));
const StationDetailPage = lazy(() => import('./pages/StationDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DataHistoryPage = lazy(() => import('./pages/DataHistoryPage'));
const SubscribePage = lazy(() => import('./pages/SubscribePage'));
const CitizenRegisterPage = lazy(() => import('./pages/CitizenRegisterPage'));
const ManagementHubPage = lazy(() => import('./pages/ManagementHubPage'));
const SetupCredentialsPage = lazy(() => import('./pages/SetupCredentialsPage'));
const NotificationHubPage = lazy(() => import('./pages/NotificationHubPage'));

function PageFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 14,
        color: 'var(--text-secondary, #94A3B8)',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          border: '3px solid rgba(14, 165, 233, 0.2)',
          borderTopColor: 'var(--color-primary, #0284C7)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ fontSize: 13, fontWeight: 500 }}>กำลังโหลดข้อมูลหน้าจอ...</div>
    </div>
  );
}

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
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Flood</span>
          <span style={{ color: '#38BDF8' }}>Guard</span>
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
        path="/stations/:stationId"
        element={
          <ProtectedRoute requiredRoles={['staff', 'admin']}>
            <Layout>
              <StationDetailPage />
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
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowGuest>
            <Layout>
              <NotificationHubPage />
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
                <Suspense fallback={<PageFallback />}>
                  <AppRoutes />
                </Suspense>
              </ErrorBoundary>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
