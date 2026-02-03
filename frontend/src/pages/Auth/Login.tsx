import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Spin } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store';
import { isAuthEnabled } from '../../lib/supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, isLoading, isAuthenticated, isInitialized } = useAuthStore();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate, location]);

  // If auth is not enabled, redirect to home
  useEffect(() => {
    if (!isAuthEnabled) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, margin: 0, color: '#1890ff' }}>
            家庭健康管理平台
          </h1>
          <p style={{ color: '#999', marginTop: 8 }}>
            管理您和家人的健康数据
          </p>
        </div>

        <Button
          type="primary"
          icon={<GoogleOutlined />}
          size="large"
          block
          loading={isLoading}
          onClick={handleGoogleLogin}
          style={{
            height: 48,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          使用 Google 账号登录
        </Button>

        <p
          style={{
            textAlign: 'center',
            color: '#999',
            marginTop: 24,
            fontSize: 12,
          }}
        >
          点击登录即表示您同意我们的服务条款
        </p>
      </Card>
    </div>
  );
};

export default Login;
