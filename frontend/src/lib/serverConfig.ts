/**
 * 服务器配置存储（仅 Capacitor 环境使用）
 * 使用 localStorage 持久化存储服务器地址和认证模式
 */

const STORAGE_KEY_URL = 'server_url';
const STORAGE_KEY_AUTH_REQUIRED = 'server_auth_required';

/** 读取保存的服务器地址 */
export function getServerUrl(): string | null {
  return localStorage.getItem(STORAGE_KEY_URL);
}

/** 读取认证模式 */
export function getServerAuthRequired(): boolean {
  return localStorage.getItem(STORAGE_KEY_AUTH_REQUIRED) === 'true';
}

/** 保存服务器配置 */
export function setServerConfig(url: string, authRequired: boolean): void {
  localStorage.setItem(STORAGE_KEY_URL, url);
  localStorage.setItem(STORAGE_KEY_AUTH_REQUIRED, String(authRequired));
}

/** 是否已配置服务器 */
export function isServerConfigured(): boolean {
  return !!localStorage.getItem(STORAGE_KEY_URL);
}

/** 清除配置（重新选择服务器时用） */
export function clearServerConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_AUTH_REQUIRED);
}
