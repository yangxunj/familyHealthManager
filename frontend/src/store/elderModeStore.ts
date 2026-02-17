import { create } from 'zustand';

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
      return { isElderMode: next };
    }),
}));
