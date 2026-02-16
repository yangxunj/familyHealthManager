/**
 * Authentication state management using Supabase
 * Reference: banana-slides/frontend/src/store/useAuthStore.ts
 */
import { create } from 'zustand';
import { supabase, isAuthEnabled } from '../lib/supabase';
import { isNativePlatform, OAUTH_CALLBACK_URL } from '../lib/capacitor';
import type { User, Session } from '@supabase/supabase-js';
import { familyApi, type Family } from '../api/family';

interface AuthState {
  user: User | null;
  session: Session | null;
  family: Family | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  hasFamily: boolean;
  isFamilyLoaded: boolean;

  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
  loadFamily: () => Promise<void>;
  setFamily: (family: Family | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  family: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  hasFamily: false,
  isFamilyLoaded: false,

  initialize: async () => {
    // LAN mode: no auth needed, but still load family data
    if (!isAuthEnabled || !supabase) {
      set({
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true,
      });
      await get().loadFamily();
      return;
    }

    set({ isLoading: true });

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Load family info if authenticated, then mark as initialized
      if (session) {
        await get().loadFamily();
      }

      set({ isInitialized: true });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        });

        // Load family info on sign in, skip if already loaded (e.g. INITIAL_SESSION, TOKEN_REFRESHED)
        if (session) {
          if (!get().isFamilyLoaded) {
            get().loadFamily();
          }
        } else {
          set({ family: null, hasFamily: false, isFamilyLoaded: false });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        isInitialized: true,
        isLoading: false,
      });
    }
  },

  signInWithGoogle: async () => {
    if (!supabase) return;

    set({ isLoading: true });

    try {
      if (isNativePlatform) {
        // Capacitor: open OAuth in in-app browser, redirect via deep link
        const { Browser } = await import('@capacitor/browser');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: OAUTH_CALLBACK_URL,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          console.error('Sign in error:', error);
          set({ isLoading: false });
          return;
        }

        if (data?.url) {
          await Browser.open({ url: data.url });
        }
      } else {
        // Web: normal OAuth flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          console.error('Sign in error:', error);
          set({ isLoading: false });
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      set({ isLoading: false });
    }
  },

  signInWithMagicLink: async (email: string) => {
    if (!supabase) return { success: false, error: 'Auth not enabled' };

    set({ isLoading: true });

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      set({ isLoading: false });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: error.message || 'Failed to send code' };
    }
  },

  signOut: async () => {
    // Clear state immediately
    set({
      user: null,
      session: null,
      family: null,
      isAuthenticated: false,
      isInitialized: true,
      hasFamily: false,
      isFamilyLoaded: false,
    });

    // Call Supabase signOut asynchronously
    if (supabase) {
      supabase.auth.signOut().catch(console.error);
    }
  },

  getAccessToken: () => {
    const { session } = get();
    return session?.access_token ?? null;
  },

  loadFamily: async () => {
    try {
      const family = await familyApi.get();
      set({
        family,
        hasFamily: !!family,
        isFamilyLoaded: true,
      });
    } catch (error) {
      console.error('Failed to load family:', error);
      set({ family: null, hasFamily: false, isFamilyLoaded: true });
    }
  },

  setFamily: (family: Family | null) => {
    set({
      family,
      hasFamily: !!family,
    });
  },
}));
