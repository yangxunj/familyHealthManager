import axios, { type AxiosError } from 'axios';
import { message } from 'antd';
import { supabase, isAuthEnabled } from '../lib/supabase';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  async (config) => {
    // Add Authorization header if auth is enabled
    if (isAuthEnabled && supabase) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.error('Failed to get session for auth header:', error);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Track if we're already refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 后端使用 TransformInterceptor 包装响应为 { success, data, timestamp }
    // 需要提取 data 字段
    const responseData = response.data;
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data;
    }
    return responseData;
  },
  async (error: AxiosError<{ error?: { message?: string } }>) => {
    const { response, config } = error;

    // Handle 401 Unauthorized - try to refresh token first
    if (response?.status === 401 && isAuthEnabled && supabase) {
      console.warn('401 received, attempting token refresh...');

      // Avoid multiple simultaneous refresh attempts
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !data.session) {
              console.error('Token refresh failed:', refreshError);
              return false;
            }
            console.log('Token refreshed successfully');
            return true;
          } catch (e) {
            console.error('Token refresh error:', e);
            return false;
          } finally {
            isRefreshing = false;
          }
        })();
      }

      // Wait for refresh to complete
      const refreshed = await refreshPromise;

      if (refreshed && config) {
        // Retry the original request with new token
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
            return apiClient.request(config);
          }
        } catch (retryError) {
          console.error('Retry after refresh failed:', retryError);
        }
      }

      // If refresh failed or retry failed, redirect to login
      console.error('Authentication failed - redirecting to login');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (response) {
      const { status, data } = response;
      const errorMessage = data?.error?.message || '请求失败';

      switch (status) {
        case 403:
          // Check if this is a whitelist rejection
          if (errorMessage.includes('not in the allowed list')) {
            // Sign out and redirect to login with forbidden error
            if (supabase) {
              supabase.auth.signOut().catch(console.error);
            }
            window.location.href = '/login?error=forbidden';
            return Promise.reject(error);
          }
          message.error('没有权限执行此操作');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器错误，请稍后重试');
          break;
        default:
          message.error(errorMessage);
      }
    } else {
      message.error('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
