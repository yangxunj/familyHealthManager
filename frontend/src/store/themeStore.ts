import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: localStorage.getItem('theme') === 'dark',
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      return { isDark: next };
    }),
}));
