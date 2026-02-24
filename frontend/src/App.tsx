import { useEffect, useState, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Auth/Login';
import { AuthCallback } from './components/auth/AuthCallback';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import { DocumentList, DocumentDetail } from './pages/Documents';
import { RecordList, RecordTrend } from './pages/Records';
import { AdvicePage } from './pages/Advice';
import { ChatPage } from './pages/Chat';
import { FoodQueryPage } from './pages/FoodQuery';
import FamilyPage from './pages/Family';
import HealthPlanPage from './pages/HealthPlan';
import VaccinationList from './pages/Vaccinations/VaccinationList';
import CheckupList from './pages/Checkups/CheckupList';
import SettingsPage from './pages/Settings';
import ServerSetup from './pages/ServerSetup';
import { useAuthStore } from './store';
import { isNativePlatform, isRemoteLoaded, APP_SCHEME } from './lib/capacitor';
import { supabase } from './lib/supabase';
import { isServerConfigured, getServerUrl, clearServerConfig } from './lib/serverConfig';

function RequireFamily({ children }: { children: React.ReactNode }) {
  const { hasFamily, isInitialized, isFamilyLoaded } = useAuthStore();
  const location = useLocation();

  // 家庭数据尚未加载完成，显示加载状态，阻止子组件渲染和 API 调用
  if (isInitialized && !isFamilyLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isInitialized && isFamilyLoaded && !hasFamily && location.pathname !== '/family') {
    return <Navigate to="/family" replace />;
  }
  return <>{children}</>;
}

/**
 * Handle deep links from OAuth in Capacitor.
 * When the in-app browser completes OAuth, the system sends a deep link
 * like `com.familyhealth.app://auth/callback#access_token=...`
 * We extract the tokens, set the Supabase session, and navigate to /auth/callback.
 */
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App: CapApp } = await import('@capacitor/app');
      const { Browser } = await import('@capacitor/browser');

      const listener = await CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith(APP_SCHEME)) return;

        // Close the in-app browser
        try { await Browser.close(); } catch { /* may already be closed */ }

        // Extract tokens from the URL hash fragment
        const hashPart = url.split('#')[1];
        if (hashPart && supabase) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }

        // Navigate to auth callback page to complete the login flow
        navigate('/auth/callback', { replace: true });
      });

      cleanup = () => listener.remove();
    };

    setup();
    return () => cleanup?.();
  }, [navigate]);

  return null;
}

/**
 * Handle Android hardware back button in Capacitor.
 * - On main tab routes: double-tap to minimize the app
 * - On sub-routes: navigate back in history
 */
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const lastBackTimeRef = useRef(0);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!isNativePlatform) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App: CapApp } = await import('@capacitor/app');

      const listener = await CapApp.addListener('backButton', () => {
        const pathname = pathnameRef.current;
        const mainRoutes = [
          '/dashboard', '/members', '/documents', '/records',
          '/advice', '/chat', '/food-query', '/health-plan',
          '/family', '/settings', '/login',
        ];
        const isMainRoute = mainRoutes.includes(pathname) || pathname === '/';

        if (isMainRoute) {
          const now = Date.now();
          if (now - lastBackTimeRef.current < 2000) {
            CapApp.minimizeApp();
          } else {
            lastBackTimeRef.current = now;
            message.info('再按一次返回键退出应用');
          }
        } else {
          navigate(-1);
        }
      });

      cleanup = () => listener.remove();
    };

    setup();
    return () => cleanup?.();
  }, [navigate]);

  return null;
}

// Handle ?reset_server=1 parameter (sent from remote frontend when changing server)
if (isNativePlatform && !isRemoteLoaded()) {
  const params = new URLSearchParams(window.location.search);
  if (params.has('reset_server')) {
    clearServerConfig();
    window.history.replaceState({}, '', '/');
  }
}

function App() {
  const { initialize, isInitialized } = useAuthStore();
  const [serverReady, setServerReady] = useState(
    !isNativePlatform || isServerConfigured() || isRemoteLoaded()
  );
  const [redirecting, setRedirecting] = useState(false);

  // Capacitor (bundled): if server is configured, redirect to remote frontend
  useEffect(() => {
    if (isNativePlatform && !isRemoteLoaded() && isServerConfigured()) {
      const serverUrl = getServerUrl();
      if (serverUrl) {
        setRedirecting(true);
        window.location.href = serverUrl;
      }
    }
  }, []);

  const handleServerConfigured = useCallback(() => {
    // After server setup, redirect to the remote server instead of loading bundled app
    const serverUrl = getServerUrl();
    if (serverUrl) {
      setRedirecting(true);
      window.location.href = serverUrl;
    } else {
      setServerReady(true);
    }
  }, []);

  // Initialize authentication (only after server is configured)
  useEffect(() => {
    if (serverReady && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized, serverReady]);

  // Show loading while redirecting to remote server
  if (redirecting) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <Spin size="large" tip="正在连接服务器..." />
      </div>
    );
  }

  // Capacitor: show server setup if not configured
  if (isNativePlatform && !serverReady) {
    return <ServerSetup onComplete={handleServerConfigured} />;
  }

  return (
    <BrowserRouter>
      <DeepLinkHandler />
      <BackButtonHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RequireFamily>
                <MainLayout />
              </RequireFamily>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members/*" element={<Members />} />
          <Route path="documents">
            <Route index element={<DocumentList />} />
            <Route path=":id" element={<DocumentDetail />} />
          </Route>
          <Route path="records">
            <Route index element={<RecordList />} />
            <Route path="trend" element={<RecordTrend />} />
          </Route>
          <Route path="advice" element={<AdvicePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="food-query" element={<FoodQueryPage />} />
          <Route path="health-plan" element={<HealthPlanPage />}>
            <Route index element={<Navigate to="/health-plan/vaccinations" replace />} />
            <Route path="vaccinations" element={<VaccinationList />} />
            <Route path="checkups" element={<CheckupList />} />
          </Route>
          <Route path="family" element={<FamilyPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
