/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_APP_API_URL`).
 */
export const endpoints = {
  AUTH: {
    ACCOUNT_CHECK: '/sales-incharge-admin/auth/account-check',
    LOGIN: '/sales-incharge-admin/auth/login',
    REFRESH_TOKEN: '/sales-incharge-admin/auth/refresh',
    LOGOUT: '/sales-incharge-admin/auth/logout',
  },
  SALES_INCHARGE: {
    LIST: '/sales-incharge-admin/sales-incharges',
    DELETE: (id: number) => `/sales-incharge-admin/sales-incharges/${id}`,
  },
  DISTRIBUTOR: {
    LIST: '/sales-incharge-admin/distributors',
    CREATE: '/sales-incharge-admin/distributors',
    DELETE: (id: number) => `/sales-incharge-admin/distributors/${id}`,
    OFFICE_IMAGES_PRESIGN: '/sales-incharge-admin/distributors/office-images/presign',
    GODOWN_IMAGES_PRESIGN: '/sales-incharge-admin/distributors/godown-images/presign',
    DOCUMENTS_PRESIGN: '/sales-incharge-admin/distributors/documents/presign',
  },
} as const
