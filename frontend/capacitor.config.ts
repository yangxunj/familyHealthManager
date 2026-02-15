import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familyhealth.app',
  appName: '家庭健康管理',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    webContentsDebuggingEnabled: true,
  },
};

export default config;
