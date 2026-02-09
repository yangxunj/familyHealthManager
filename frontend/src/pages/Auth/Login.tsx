import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Spin, Grid, message } from 'antd';
import { GoogleOutlined, HeartOutlined, LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store';
import { isAuthEnabled, supabase } from '../../lib/supabase';

const { useBreakpoint } = Grid;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, signInWithMagicLink, isLoading, isAuthenticated, isInitialized } = useAuthStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Email OTP state
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  const handleSendCode = async () => {
    setOtpError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setOtpError('请输入邮箱地址');
      return;
    }

    const result = await signInWithMagicLink(email.trim());

    if (result.success) {
      setStep('code');
      setSuccessMessage('验证码已发送到您的邮箱');
      setResendCountdown(60);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } else {
      setOtpError(result.error || '发送验证码失败');
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 8 || !supabase) return;

    setIsVerifying(true);
    setOtpError('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'email',
      });

      if (error) throw error;

      navigate('/auth/callback', { replace: true });
    } catch {
      setOtpError('验证码无效，请重试');
      setVerificationCode(['', '', '', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 7) {
      codeInputRefs.current[index + 1]?.focus();
    }

    if (value && index === 7 && newCode.every((c) => c)) {
      setTimeout(() => handleVerifyCode(), 100);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (pastedData) {
      const newCode = [...verificationCode];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setVerificationCode(newCode);
      const focusIndex = Math.min(pastedData.length, 7);
      codeInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setVerificationCode(['', '', '', '', '', '', '', '']);
    setOtpError('');
    setSuccessMessage('');
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
            marginBottom: 32,
            textAlign: 'center',
            fontSize: 15,
          }}>
            管理您和家人的健康数据
          </p>

          {/* 错误提示 */}
          {otpError && (
            <div style={{
              padding: '10px 16px',
              marginBottom: 16,
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 8,
              color: '#ff4d4f',
              fontSize: 14,
            }}>
              {otpError}
            </div>
          )}

          {/* 成功提示 */}
          {successMessage && (
            <div style={{
              padding: '10px 16px',
              marginBottom: 16,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8,
              color: '#52c41a',
              fontSize: 14,
            }}>
              {successMessage}
            </div>
          )}

          {step === 'email' ? (
            <>
              {/* 邮箱输入 */}
              <div style={{ marginBottom: 16 }}>
                <Input
                  size="large"
                  prefix={<MailOutlined style={{ color: 'var(--color-text-quaternary)' }} />}
                  placeholder="请输入邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onPressEnter={handleSendCode}
                  disabled={isLoading}
                  style={{ height: 52, borderRadius: 12, fontSize: 15 }}
                />
              </div>

              <Button
                type="primary"
                icon={<MailOutlined />}
                size="large"
                block
                loading={isLoading}
                onClick={handleSendCode}
                disabled={!email.trim()}
                style={{
                  height: 52,
                  fontSize: 16,
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                发送验证码
              </Button>

              {/* 分割线 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '24px 0',
                gap: 16,
              }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ color: 'var(--color-text-quaternary)', fontSize: 13 }}>或</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>

              {/* Google 登录 */}
              <Button
                icon={<GoogleOutlined />}
                size="large"
                block
                loading={isLoading}
                onClick={handleGoogleLogin}
                style={{
                  height: 52,
                  fontSize: 16,
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                使用 Google 账号登录
              </Button>
            </>
          ) : (
            <>
              {/* 验证码输入 */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
                  请输入发送到以下邮箱的 8 位验证码
                </p>
                <p style={{ fontWeight: 600, fontSize: 15, margin: '4px 0 0' }}>{email}</p>
              </div>

              {/* 8 位验证码输入框 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: isMobile ? 6 : 8,
                  marginBottom: 24,
                }}
                onPaste={handleCodePaste}
              >
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { codeInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    disabled={isVerifying}
                    style={{
                      width: isMobile ? 36 : 42,
                      height: isMobile ? 44 : 50,
                      textAlign: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      border: '2px solid var(--color-border)',
                      borderRadius: 10,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: 'var(--color-bg-container)',
                      color: 'var(--color-text-primary)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#136dec'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; }}
                  />
                ))}
              </div>

              <Button
                type="primary"
                size="large"
                block
                loading={isVerifying}
                onClick={handleVerifyCode}
                disabled={verificationCode.some((c) => !c)}
                style={{
                  height: 52,
                  fontSize: 16,
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                验证并登录
              </Button>

              {/* 重发和返回 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 16,
                fontSize: 14,
              }}>
                <Button
                  type="link"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBackToEmail}
                  style={{ padding: 0, fontSize: 14 }}
                >
                  更换邮箱
                </Button>
                <Button
                  type="link"
                  onClick={() => handleSendCode()}
                  disabled={resendCountdown > 0 || isLoading}
                  style={{ padding: 0, fontSize: 14 }}
                >
                  {resendCountdown > 0 ? `重新发送 (${resendCountdown}s)` : '重新发送'}
                </Button>
              </div>
            </>
          )}

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
