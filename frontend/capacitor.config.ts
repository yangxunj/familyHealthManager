import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familyhealth.app',
  appName: '家庭健康管理',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow WebView to navigate to remote server URLs (for remote frontend loading)
    allowNavigation: ['*'],
  },
  android: {
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    CapacitorHttp: {
      // 所有 HTTP 请求走原生层，绕过 WebView 的 CORS 限制
      enabled: true,
    },
  },
};

export default config;
