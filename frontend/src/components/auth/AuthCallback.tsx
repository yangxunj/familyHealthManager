/**
 * OAuth callback handler
 * Handles the redirect from Supabase OAuth providers
 * After login, verifies the user is whitelisted before proceeding
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';
import { whitelistApi } from '../../api/whitelist';

export function AuthCallback() {
  const navigate = useNavigate();

  // Verify whitelist and navigate accordingly
  const verifyAndNavigate = async (session: NonNullable<Parameters<Parameters<typeof supabase.auth.onAuthStateChange>[0]>[1]>) => {
    useAuthStore.setState({
      session,
      user: session.user,
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
    });

    try {
      // Call backend API to verify whitelist - this goes through WhitelistGuard
      await whitelistApi.checkAdmin();
      // Whitelisted - proceed to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 403) {
        // Not whitelisted - sign out and redirect with error
        console.warn('AuthCallback: User not whitelisted, signing out');
        await useAuthStore.getState().signOut();
        navigate('/login?error=forbidden', { replace: true });
      } else {
        // Other error (network, server) - proceed to dashboard anyway
        navigate('/dashboard', { replace: true });
      }
    }
  };

  useEffect(() => {
    if (!supabase) {
      navigate('/', { replace: true });
      return;
    }

    // Listen for auth state change and navigate accordingly
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthCallback: onAuthStateChange event:', event, 'session:', !!session);

      if (event === 'SIGNED_IN' && session) {
        verifyAndNavigate(session);
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Ignore these events in callback
      } else if (event === 'INITIAL_SESSION') {
        if (session) {
          verifyAndNavigate(session);
        }
      }
    });

    // Set a timeout to redirect to login if no auth event occurs
    const timeout = setTimeout(() => {
      console.log('AuthCallback: Timeout - redirecting to login');
      navigate('/login', { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Spin size="large" />
      <p style={{ color: '#fff', marginTop: 16 }}>正在完成登录...</p>
    </div>
  );
}
