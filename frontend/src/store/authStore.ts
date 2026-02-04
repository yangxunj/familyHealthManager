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
      console.log('[Auth] auth not enabled, skip');
      set({
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true,
      });
      return;
    }

    console.log('[Auth] initialize START');
    set({ isLoading: true });

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('[Auth] getSession done, hasSession:', !!session);

      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Load family info if authenticated, then mark as initialized
      if (session) {
        console.log('[Auth] awaiting loadFamily...');
        await get().loadFamily();
        console.log('[Auth] loadFamily done, hasFamily:', get().hasFamily);
      }

      console.log('[Auth] setting isInitialized=true');
      set({ isInitialized: true });

      // Listen for auth state changes
      console.log('[Auth] registering onAuthStateChange listener');
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] onAuthStateChange event:', event, 'hasSession:', !!session);
        const prevHasFamily = get().hasFamily;
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        });
        console.log('[Auth] after onAuthStateChange set, hasFamily preserved:', get().hasFamily, '(was:', prevHasFamily, ')');

        // Load family info on sign in
        if (session) {
          set({ isFamilyLoaded: false });
          get().loadFamily();
        } else {
          set({ family: null, hasFamily: false, isFamilyLoaded: true });
        }
      });
      console.log('[Auth] initialize END');
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
    console.log('[Auth] loadFamily START');
    try {
      const family = await familyApi.get();
      console.log('[Auth] loadFamily API returned, family:', family ? family.id : null);
      set({
        family,
        hasFamily: !!family,
        isFamilyLoaded: true,
      });
      console.log('[Auth] loadFamily SET hasFamily:', !!family, 'isFamilyLoaded: true');
    } catch (error) {
      console.error('[Auth] loadFamily FAILED:', error);
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
