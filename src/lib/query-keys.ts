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
    detail: (id: string) => [...queryKeys.beats.all, 'detail', id] as const,
  },
  beatAllocation: {
    all: ['beat-allocation'] as const,
    /** Beats already allocated to a sales incharge (per-incharge + filters). */
    allocated: (inchargeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.beatAllocation.all, 'allocated', inchargeId, filters ?? {}] as const,
    /** Beats available to allocate to a sales incharge (per-incharge + filters). */
    available: (inchargeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.beatAllocation.all, 'available', inchargeId, filters ?? {}] as const,
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
