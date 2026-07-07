import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { ReportDefinition, ReportType } from '../types'

function buildReport(type: ReportType): ReportDefinition {
  switch (type) {
    case 'sales':
      return {
        type,
        chartKind: 'bar',
        chartXKey: 'salesman',
        chartSeries: [{ key: 'sales', label: 'Sales' }],
        columns: [
          { key: 'salesman', header: 'Salesman', format: 'text' },
          { key: 'region', header: 'Region', format: 'text' },
          { key: 'orders', header: 'Orders', format: 'number' },
          { key: 'sales', header: 'Sales', format: 'currency' },
          { key: 'growth', header: 'Growth', format: 'percent' },
        ],
        rows: [
          { salesman: 'R. Mehta', region: 'Rajkot', orders: 142, sales: 1840000, growth: 12.4 },
          { salesman: 'K. Rao', region: 'Jamnagar', orders: 118, sales: 1520000, growth: 8.1 },
          { salesman: 'S. Patel', region: 'Junagadh', orders: 96, sales: 1180000, growth: -3.2 },
          { salesman: 'A. Singh', region: 'Surendranagar', orders: 87, sales: 990000, growth: 5.6 },
          { salesman: 'D. Shah', region: 'Morbi', orders: 74, sales: 860000, growth: 2.0 },
        ],
      }
    case 'target':
      return {
        type,
        chartKind: 'bar',
        chartXKey: 'salesman',
        chartSeries: [
          { key: 'target', label: 'Target' },
          { key: 'achieved', label: 'Achieved' },
        ],
        columns: [
          { key: 'salesman', header: 'Salesman', format: 'text' },
          { key: 'target', header: 'Target', format: 'currency' },
          { key: 'achieved', header: 'Achieved', format: 'currency' },
          { key: 'achievement', header: 'Achievement', format: 'percent' },
        ],
        rows: [
          { salesman: 'R. Mehta', target: 2000000, achieved: 1840000, achievement: 92.0 },
          { salesman: 'K. Rao', target: 1500000, achieved: 1520000, achievement: 101.3 },
          { salesman: 'S. Patel', target: 1400000, achieved: 1180000, achievement: 84.3 },
          { salesman: 'A. Singh', target: 1000000, achieved: 990000, achievement: 99.0 },
          { salesman: 'D. Shah', target: 900000, achieved: 860000, achievement: 95.6 },
        ],
      }
    case 'attendance':
      return {
        type,
        chartKind: 'bar',
        chartXKey: 'salesman',
        chartSeries: [
          { key: 'present', label: 'Present' },
          { key: 'absent', label: 'Absent' },
        ],
        columns: [
          { key: 'salesman', header: 'Salesman', format: 'text' },
          { key: 'present', header: 'Present', format: 'number' },
          { key: 'absent', header: 'Absent', format: 'number' },
          { key: 'leave', header: 'Leave', format: 'number' },
          { key: 'attendancePct', header: 'Attendance', format: 'percent' },
        ],
        rows: [
          { salesman: 'R. Mehta', present: 24, absent: 1, leave: 1, attendancePct: 92.3 },
          { salesman: 'K. Rao', present: 25, absent: 0, leave: 1, attendancePct: 96.2 },
          { salesman: 'S. Patel', present: 22, absent: 3, leave: 1, attendancePct: 84.6 },
          { salesman: 'A. Singh', present: 23, absent: 2, leave: 1, attendancePct: 88.5 },
          { salesman: 'D. Shah', present: 26, absent: 0, leave: 0, attendancePct: 100.0 },
        ],
      }
    case 'visit-history':
      return {
        type,
        chartKind: 'line',
        chartXKey: 'salesman',
        chartSeries: [
          { key: 'planned', label: 'Planned' },
          { key: 'completed', label: 'Completed' },
        ],
        columns: [
          { key: 'salesman', header: 'Salesman', format: 'text' },
          { key: 'planned', header: 'Planned Visits', format: 'number' },
          { key: 'completed', header: 'Completed', format: 'number' },
          { key: 'productive', header: 'Productive', format: 'number' },
          { key: 'coverage', header: 'Coverage', format: 'percent' },
        ],
        rows: [
          { salesman: 'R. Mehta', planned: 180, completed: 168, productive: 141, coverage: 93.3 },
          { salesman: 'K. Rao', planned: 165, completed: 160, productive: 132, coverage: 97.0 },
          { salesman: 'S. Patel', planned: 150, completed: 128, productive: 96, coverage: 85.3 },
          { salesman: 'A. Singh', planned: 140, completed: 130, productive: 101, coverage: 92.9 },
          { salesman: 'D. Shah', planned: 130, completed: 121, productive: 88, coverage: 93.1 },
        ],
      }
    case 'expense':
      return {
        type,
        chartKind: 'bar',
        chartXKey: 'salesman',
        chartSeries: [{ key: 'total', label: 'Total Claimed' }],
        columns: [
          { key: 'salesman', header: 'Salesman', format: 'text' },
          { key: 'travel', header: 'Travel', format: 'currency' },
          { key: 'lodging', header: 'Lodging', format: 'currency' },
          { key: 'misc', header: 'Misc', format: 'currency' },
          { key: 'total', header: 'Total Claimed', format: 'currency' },
        ],
        rows: [
          { salesman: 'R. Mehta', travel: 8200, lodging: 4500, misc: 1300, total: 14000 },
          { salesman: 'K. Rao', travel: 6400, lodging: 3800, misc: 900, total: 11100 },
          { salesman: 'S. Patel', travel: 9100, lodging: 5200, misc: 1600, total: 15900 },
          { salesman: 'A. Singh', travel: 5200, lodging: 2900, misc: 700, total: 8800 },
          { salesman: 'D. Shah', travel: 4800, lodging: 2600, misc: 500, total: 7900 },
        ],
      }
    case 'performance':
      return {
        type,
        chartKind: 'line',
        chartXKey: 'salesman',
        chartSeries: [{ key: 'score', label: 'Performance Score' }],
        columns: [
          { key: 'salesman', header: 'Salesman', format: 'text' },
          { key: 'salesRank', header: 'Sales Rank', format: 'number' },
          { key: 'coverage', header: 'Coverage', format: 'percent' },
          { key: 'conversion', header: 'Conversion', format: 'percent' },
          { key: 'score', header: 'Score', format: 'number' },
        ],
        rows: [
          { salesman: 'R. Mehta', salesRank: 1, coverage: 93.3, conversion: 84.0, score: 91 },
          { salesman: 'K. Rao', salesRank: 2, coverage: 97.0, conversion: 82.5, score: 89 },
          { salesman: 'S. Patel', salesRank: 3, coverage: 85.3, conversion: 75.0, score: 72 },
          { salesman: 'A. Singh', salesRank: 4, coverage: 92.9, conversion: 77.7, score: 80 },
          { salesman: 'D. Shah', salesRank: 5, coverage: 93.1, conversion: 72.7, score: 78 },
        ],
      }
  }
}

export function useReport(type: ReportType, filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.reports.byType(type, filters),
    queryFn: () => mockDelay(buildReport(type)),
  })
}
