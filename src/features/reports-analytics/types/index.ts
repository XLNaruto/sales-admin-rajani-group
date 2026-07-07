export type ReportType =
  | 'sales'
  | 'target'
  | 'attendance'
  | 'visit-history'
  | 'expense'
  | 'performance'

/** Generic tabular report row — columns vary by report type. */
export type ReportRow = Record<string, string | number>

export interface ReportColumn {
  key: string
  header: string
  /** Render hint used by the page for cell formatting. */
  format?: 'currency' | 'percent' | 'number' | 'text'
}

export interface ReportChartSeries {
  key: string
  label: string
}

export interface ReportDefinition {
  type: ReportType
  columns: ReportColumn[]
  rows: ReportRow[]
  /** Key on each row used as the chart's x-axis category. */
  chartXKey: string
  chartSeries: ReportChartSeries[]
  chartKind: 'bar' | 'line'
}
