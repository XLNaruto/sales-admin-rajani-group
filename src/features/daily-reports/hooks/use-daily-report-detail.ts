/**
 * State for one rep's daily report.
 *
 * The rep, kind and date ride in the encrypted `?data=` token, along with the
 * list's own token so Back restores the exact list view. Flipping Morning ↔
 * Evening rewrites the token in place.
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { errorCode, errorStatus } from '@/lib/api-error'
import { useOpenCompanyPickerOnError } from '@/features/company'
import { todayIST } from '@/features/daily-summary'
import { useRepDailyReport } from '../api/use-daily-reports'
import { isDailyReportKind } from '../lib/daily-report-format'
import type { DailyReportKind } from '../types'

/** What the detail's `?data=` token carries. */
export type DailyReportDetailToken = {
  id?: string
  kind?: DailyReportKind
  /** `yyyy-MM-dd`, IST. */
  date?: string
  /** Rep name and code from the list row — shown while loading and on a 404. */
  name?: string
  code?: string
  /** The list's own token, for the Back button. */
  backData?: string
}

/** The two 404s the detail answers with — each is a state, not an error. */
export type DailyReportMissing = 'report' | 'sales-incharge'

export function useDailyReportDetail(data?: string) {
  const navigate = useNavigate()
  const token = useMemo<DailyReportDetailToken>(
    () => (data ? (decryptParams<DailyReportDetailToken>(data) ?? {}) : {}),
    [data],
  )

  const today = useMemo(() => todayIST(), [])
  const id = token.id ? String(token.id) : undefined
  const kind: DailyReportKind = isDailyReportKind(token.kind) ? token.kind : 'evening'
  const date = token.date && token.date <= today ? token.date : today

  const query = useRepDailyReport(id, kind, date)
  useOpenCompanyPickerOnError(query.error)

  const selectKind = useCallback(
    (value: string) => {
      if (!isDailyReportKind(value) || value === kind) return
      navigate({
        to: '/daily-reports/detail',
        search: { data: encryptParams({ ...token, kind: value }) },
        replace: true,
      })
    },
    [navigate, token, kind],
  )

  const missing: DailyReportMissing | null =
    errorStatus(query.error) !== 404
      ? null
      : errorCode(query.error) === 'SALES_INCHARGE_NOT_FOUND'
        ? 'sales-incharge'
        : // `DAILY_REPORT_NOT_FOUND`, or a bare 404 — both mean "nothing to show".
          'report'

  const report = query.data

  return {
    id,
    kind,
    selectKind,
    date,
    // The report's own name wins once loaded; the token's covers loading and 404s.
    name: report?.salesInchargeName ?? token.name,
    code: report?.employeeCode ?? token.code,
    report,
    isLoading: query.isLoading,
    error: missing ? null : query.error,
    missing,
    retry: () => void query.refetch(),
    back: { to: '/daily-reports' as const, search: token.backData ? { data: token.backData } : {} },
  }
}
