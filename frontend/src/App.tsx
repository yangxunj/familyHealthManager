import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import { DocumentList, DocumentUpload, DocumentDetail } from './pages/Documents';
import { RecordList, RecordAdd, RecordTrend } from './pages/Records';
import { AdvicePage } from './pages/Advice';
import { useAuthStore } from './store';

// 路由守卫组件 - 需要登录
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// 公共路由组件 - 已登录则跳转到首页
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (isAuthenticated && accessToken) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公共路由 */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* 受保护的路由 */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
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
          <Route path="chat" element={<div>AI健康咨询（待开发）</div>} />
          <Route path="settings" element={<div>设置（待开发）</div>} />
        </Route>

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
