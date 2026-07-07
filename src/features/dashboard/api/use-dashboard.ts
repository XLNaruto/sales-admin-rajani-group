import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type {
  AiInsight,
  DashboardKpis,
  SalesPoint,
  TeamPerformanceRow,
  ZoneSales,
} from '../types'

// --- mock data source (swap for apiClient calls when backend is ready) ---

const KPIS: DashboardKpis = {
  totalSales: 4823000,
  salesDelta: 12.4,
  targetAchievement: 87.3,
  targetDelta: 4.1,
  activeSalesmen: 142,
  salesmenDelta: 2.8,
  attendanceRate: 94.2,
  attendanceDelta: -1.3,
}

const DAILY_SALES: SalesPoint[] = [
  { label: 'Mon', primary: 420, secondary: 240 },
  { label: 'Tue', primary: 510, secondary: 300 },
  { label: 'Wed', primary: 480, secondary: 280 },
  { label: 'Thu', primary: 610, secondary: 350 },
  { label: 'Fri', primary: 720, secondary: 410 },
  { label: 'Sat', primary: 690, secondary: 390 },
  { label: 'Sun', primary: 350, secondary: 190 },
]

const ZONE_SALES: ZoneSales[] = [
  { name: 'North', value: 1240 },
  { name: 'South', value: 980 },
  { name: 'East', value: 760 },
  { name: 'West', value: 1120 },
]

const TEAM_PERF: TeamPerformanceRow[] = [
  { id: 't1', team: 'Rajkot Beat A', target: 1200, achieved: 1080 },
  { id: 't2', team: 'Ahmedabad Beat B', target: 1500, achieved: 1620 },
  { id: 't3', team: 'Surat Beat C', target: 1100, achieved: 890 },
  { id: 't4', team: 'Vadodara Beat D', target: 900, achieved: 940 },
]

const AI_INSIGHTS: AiInsight[] = [
  {
    id: 'a1',
    title: 'West zone trending up',
    detail: 'Secondary sales in West grew 18% WoW — consider reallocating stock.',
    tone: 'positive',
  },
  {
    id: 'a2',
    title: 'Surat Beat C below target',
    detail: '3 consecutive days under 80% achievement. Suggest a coaching visit.',
    tone: 'warning',
  },
  {
    id: 'a3',
    title: 'Attendance dip',
    detail: 'Attendance fell 1.3% — 4 salesmen have unmarked check-ins today.',
    tone: 'neutral',
  },
]

export function useDashboardKpis() {
  return useQuery({
    queryKey: queryKeys.dashboard.kpis(),
    queryFn: () => mockDelay(KPIS),
  })
}

export function useDailySales(date?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.dailySales(date),
    queryFn: () => mockDelay(DAILY_SALES),
  })
}

export function useZoneSales() {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'zone-sales'],
    queryFn: () => mockDelay(ZONE_SALES),
  })
}

export function useTeamPerformance() {
  return useQuery({
    queryKey: queryKeys.dashboard.teamPerformance(),
    queryFn: () => mockDelay(TEAM_PERF),
  })
}

export function useAiAnalytics() {
  return useQuery({
    queryKey: queryKeys.dashboard.aiAnalytics(),
    queryFn: () => mockDelay(AI_INSIGHTS),
  })
}
