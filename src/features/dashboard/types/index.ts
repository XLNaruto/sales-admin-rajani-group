export interface DashboardKpis {
  totalSales: number
  salesDelta: number
  targetAchievement: number
  targetDelta: number
  activeSalesmen: number
  salesmenDelta: number
  attendanceRate: number
  attendanceDelta: number
}

export interface SalesPoint {
  label: string
  primary: number
  secondary: number
}

export interface ZoneSales {
  name: string
  value: number
}

export interface TeamPerformanceRow {
  id: string
  team: string
  target: number
  achieved: number
}

export interface AiInsight {
  id: string
  title: string
  detail: string
  tone: 'positive' | 'warning' | 'neutral'
}
