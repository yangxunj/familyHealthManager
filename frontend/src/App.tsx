import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Auth/Login';
import { AuthCallback } from './components/auth/AuthCallback';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import { DocumentList, DocumentUpload, DocumentDetail } from './pages/Documents';
import { RecordList, RecordAdd, RecordTrend } from './pages/Records';
import { AdvicePage } from './pages/Advice';
import { ChatPage } from './pages/Chat';
import FamilyPage from './pages/Family';
import { useAuthStore } from './store';

function RequireFamily({ children }: { children: React.ReactNode }) {
  const { hasFamily, isInitialized } = useAuthStore();
  const location = useLocation();

  if (isInitialized && !hasFamily && location.pathname !== '/family') {
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
            <Route path="upload" element={<DocumentUpload />} />
            <Route path=":id" element={<DocumentDetail />} />
          </Route>
          <Route path="records">
            <Route index element={<RecordList />} />
            <Route path="add" element={<RecordAdd />} />
            <Route path="trend" element={<RecordTrend />} />
          </Route>
          <Route path="advice" element={<AdvicePage />} />
          <Route path="chat" element={<ChatPage />} />
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
