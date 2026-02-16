/**
 * Supabase client initialization
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isNativePlatform } from './capacitor';
import { isServerConfigured, getServerAuthRequired } from './serverConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client only if both URL and key are configured
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

// Static check (Web mode: based on env vars)
export const isAuthEnabled = !!supabase;

/**
 * Dynamic auth check that respects Capacitor server config.
 * - Web: same as isAuthEnabled (based on env vars)
 * - Capacitor: based on server's authRequired flag
 */
export function getIsAuthEnabled(): boolean {
  if (isNativePlatform) {
    return isServerConfigured() ? getServerAuthRequired() : false;
  }
  return !!supabase;
}
