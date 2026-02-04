import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import { useThemeStore } from './store';
import './styles/global.css';

// 设置 dayjs 语言
dayjs.locale('zh-cn');

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

// 共享的主题 token（亮暗模式通用）
const sharedToken = {
  colorPrimary: '#136dec',
  colorSuccess: '#13ec5b',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorInfo: '#136dec',
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
};

const sharedComponents = {
  Card: { borderRadiusLG: 16 },
  Button: { borderRadius: 10, controlHeight: 40, controlHeightLG: 48 },
  Menu: { itemBorderRadius: 8, itemMarginInline: 8 },
  Input: { borderRadius: 10, controlHeight: 40 },
  Select: { borderRadius: 10, controlHeight: 40 },
  Table: { borderRadius: 12 },
};

function ThemedApp() {
  const isDark = useThemeStore((s) => s.isDark);

  // 初始化时同步 data-theme 属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark
          ? sharedToken
          : {
              ...sharedToken,
              colorBgLayout: '#f6f7f8',
              colorBgContainer: '#ffffff',
              colorBorder: '#e7edf3',
              colorText: '#0d141b',
              colorTextSecondary: '#4c739a',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.08)',
            },
        components: isDark
          ? sharedComponents
          : {
              ...sharedComponents,
              Table: { ...sharedComponents.Table, headerBg: '#fafbfc' },
            },
      }}
    >
      <App />
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  </StrictMode>
);
