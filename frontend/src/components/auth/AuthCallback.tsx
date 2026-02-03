/**
 * OAuth callback handler
 * Handles the redirect from Supabase OAuth providers
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';

export function AuthCallback() {
  const navigate = useNavigate();

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
        // User signed in, update store and navigate to dashboard
        useAuthStore.setState({
          session,
          user: session.user,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
        });
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Ignore these events in callback
      } else if (event === 'INITIAL_SESSION') {
        // Initial session check - if we have a session, navigate to dashboard
        if (session) {
          useAuthStore.setState({
            session,
            user: session.user,
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
          });
          navigate('/dashboard', { replace: true });
        }
      }
    });

    // Set a timeout to redirect to login if no auth event occurs
    const timeout = setTimeout(() => {
      console.log('AuthCallback: Timeout - redirecting to login');
      navigate('/login', { replace: true });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
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
