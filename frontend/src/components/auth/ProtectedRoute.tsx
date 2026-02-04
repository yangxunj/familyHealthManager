/**
 * Protected route component
 * Reference: banana-slides/frontend/src/components/auth/ProtectedRoute.tsx
 */
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../store';
import { isAuthEnabled } from '../../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  // If auth is not enabled, allow access without login
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
