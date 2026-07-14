/**
 * Centralized query-key factory. Every TanStack Query key in the app is
 * defined here — no feature declares keys inline. Keys are `as const` so
 * they infer as readonly tuples for stable cache identity.
 */
export const queryKeys = {
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
    performance: (id: string) =>
      [...queryKeys.distributors.all, 'performance', id] as const,
    pendingApproval: () => [...queryKeys.distributors.all, 'pending-approval'] as const,
  },
  employees: {
    all: ['employees'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.employees.all, 'list', filters ?? {}] as const,
    leaves: () => [...queryKeys.employees.all, 'leaves'] as const,
    expenses: () => [...queryKeys.employees.all, 'expenses'] as const,
    tasks: () => [...queryKeys.employees.all, 'tasks'] as const,
  },
  communication: {
    all: ['communication'] as const,
    threads: () => [...queryKeys.communication.all, 'threads'] as const,
    whatsappLog: () => [...queryKeys.communication.all, 'whatsapp-log'] as const,
  },
  salesIncharge: {
    all: ['sales-incharge'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'list', filters ?? {}] as const,
    salesmen: (filters?: Record<string, unknown>) =>
      [...queryKeys.salesIncharge.all, 'salesmen', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.salesIncharge.all, 'detail', id] as const,
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
  beatAllocations: {
    all: ['beat-allocations'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.beatAllocations.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.beatAllocations.all, 'detail', id] as const,
  },
  beatTour: {
    all: ['beat-tour'] as const,
    beats: () => [...queryKeys.beatTour.all, 'beats'] as const,
    tourPlans: (period?: string) =>
      [...queryKeys.beatTour.all, 'tour-plans', period ?? 'month'] as const,
    routeMapping: () => [...queryKeys.beatTour.all, 'route-mapping'] as const,
    partyMapping: () => [...queryKeys.beatTour.all, 'party-mapping'] as const,
  },
  crm: {
    all: ['crm'] as const,
    visitForms: () => [...queryKeys.crm.all, 'visit-forms'] as const,
    routes: () => [...queryKeys.crm.all, 'routes'] as const,
    meetings: () => [...queryKeys.crm.all, 'meetings'] as const,
    marketVisits: () => [...queryKeys.crm.all, 'market-visits'] as const,
  },
  approvals: {
    all: ['approvals'] as const,
    inbox: (type?: string) => [...queryKeys.approvals.all, 'inbox', type ?? 'all'] as const,
  },
  gps: {
    all: ['gps'] as const,
    livePositions: () => [...queryKeys.gps.all, 'live-positions'] as const,
    route: (salesmanId: string) => [...queryKeys.gps.all, 'route', salesmanId] as const,
    alerts: () => [...queryKeys.gps.all, 'fake-location-alerts'] as const,
  },
  reports: {
    all: ['reports'] as const,
    byType: (type: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, type, filters ?? {}] as const,
  },
  retailers: {
    all: ['retailers'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.retailers.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.retailers.all, 'detail', id] as const,
    analytics: () => [...queryKeys.retailers.all, 'analytics'] as const,
  },
  expenseTada: {
    all: ['expense-tada'] as const,
    master: () => [...queryKeys.expenseTada.all, 'master'] as const,
    claims: () => [...queryKeys.expenseTada.all, 'claims'] as const,
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
