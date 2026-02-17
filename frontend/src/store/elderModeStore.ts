import { create } from 'zustand';
import { useThemeStore } from './themeStore';

interface ElderModeState {
  isElderMode: boolean;
  toggleElderMode: () => void;
}

export const useElderModeStore = create<ElderModeState>((set) => ({
  isElderMode: localStorage.getItem('elderMode') === 'true',
  toggleElderMode: () =>
    set((state) => {
      const next = !state.isElderMode;
      localStorage.setItem('elderMode', next ? 'true' : 'false');
      document.documentElement.setAttribute(
        'data-elder-mode',
        next ? 'true' : 'false',
      );
      // 开启老人模式时强制切换到浅色模式
      if (next && useThemeStore.getState().isDark) {
        useThemeStore.getState().toggleTheme();
      }
      return { isElderMode: next };
    }),
}));
