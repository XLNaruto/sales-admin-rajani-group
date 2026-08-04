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
  /** Flat list of permission keys the authenticated user holds. */
  PERMISSIONS: {
    GET: '/sales-incharge-admin/permissions',
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
  },
  /**
   * Org-structure hierarchy. Flat rows (each a designation staffed at a geo
   * level by a sales incharge / admin) that the client assembles into a tree.
   */
  HIERARCHY: {
    LIST: '/sales-incharge-admin/hierarchy',
    CREATE: '/sales-incharge-admin/hierarchy',
    UPDATE: (id: string | number) => `/sales-incharge-admin/hierarchy/${id}`,
    DELETE: (id: string | number) => `/sales-incharge-admin/hierarchy/${id}`,
    /** Sales-incharge-admin accounts available to staff a non-City node
     *  (National/State/Zone/District). Paged + searchable. */
    AVAILABLE_ADMINS: '/sales-incharge-admin/hierarchy/available-sales-incharge-admins',
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
    /** Category mapping — replaces the distributor's whole product-division set. */
    PRODUCT_DIVISIONS: (id: string | number) =>
      `/sales-incharge-admin/distributors/${id}/product-divisions`,
    DELETE: (id: string | number) => `/sales-incharge-admin/distributors/${id}`,
    OFFICE_IMAGES_PRESIGN: '/sales-incharge-admin/distributors/office-images/presign',
    GODOWN_IMAGES_PRESIGN: '/sales-incharge-admin/distributors/godown-images/presign',
    DOCUMENTS_PRESIGN: '/sales-incharge-admin/distributors/documents/presign',
  },
  /**
   * Retailers — the outlets a beat covers. Mirrors the distributor resource:
   * CRUD plus a lifecycle `status` PATCH and an `onboarding` approve/reject PATCH.
   */
  RETAILER: {
    LIST: '/sales-incharge-admin/retailers',
    CREATE: '/sales-incharge-admin/retailers',
    GET: (id: string | number) => `/sales-incharge-admin/retailers/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/retailers/${id}`,
    STATUS: (id: string | number) => `/sales-incharge-admin/retailers/${id}/status`,
    ONBOARDING: (id: string | number) => `/sales-incharge-admin/retailers/${id}/onboarding`,
    /**
     * PATCH the outlet's beat only (`{ beat_id }`, `null` to unassign). The
     * nearest-beat lookup runs on create, so this is how a beat is changed
     * afterwards — and since an outlet's distributors come from its beat, this
     * is also what moves it between firms.
     */
    BEAT: (id: string | number) => `/sales-incharge-admin/retailers/${id}/beat`,
    DELETE: (id: string | number) => `/sales-incharge-admin/retailers/${id}`,
    /** Presign the shop photo upload (same contract as the distributor presigns). */
    SHOP_PHOTO_PRESIGN: '/sales-incharge-admin/retailers/shop-photos/presign',
  },
  /** Outlet-type master — backs the retailer form's "Outlet Type" select. */
  OUTLET_TYPE: {
    LIST: '/sales-incharge-admin/outlet-types',
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
   * Beat allocation — assign/unassign beats to a sales incharge. Allocated beats
   * and the allocate/de-allocate mutations live under the incharge sub-resource
   * (`…/sales-incharges/{id}/beats`); the pool still available to allocate has
   * its own `available-beats` collection.
   */
  BEAT_ALLOCATION: {
    /** GET the beats already allocated to a sales incharge (paged + searchable). */
    ALLOCATED: (id: string | number) =>
      `/sales-incharge-admin/sales-incharges/${id}/beats`,
    /** GET the beats available to allocate (not yet assigned to this incharge). */
    AVAILABLE: (id: string | number) =>
      `/sales-incharge-admin/sales-incharges/${id}/available-beats`,
    /** POST to allocate (add) one beat to a sales incharge (`{ beat_id }`). */
    ALLOCATE: (id: string | number) =>
      `/sales-incharge-admin/sales-incharges/${id}/beats`,
    /** DELETE to de-allocate one beat from a sales incharge. */
    REMOVE: (id: string | number, beatId: string | number) =>
      `/sales-incharge-admin/sales-incharges/${id}/beats/${beatId}`,
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
  /**
   * Journey plans — one sales incharge's **allocation** for a month: which of his
   * beats are in play, plus the dates the office pins. Not a calendar; the rep
   * writes each day row himself from the app.
   *
   * There is no approval lifecycle, so there is no `/summary`, no `/approve`, no
   * `/bulk-approve`, no `/re-solve`, no day-level PATCH and no
   * `/materialise-stops` — the whole admin write surface is the PATCH below.
   */
  JOURNEY_PLAN: {
    /** GET one page of the month's allocations (page-based, server-sorted). */
    LIST: '/sales-incharge-admin/journey-plans',
    /**
     * POST { period_month, sales_incharge_ids?, pinned_days?, replace_existing?, seed? }.
     * `pinned_days: [{ date, activity_id }]` applies to EVERY rep in the run —
     * pinning the weekly offs here is what makes `capacity` accurate.
     */
    GENERATE: '/sales-incharge-admin/journey-plans/generate',
    /** GET the rep switcher's options for a period (carries each plan id). */
    REPS: '/sales-incharge-admin/journey-plans/reps',
    GET: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}`,
    /**
     * PATCH { beats?, pinned_days? } — the entire admin write surface, in one
     * call because it is one screen with one Save button. Both fields are FULL
     * REPLACEMENTS of what they cover; an omitted field is left alone. Returns
     * the saved allocation.
     */
    SAVE: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}`,
    /**
     * GET the plan's AI-agent conversation. The GET is what authorizes the
     * socket room join (it records a short-lived grant), so it must precede it.
     */
    AGENT: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}/agent`,
    /** POST { message } → 202 accepted; the reply streams over the socket. */
    AGENT_MESSAGES: (id: string | number) =>
      `/sales-incharge-admin/journey-plans/${id}/agent/messages`,
  },
  /**
   * Activity master — what a plan day is spent on. The three booleans
   * (`requires_beat`, `is_working_day`, `counts_toward_coverage`) are read by
   * the solver; `company_id: null` marks the seeded platform rows, which no
   * tenant may edit.
   */
  ACTIVITY: {
    LIST: '/sales-incharge-admin/activities',
    CREATE: '/sales-incharge-admin/activities',
    UPDATE: (id: string | number) => `/sales-incharge-admin/activities/${id}`,
    DELETE: (id: string | number) => `/sales-incharge-admin/activities/${id}`,
  },
  /** The field day as it actually happened — attendance, calls, route. */
  LIVE_DAY: {
    /** GET ?sales_incharge_id&from_date&to_date — one entry per date (max 31). */
    SUMMARIES: '/sales-incharge-admin/live-day/summaries',
    /** GET ?sales_incharge_id&date — counters, timeline, route, misses, facets. */
    DETAIL: '/sales-incharge-admin/live-day/detail',
  },
  /** Firebase Cloud Messaging — register/refresh this device's push token. */
  FCM: {
    /** POST { token, platform?, device_id? } — idempotent per token. */
    TOKEN: '/sales-incharge-admin/fcm-token',
  },
} as const
