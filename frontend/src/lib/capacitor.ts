/**
 * Capacitor platform detection and utilities
 */
import { Capacitor } from '@capacitor/core';
import { getServerUrl } from './serverConfig';

/** Whether the app is running in a native Capacitor shell (Android/iOS) */
export const isNativePlatform = Capacitor.isNativePlatform();

/** The custom URL scheme for deep links */
export const APP_SCHEME = 'com.familyhealth.app';

/** OAuth callback deep link URL */
export const OAUTH_CALLBACK_URL = `${APP_SCHEME}://auth/callback`;

/**
 * Get the correct API base URL based on the current platform.
 * - Web: uses relative `/api/v1` (proxied by Vite dev server or nginx)
 * - Capacitor: reads from localStorage (user-configured server address)
 */
export function getApiBaseUrl(): string {
  if (isNativePlatform) {
    const serverUrl = getServerUrl();
    if (serverUrl) {
      return serverUrl.replace(/\/+$/, '') + '/api/v1';
    }
    // Fallback to env var (for backward compatibility during migration)
    return import.meta.env.VITE_CAPACITOR_API_URL || 'http://localhost:5002/api/v1';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api/v1';
}

/**
 * Resolve a relative upload path (e.g. `/uploads/documents/xxx/file.jpg`) to a full URL.
 * - Web: returns as-is (Vite proxy or nginx handles `/uploads/`)
 * - Capacitor: prepends the configured server URL
 */
export function resolveUploadUrl(urlPath: string): string {
  if (!urlPath) return urlPath;
  // Already a full URL or data URI
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('data:')) {
    return urlPath;
  }
  if (isNativePlatform) {
    const serverUrl = getServerUrl();
    if (serverUrl) {
      return serverUrl.replace(/\/+$/, '') + urlPath;
    }
  }
  return urlPath;
}
