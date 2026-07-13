/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_API_URL`).
 */
export const endpoints = {
  AUTH: {
    ACCOUNT_CHECK: '/sales-incharge-admin/auth/account-check',
    LOGIN: '/sales-incharge-admin/auth/login',
    REFRESH_TOKEN: '/sales-incharge-admin/auth/refresh',
    LOGOUT: '/sales-incharge-admin/auth/logout',
  },
} as const
