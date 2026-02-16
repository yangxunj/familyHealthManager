/**
 * Capacitor platform detection and utilities
 */
import { Capacitor } from '@capacitor/core';

/** Whether the app is running in a native Capacitor shell (Android/iOS) */
export const isNativePlatform = Capacitor.isNativePlatform();

/** The custom URL scheme for deep links */
export const APP_SCHEME = 'com.familyhealth.app';

/** OAuth callback deep link URL */
export const OAUTH_CALLBACK_URL = `${APP_SCHEME}://auth/callback`;

/**
 * Get the correct API base URL based on the current platform.
 * - Web: uses relative `/api/v1` (proxied by Vite dev server or nginx)
 * - Capacitor: uses the full URL from VITE_CAPACITOR_API_URL
 */
export function getApiBaseUrl(): string {
  if (isNativePlatform) {
    return import.meta.env.VITE_CAPACITOR_API_URL || 'http://localhost:5002/api/v1';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api/v1';
}
