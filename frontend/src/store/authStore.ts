/**
 * Authentication state management using Supabase
 * Reference: banana-slides/frontend/src/store/useAuthStore.ts
 */
import { create } from 'zustand';
import { supabase, isAuthEnabled } from '../lib/supabase';
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
    // If auth is not enabled, mark as not authenticated
    if (!isAuthEnabled || !supabase) {
      set({
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true,
      });
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

        // Load family info on sign in
        if (session) {
          set({ isFamilyLoaded: false });
          get().loadFamily();
        } else {
          set({ family: null, hasFamily: false, isFamilyLoaded: true });
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
    } catch (error) {
      console.error('Sign in error:', error);
      set({ isLoading: false });
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
