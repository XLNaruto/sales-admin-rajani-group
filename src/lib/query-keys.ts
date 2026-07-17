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
    detail: (id: string) => [...queryKeys.distributors.all, 'detail', id] as const,
    detailView: (id: string) =>
      [...queryKeys.distributors.all, 'detail-view', id] as const,
    performance: (id: string) =>
      [...queryKeys.distributors.all, 'performance', id] as const,
    pendingApproval: () => [...queryKeys.distributors.all, 'pending-approval'] as const,
  },
  salesIncharge: {
    all: ['sales-incharge'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'list', filters ?? {}] as const,
    salesmen: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'salesmen', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.salesIncharge.all, 'detail', id] as const,
    detailView: (id: string) =>
      [...queryKeys.salesIncharge.all, 'detail-view', id] as const,
    designations: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'designations', filters ?? {}] as const,
    hierarchy: () => [...queryKeys.salesIncharge.all, 'hierarchy'] as const,
  },
  team: {
    all: ['team'] as const,
    hierarchy: () => [...queryKeys.team.all, 'hierarchy'] as const,
    salesmen: (filters?: Record<string, unknown>) =>
      [...queryKeys.team.all, 'salesmen', filters ?? {}] as const,
    productivity: () => [...queryKeys.team.all, 'productivity'] as const,
    dailyActivity: () => [...queryKeys.team.all, 'daily-activity'] as const,
  },
  beats: {
    all: ['beats'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.beats.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.beats.all, 'detail', id] as const,
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
