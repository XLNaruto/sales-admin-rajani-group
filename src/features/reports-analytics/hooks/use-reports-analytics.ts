import { useState } from 'react'
import { useReport } from '../api/use-reports'
import type { ReportColumn, ReportRow, ReportType } from '../types'

function exportCsv(columns: ReportColumn[], rows: ReportRow[], type: string) {
  const header = columns.map((c) => c.header).join(',')
  const body = rows
    .map((r) => columns.map((c) => JSON.stringify(r[c.key] ?? '')).join(','))
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}-report.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Drives the reports & analytics screen: the active report-type selection, the
 * live report query and the CSV export handler. The page consumes this and only
 * renders — column defs and chart JSX stay in the component.
 */
export function useReportsAnalytics() {
  const [active, setActive] = useState<ReportType>('sales')
  const { data, isLoading } = useReport(active)

  const exportReport = () =>
    data && exportCsv(data.columns, data.rows, active)

  return {
    active,
    setActive,
    data,
    isLoading,
    exportReport,
  }
}
