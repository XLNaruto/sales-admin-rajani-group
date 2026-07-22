/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_APP_API_URL`).
 */
export const endpoints = {
  /** Client-facing app config (media base URL, etc.). */
  CONFIG: {
    GET: '/sales-incharge-admin/config',
  },
  AUTH: {
    ACCOUNT_CHECK: '/sales-incharge-admin/auth/account-check',
    LOGIN: '/sales-incharge-admin/auth/login',
    REFRESH_TOKEN: '/sales-incharge-admin/auth/refresh',
    LOGOUT: '/sales-incharge-admin/auth/logout',
  },
  /** The authenticated user's own profile, resolved from the access token. */
  ME: {
    GET: '/sales-incharge-admin/me',
    /** GET the companies (tenants) the caller belongs to + the active one. */
    COMPANIES: '/sales-incharge-admin/me/companies',
    /** POST to switch which company (tenant) the caller operates as. */
    SELECT_COMPANY: '/sales-incharge-admin/me/company/select',
  },
  SALES_INCHARGE: {
    LIST: '/sales-incharge-admin/sales-incharges',
    CREATE: '/sales-incharge-admin/sales-incharges',
    GET: (id: string | number) => `/sales-incharge-admin/sales-incharges/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/sales-incharges/${id}`,
    STATUS: (id: string | number) => `/sales-incharge-admin/sales-incharges/${id}/status`,
    DELETE: (id: string | number) => `/sales-incharge-admin/sales-incharges/${id}`,
    DOCUMENTS_PRESIGN: '/sales-incharge-admin/sales-incharges/documents/presign',
    /** GET the reporting hierarchy tree (the single root with nested children). */
    HIERARCHY: '/sales-incharge-admin/sales-incharges/hierarchy',
    /** PATCH to designate this incharge as THE single top-of-org root. */
    ROOT: (id: string | number) => `/sales-incharge-admin/sales-incharges/${id}/root`,
    /** PATCH who a sales incharge reports to (`reports_to` id, or null → root). */
    REPORTING_MANAGER: (id: string | number) =>
      `/sales-incharge-admin/sales-incharges/${id}/reporting-manager`,
    /** DELETE a sales incharge's hierarchy links (the node + its whole subtree). */
    HIERARCHY_CLEAR: (id: string | number) =>
      `/sales-incharge-admin/sales-incharges/${id}/hierarchy`,
  },
  DESIGNATION: {
    LIST: '/sales-incharge-admin/designations',
  },
  /** Product-division master — the divisions a distributor can be assigned to. */
  PRODUCT_DIVISION: {
    LIST: '/sales-incharge-admin/product-divisions',
  },
  DISTRIBUTOR: {
    LIST: '/sales-incharge-admin/distributors',
    CREATE: '/sales-incharge-admin/distributors',
    GET: (id: string | number) => `/sales-incharge-admin/distributors/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/distributors/${id}`,
    STATUS: (id: string | number) => `/sales-incharge-admin/distributors/${id}/status`,
    ONBOARDING: (id: string | number) => `/sales-incharge-admin/distributors/${id}/onboarding`,
    DELETE: (id: string | number) => `/sales-incharge-admin/distributors/${id}`,
    OFFICE_IMAGES_PRESIGN: '/sales-incharge-admin/distributors/office-images/presign',
    GODOWN_IMAGES_PRESIGN: '/sales-incharge-admin/distributors/godown-images/presign',
    DOCUMENTS_PRESIGN: '/sales-incharge-admin/distributors/documents/presign',
  },
  /** Beats — the ordered route a salesman covers (name/grade/city/distributor). */
  BEAT: {
    LIST: '/sales-incharge-admin/beats',
    CREATE: '/sales-incharge-admin/beats',
    GET: (id: string | number) => `/sales-incharge-admin/beats/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/beats/${id}`,
    DELETE: (id: string | number) => `/sales-incharge-admin/beats/${id}`,
    STATUS: (id: string | number) => `/sales-incharge-admin/beats/${id}/status`,
  },
  /**
   * Beat allocation — assign/unassign beats to a sales incharge. Paths are left
   * blank until the backend is finalised; the allocation `api/` layer treats a
   * blank path as "not configured yet" (queries resolve to empty, mutations
   * surface a clear error) so the screen renders. Fill these in to go live.
   */
  BEAT_ALLOCATION: {
    /** GET the beats already allocated to a sales incharge (paged + searchable). */
    ALLOCATED: (_id: string | number) => '',
    /** GET the beats available to allocate (not yet assigned to this incharge). */
    AVAILABLE: (_id: string | number) => '',
    /** POST to allocate (add) one or more beats to a sales incharge. */
    ALLOCATE: (_id: string | number) => '',
    /** DELETE to remove one allocated beat from a sales incharge. */
    REMOVE: (_id: string | number, _beatId: string | number) => '',
  },
  /**
   * Geography masters. A strict hierarchy — each level filters by its parent's
   * id: State → Zone (state_id) → District (zone_id) → Taluka (district_id) →
   * City (taluka_id).
   */
  LOCATION: {
    STATES: '/sales-incharge-admin/states',
    ZONES: '/sales-incharge-admin/zones',
    DISTRICTS: '/sales-incharge-admin/districts',
    TALUKAS: '/sales-incharge-admin/talukas',
    CITIES: '/sales-incharge-admin/cities',
  },
} as const
