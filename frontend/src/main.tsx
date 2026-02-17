import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import { useThemeStore, useElderModeStore } from './store';
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

// 老人模式额外 token
const elderModeToken = {
  fontSize: 17,
  fontSizeSM: 15,
  fontSizeLG: 19,
  fontSizeXL: 22,
  fontSizeHeading1: 32,
  fontSizeHeading2: 26,
  fontSizeHeading3: 22,
  fontSizeHeading4: 19,
  fontSizeHeading5: 17,
  lineHeight: 1.8,
};

// 老人模式额外组件配置
const elderModeComponents = {
  Button: { controlHeight: 52, controlHeightLG: 56, fontSize: 17 },
  Input: { controlHeight: 52, fontSize: 17 },
  Select: { controlHeight: 52, fontSize: 17 },
  Menu: { itemHeight: 52, fontSize: 17 },
  Tabs: { titleFontSize: 17 },
  Tag: { fontSize: 15 },
};

function ThemedApp() {
  const isDark = useThemeStore((s) => s.isDark);
  const isElderMode = useElderModeStore((s) => s.isElderMode);

  // 老人模式强制浅色
  const effectiveDark = isDark && !isElderMode;

  // 初始化时同步 data-theme 和 data-elder-mode 属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveDark ? 'dark' : 'light');
  }, [effectiveDark]);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-elder-mode',
      isElderMode ? 'true' : 'false',
    );
  }, [isElderMode]);

  const baseToken = effectiveDark
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
      };

  const baseComponents = effectiveDark
    ? sharedComponents
    : {
        ...sharedComponents,
        Table: { ...sharedComponents.Table, headerBg: '#fafbfc' },
      };

  // 合并老人模式覆盖
  const mergedToken = isElderMode ? { ...baseToken, ...elderModeToken } : baseToken;
  const mergedComponents = isElderMode
    ? {
        ...baseComponents,
        Button: { ...baseComponents.Button, ...elderModeComponents.Button },
        Input: { ...baseComponents.Input, ...elderModeComponents.Input },
        Select: { ...baseComponents.Select, ...elderModeComponents.Select },
        Menu: { ...baseComponents.Menu, ...elderModeComponents.Menu },
        Tabs: { ...elderModeComponents.Tabs },
        Tag: { ...elderModeComponents.Tag },
      }
    : baseComponents;

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: effectiveDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: mergedToken,
        components: mergedComponents,
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
