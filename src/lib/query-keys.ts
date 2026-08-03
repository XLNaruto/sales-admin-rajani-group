/**
 * Centralized query-key factory. Every TanStack Query key in the app is
 * defined here — no feature declares keys inline. Keys are `as const` so
 * they infer as readonly tuples for stable cache identity.
 */
export const queryKeys = {
  config: {
    all: ['config'] as const,
    app: () => [...queryKeys.config.all, 'app'] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },
  /** Permission keys the current user holds — drives menu/button visibility. */
  permissions: {
    all: ['permissions'] as const,
    list: () => [...queryKeys.permissions.all, 'list'] as const,
  },
  company: {
    all: ['company'] as const,
    /** GET /me/companies — the caller's tenants + the active selection. */
    list: () => [...queryKeys.company.all, 'list'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpis: () => [...queryKeys.dashboard.all, 'kpis'] as const,
    dailySales: (date?: string) =>
      [...queryKeys.dashboard.all, 'daily-sales', date ?? 'today'] as const,
    teamPerformance: () => [...queryKeys.dashboard.all, 'team-performance'] as const,
    targetVsAchievement: () =>
      [...queryKeys.dashboard.all, 'target-vs-achievement'] as const,
    attendanceSummary: () => [...queryKeys.dashboard.all, 'attendance-summary'] as const,
    aiAnalytics: () => [...queryKeys.dashboard.all, 'ai-analytics'] as const,
  },
  distributors: {
    all: ['distributors'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.distributors.all, 'list', filters ?? {}] as const,
    listInfinite: (filters?: Record<string, unknown>) =>
      [...queryKeys.distributors.all, 'list-infinite', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.distributors.all, 'detail', id] as const,
    detailView: (id: string) =>
      [...queryKeys.distributors.all, 'detail-view', id] as const,
    performance: (id: string) =>
      [...queryKeys.distributors.all, 'performance', id] as const,
    pendingApproval: () => [...queryKeys.distributors.all, 'pending-approval'] as const,
    productDivisions: (filters?: Record<string, unknown>) =>
      [...queryKeys.distributors.all, 'product-divisions', filters ?? {}] as const,
  },
  retailers: {
    all: ['retailers'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.retailers.all, 'list', filters ?? {}] as const,
    listInfinite: (filters?: Record<string, unknown>) =>
      [...queryKeys.retailers.all, 'list-infinite', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.retailers.all, 'detail', id] as const,
    detailView: (id: string) => [...queryKeys.retailers.all, 'detail-view', id] as const,
    outletTypes: (filters?: Record<string, unknown>) =>
      [...queryKeys.retailers.all, 'outlet-types', filters ?? {}] as const,
  },
  salesIncharge: {
    all: ['sales-incharge'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'list', filters ?? {}] as const,
    listInfinite: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'list-infinite', filters ?? {}] as const,
    salesmen: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'salesmen', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.salesIncharge.all, 'detail', id] as const,
    detailView: (id: string) =>
      [...queryKeys.salesIncharge.all, 'detail-view', id] as const,
    designations: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'designations', filters ?? {}] as const,
  },
  /** Sales-incharge-admin accounts — assignee pool for non-City hierarchy nodes. */
  salesInchargeAdmin: {
    all: ['sales-incharge-admin'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesInchargeAdmin.all, 'list', filters ?? {}] as const,
  },
  /** Org-structure hierarchy tree (assembled from the flat /hierarchy rows). */
  hierarchy: {
    all: ['hierarchy'] as const,
    tree: () => [...queryKeys.hierarchy.all, 'tree'] as const,
    geoOptions: (level: string) =>
      [...queryKeys.hierarchy.all, 'geo-options', level] as const,
  },
  beats: {
    all: ['beats'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.beats.all, 'list', filters ?? {}] as const,
    listInfinite: (filters?: Record<string, unknown>) =>
      [...queryKeys.beats.all, 'list-infinite', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.beats.all, 'detail', id] as const,
  },
  beatAllocation: {
    all: ['beat-allocation'] as const,
    /** Beats already allocated to a sales incharge (per-incharge + filters). */
    allocated: (inchargeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.beatAllocation.all, 'allocated', inchargeId, filters ?? {}] as const,
    /** Infinite ("All") variant of the allocated list. */
    allocatedInfinite: (inchargeId: string, filters?: Record<string, unknown>) =>
      [
        ...queryKeys.beatAllocation.all,
        'allocated-infinite',
        inchargeId,
        filters ?? {},
      ] as const,
    /** Beats available to allocate to a sales incharge (per-incharge + filters). */
    available: (inchargeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.beatAllocation.all, 'available', inchargeId, filters ?? {}] as const,
    /** Infinite ("All") variant of the available list. */
    availableInfinite: (inchargeId: string, filters?: Record<string, unknown>) =>
      [
        ...queryKeys.beatAllocation.all,
        'available-infinite',
        inchargeId,
        filters ?? {},
      ] as const,
  },
  /** Journey management — plans, the activity master and the live field day. */
  journey: {
    all: ['journey'] as const,
    /** GET /journey-plans — the approval queue (period + server-side filters). */
    plans: (filters?: Record<string, unknown>) =>
      [...queryKeys.journey.all, 'plans', filters ?? {}] as const,
    /** GET /journey-plans/summary — the period's counts + filter options. */
    planSummary: (periodMonth: string) =>
      [...queryKeys.journey.all, 'plan-summary', periodMonth] as const,
    /** GET /journey-plans/{id} — one rep's month, with days + flags. */
    plan: (id: string) => [...queryKeys.journey.all, 'plan', id] as const,
    /** GET /journey-plans/reps — the rep switcher's options for a period. */
    reps: (periodMonth: string) =>
      [...queryKeys.journey.all, 'reps', periodMonth] as const,
    /** GET /journey-plans/{id}/agent — the AI agent's transcript. */
    agent: (planId: string) => [...queryKeys.journey.all, 'agent', planId] as const,
    /** GET /activities — the activity master behind the day dropdown. */
    activities: (filters?: Record<string, unknown>) =>
      [...queryKeys.journey.all, 'activities', filters ?? {}] as const,
    /** GET /live-day/summaries — a window of field days (max 31). */
    liveDays: (filters?: Record<string, unknown>) =>
      [...queryKeys.journey.all, 'live-days', filters ?? {}] as const,
    /** GET /live-day/detail — one field day's timeline + route. */
    liveDay: (inchargeId: string, date: string) =>
      [...queryKeys.journey.all, 'live-day', inchargeId, date] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    greetings: () => [...queryKeys.notifications.all, 'greetings'] as const,
  },
  location: {
    all: ['location'] as const,
    states: (filters?: Record<string, unknown>) =>
      [...queryKeys.location.all, 'states', filters ?? {}] as const,
    zones: (filters?: Record<string, unknown>) =>
      [...queryKeys.location.all, 'zones', filters ?? {}] as const,
    districts: (filters?: Record<string, unknown>) =>
      [...queryKeys.location.all, 'districts', filters ?? {}] as const,
    talukas: (filters?: Record<string, unknown>) =>
      [...queryKeys.location.all, 'talukas', filters ?? {}] as const,
    cities: (filters?: Record<string, unknown>) =>
      [...queryKeys.location.all, 'cities', filters ?? {}] as const,
  },
} as const
