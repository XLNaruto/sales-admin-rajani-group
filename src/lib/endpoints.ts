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
    /** Username + password sign-in; returns the access/refresh token pair. */
    PASSWORD_LOGIN: '/sales-incharge-admin/auth/password-login',
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
  DISTRIBUTOR: {
    LIST: '/sales-incharge-admin/distributors',
    CREATE: '/sales-incharge-admin/distributors',
    GET: (id: string | number) => `/sales-incharge-admin/distributors/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/distributors/${id}`,
    STATUS: (id: string | number) => `/sales-incharge-admin/distributors/${id}/status`,
    ONBOARDING: (id: string | number) =>
      `/sales-incharge-admin/distributors/${id}/onboarding`,
    /** Company mapping — replaces the distributor's whole company (tenant) set. */
    COMPANIES: (id: string | number) =>
      `/sales-incharge-admin/distributors/${id}/companies`,
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
    ONBOARDING: (id: string | number) =>
      `/sales-incharge-admin/retailers/${id}/onboarding`,
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
  /**
   * Outlet-type master — the Master Management screen, and the master behind
   * the retailer form's "Outlet Type" select.
   */
  OUTLET_TYPE: {
    LIST: '/sales-incharge-admin/outlet-types',
    CREATE: '/sales-incharge-admin/outlet-types',
    GET: (id: string | number) => `/sales-incharge-admin/outlet-types/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/outlet-types/${id}`,
    DELETE: (id: string | number) => `/sales-incharge-admin/outlet-types/${id}`,
  },
  /**
   * Payment-condition master — the terms a distributor trades on (e.g.
   * `Credit 30 Days`). Same shape as the outlet-type master.
   */
  PAYMENT_CONDITION: {
    LIST: '/sales-incharge-admin/payment-conditions',
    CREATE: '/sales-incharge-admin/payment-conditions',
    GET: (id: string | number) => `/sales-incharge-admin/payment-conditions/${id}`,
    UPDATE: (id: string | number) => `/sales-incharge-admin/payment-conditions/${id}`,
    DELETE: (id: string | number) => `/sales-incharge-admin/payment-conditions/${id}`,
  },
  /**
   * Route master — the named delivery routes a warehouse serves, behind the
   * distributor form's "Delivery Route" select. Read-only (the API exposes no
   * writes).
   */
  ROUTE: {
    LIST: '/sales-incharge-admin/routes',
  },
  /** Beats — the ordered route a salesman covers (name/grade/city/distributor). */
  BEAT: {
    LIST: '/sales-incharge-admin/beats',
    /**
     * Lightweight `id` + `name` picker for beat dropdowns on other screens.
     * Gated on `beat:lookup` (a panel baseline) rather than `beat:list`, so
     * filling a beat select never implies access to the Beat Master screen.
     */
    OPTIONS: '/sales-incharge-admin/beats/options',
    /**
     * GET `?latitude&longitude` — the beat nearest a coordinate, decided by a
     * majority vote across the k nearest geo-tagged outlets. Used to prefill the
     * retailer form's beat once the shop is pinned; an unresolved answer is a
     * real answer, so the caller must not guess in its place.
     */
    NEAREST: '/sales-incharge-admin/beats/nearest',
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
   * Journey plans — one sales incharge's month, negotiated in four states
   * (`draft → published → submitted → approved`).
   *
   * The admin allocates **day-counts**: per activity (optionally in a city) and
   * per DISTRIBUTOR, which is the unit field time comes in. He never picks a date
   * or a beat — the sales incharge turns the counts into dates, choosing the
   * distributor and its beats per piece of work, and a date may carry several.
   *
   * The allocation is deliberately **partial**: nothing refuses on the counts, so
   * there is no variance to clear before publishing.
   */
  JOURNEY_PLAN: {
    /** GET one page of the month's plans (page-based, server-sorted, status-filtered). */
    LIST: '/sales-incharge-admin/journey-plans',
    /**
     * POST { sales_incharge_id, period_month } → 201 with a bare `draft`.
     * There is no generate any more: field time is allocated per distributor, and
     * a distributor is a commercial relationship rather than something a solver
     * can propose. A sales incharge who already has a plan for the period gets a
     * 409 naming it, so a double-click cannot hand back someone else's month.
     */
    CREATE: '/sales-incharge-admin/journey-plans',
    /** GET the sales incharge switcher's options for a period (carries each plan id + status). */
    REPS: '/sales-incharge-admin/journey-plans/reps',
    /**
     * GET ?sales_incharge_id&period_month — the allocation pickers, and **the
     * whitelist the allocation Save enforces**: anything absent is refused with a
     * 400. Needs no plan to exist.
     */
    ALLOCATION_OPTIONS: '/sales-incharge-admin/journey-plans/allocation-options',
    GET: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}`,
    /**
     * PATCH { activity_allocations?, distributor_allocations? } — the admin
     * allocates **day-counts**, never a date or a beat. Each field is a FULL
     * REPLACEMENT of what it covers; an omitted field is untouched. Neither total
     * is capped at the length of the month. Does not touch the schedule. Refused
     * (409) once the plan is `approved`.
     */
    SAVE: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}`,
    /**
     * PATCH { days: [{ date, entries }] } — the correction pass over the sales
     * incharge's calendar. A FULL REPLACEMENT: send every date, each with the
     * list of work on it. Open from `submitted` onward, including after approval;
     * refused (409) on a `draft` or `published` plan, where the schedule is the
     * sales incharge's. Locked dates survive whatever is sent.
     */
    SCHEDULE: (id: string | number) =>
      `/sales-incharge-admin/journey-plans/${id}/schedule`,
    /**
     * POST — `draft` → `published`. Needs only one bucket on the plan; a partial
     * month is normal. Guarded by `journey-plan:approve`, the same key as approve.
     */
    PUBLISH: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}/publish`,
    /**
     * POST — `submitted` → `approved`. The counts are NOT re-checked; a variance
     * comes back as a flag for the admin to judge. There is no reject and no
     * send-back — an admin who dislikes a schedule corrects it.
     */
    APPROVE: (id: string | number) => `/sales-incharge-admin/journey-plans/${id}/approve`,
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
   * Activity master — what a piece of a plan day is spent on. The three booleans
   * (`requires_beat`, `is_working_day`, `counts_toward_coverage`) are enforced by
   * the scheduler: `requires_beat` in particular decides whether an entry must
   * name a distributor and beats, or must name neither. `company_id: null` marks
   * the seeded platform rows, which no tenant may edit.
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
  /**
   * Beat change requests — what the reps have asked to swap on a planned day,
   * and the admin's answer. Read-only apart from the review PATCH: the request
   * itself is raised from the field app, never here.
   */
  BEAT_CHANGE: {
    /** GET one page of the queue. Defaults to `pending` when `status` is omitted. */
    LIST: '/sales-incharge-admin/beat-changes',
    /**
     * PATCH { status: 'approved' } | { status: 'rejected', rejection_reason }.
     * Approving is what MOVES THE DAY — the replacement beat takes the outgoing
     * one's place in the walk, in the same transaction as the answer. Every
     * precondition is re-checked here (the beat may since have been de-allocated,
     * the day may have locked), so a stale request is refused rather than applied.
     */
    STATUS: (id: string | number) =>
      `/sales-incharge-admin/beat-changes/${id}/status`,
  },
  /**
   * Day change requests — what the reps want to do instead of, or in addition
   * to, the day they were given. Read-only apart from the review PATCH: the
   * request itself is raised from the field app, never here.
   */
  DAY_CHANGE: {
    /** GET one page of the queue. Defaults to `pending` when `status` is omitted. */
    LIST: '/sales-incharge-admin/day-changes',
    /**
     * PATCH { status: 'approved' } | { status: 'rejected', rejection_reason }.
     * Approving is WHAT WRITES THE DAY, and the only thing that does — on an
     * `update` the date's un-worked entries are replaced, on a `create` the
     * proposed ones are appended. Entries already visited against are never
     * removed. Every precondition is re-checked here, so a proposal that has
     * gone stale is refused with its reason rather than applied.
     */
    STATUS: (id: string | number) => `/sales-incharge-admin/day-changes/${id}/status`,
  },
  /**
   * Profile edit requests — a rep asking for his own record to be corrected.
   * The ask is prose, so approving records the intent; the correction itself is
   * still made through `PATCH /sales-incharges/:id`.
   */
  PROFILE_EDIT_REQUEST: {
    /** GET one page of the queue. Defaults to `pending` when `status` is omitted. */
    LIST: '/sales-incharge-admin/profile-edit-requests',
    /** GET one request in full (404s outside the selected company). */
    GET: (id: string | number) =>
      `/sales-incharge-admin/profile-edit-requests/${id}`,
    /**
     * PATCH { status, reason? } — `reason` is REQUIRED on a rejection and
     * optional on an approval. Either answer also frees the rep to raise his
     * next request; a request already answered comes back `409`.
     */
    STATUS: (id: string | number) =>
      `/sales-incharge-admin/profile-edit-requests/${id}/status`,
  },
  /** Firebase Cloud Messaging — register/refresh this device's push token. */
  FCM: {
    /** POST { token, platform?, device_id? } — idempotent per token. */
    TOKEN: '/sales-incharge-admin/fcm-token',
  },
} as const
