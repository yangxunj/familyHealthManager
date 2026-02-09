import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
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
import FamilyPage from './pages/Family';
import HealthPlanPage from './pages/HealthPlan';
import VaccinationList from './pages/Vaccinations/VaccinationList';
import CheckupList from './pages/Checkups/CheckupList';
import { useAuthStore } from './store';

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

function App() {
  const { initialize, isInitialized } = useAuthStore();

  // Initialize authentication
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return (
    <BrowserRouter>
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
          <Route path="health-plan" element={<HealthPlanPage />}>
            <Route index element={<Navigate to="/health-plan/vaccinations" replace />} />
            <Route path="vaccinations" element={<VaccinationList />} />
            <Route path="checkups" element={<CheckupList />} />
          </Route>
          <Route path="family" element={<FamilyPage />} />
          <Route path="settings" element={<div>设置（待开发）</div>} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
