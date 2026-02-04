import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Spin, Grid } from 'antd';
import { GoogleOutlined, HeartOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store';
import { isAuthEnabled } from '../../lib/supabase';

const { useBreakpoint } = Grid;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, isLoading, isAuthenticated, isInitialized } = useAuthStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
          minHeight: '100dvh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--color-bg-page)',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {/* 左侧品牌面板 */}
      {!isMobile && (
        <div
          style={{
            flex: '0 0 45%',
            background: 'linear-gradient(135deg, #136dec 0%, #0d5bc4 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 48,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 装饰圆 */}
          <div style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.04)',
          }} />

          <HeartOutlined style={{ fontSize: 64, marginBottom: 32, opacity: 0.9 }} />
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            margin: 0,
            marginBottom: 16,
            letterSpacing: 1,
          }}>
            家庭健康管理
          </h1>
          <p style={{
            fontSize: 18,
            opacity: 0.85,
            marginBottom: 48,
            fontWeight: 500,
          }}>
            守护全家人的健康
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            opacity: 0.75,
            fontSize: 15,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              健康数据全家共享
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              AI 智能健康建议
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              趋势分析与预警
            </div>
          </div>
        </div>
      )}

      {/* 右侧登录面板 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isMobile ? 24 : 48,
          background: 'var(--color-bg-container)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* 移动端显示 Logo */}
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <HeartOutlined style={{ fontSize: 40, color: '#136dec' }} />
            </div>
          )}

          <h1 style={{
            fontSize: isMobile ? 24 : 28,
            fontWeight: 700,
            margin: 0,
            color: 'var(--color-text-primary)',
            textAlign: 'center',
          }}>
            家庭健康管理平台
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            marginTop: 8,
            marginBottom: 40,
            textAlign: 'center',
            fontSize: 15,
          }}>
            管理您和家人的健康数据
          </p>

          <Button
            type="primary"
            icon={<GoogleOutlined />}
            size="large"
            block
            loading={isLoading}
            onClick={handleGoogleLogin}
            style={{
              height: 52,
              fontSize: 16,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            使用 Google 账号登录
          </Button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 24,
            color: 'var(--color-text-quaternary)',
            fontSize: 12,
          }}>
            <LockOutlined style={{ fontSize: 12 }} />
            <span>安全加密传输</span>
          </div>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-text-quaternary)',
              marginTop: 16,
              fontSize: 12,
            }}
          >
            点击登录即表示您同意我们的服务条款
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
