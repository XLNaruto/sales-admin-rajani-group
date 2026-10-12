import { useMemo, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarX2, UsersRound } from 'lucide-react'
import { DayStepper } from '@/components/common/day-stepper'
import { FilterBar } from '@/components/common/filter-bar'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable } from '@/components/data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { isCompanyNotSelected } from '@/features/company'
import { timeIST } from '@/features/daily-summary'
import { ReportStatusBadge } from '../components/report-status-badge'
import {
  DAILY_REPORT_PAGE_SIZES,
  useDailyReportsScreen,
} from '../hooks/use-daily-reports-screen'
import {
  DAILY_REPORT_KINDS,
  formatKg,
  formatRupees,
  joinNames,
} from '../lib/daily-report-format'
import type { DailyReportMeasures, DailyReportRow, DailyReportSummary } from '../types'

interface DailyReportsPageProps {
  /** Encrypted `?data=` token carrying the screen's filters. */
  data?: string
}

/** Compact cells, matching the Daily Summary table. */
const COMPACT = 'px-2.5 text-xs [&:is(th)]:h-9 [&:is(th)]:text-[11px] [&:is(td)]:py-2'
/** Pinned rep column. `bg-card` on cells only — the header keeps its own. */
const PINNED = `${COMPACT} sticky left-0 z-10 min-w-44 whitespace-nowrap [&:is(td)]:bg-card`
const NOWRAP = `${COMPACT} whitespace-nowrap`
const NUMERIC = `${COMPACT} whitespace-nowrap text-right tabular-nums`
const WRAP = `${COMPACT} min-w-32`

/** A rep with no report shows a dash — never a zero that reads as a real figure. */
const DASH = <span className="text-muted-foreground">—</span>

/** Read one figure off the row's report, or a dash when there is no report. */
function withReport(
  row: DailyReportRow,
  render: (report: DailyReportSummary) => ReactNode,
): ReactNode {
  return row.report ? render(row.report) : DASH
}

/** ₹ amount, with the kg as a muted second line when there is any. */
function MoneyCell({ measures }: { measures: DailyReportMeasures }) {
  return (
    <div className="flex flex-col items-end">
      <span>{formatRupees(measures.amount)}</span>
      {measures.kg !== 0 ? (
        <span className="text-[10px] text-muted-foreground">{formatKg(measures.kg)}</span>
      ) : null}
    </div>
  )
}

/**
 * Dashboard → Daily Reports.
 *
 * Every active sales incharge's morning or evening report for one date, in the
 * selected company — reps without one included, and marked so. Target,
 * Retailing and Order to Company are the selected company's; the call counters
 * are the rep's whole window. Every figure is the backend's. Rows with a report
 * open it in full.
 */
export function DailyReportsPage({ data }: DailyReportsPageProps) {
  const {
    kind,
    selectKind,
    date,
    dateLabel,
    today,
    selectDate,
    prevDate,
    nextDate,
    status,
    search,
    setSearch,
    resetFilters,
    rows,
    total,
    isLoading,
    error,
    refresh,
    pagination,
    onPaginationChange,
    openReport,
  } = useDailyReportsScreen(data)

  const columns = useMemo<ColumnDef<DailyReportRow>[]>(
    () => [
      {
        id: 'sales_incharge',
        header: 'Sales Incharge',
        meta: { className: PINNED },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.salesInchargeName}</span>
            {row.original.employeeCode ? (
              <span className="text-[11px] text-muted-foreground">
                {row.original.employeeCode}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'centre',
        header: 'Centre',
        meta: { className: WRAP },
        cell: ({ row }) => withReport(row.original, (r) => joinNames(r.centres, ' / ') || DASH),
      },
      {
        id: 'market_route',
        header: 'Market Route',
        meta: { className: COMPACT },
        cell: ({ row }) =>
          withReport(row.original, (r) => {
            const routes = joinNames(r.marketRoutes, ', ')
            if (!routes) return DASH
            return (
              <Hint label={routes}>
                <span className="block max-w-48 cursor-default truncate">{routes}</span>
              </Hint>
            )
          }),
      },
      {
        id: 'start',
        header: 'Start',
        meta: { className: NOWRAP },
        cell: ({ row }) => withReport(row.original, (r) => timeIST(r.startTime) || DASH),
      },
      {
        id: 'close',
        header: 'Close',
        meta: { className: NOWRAP },
        cell: ({ row }) =>
          withReport(row.original, (r) =>
            r.closeTime ? (
              timeIST(r.closeTime)
            ) : (
              <span className="font-medium text-warning">In progress</span>
            ),
          ),
      },
      {
        id: 'target',
        header: 'Target ₹',
        meta: { className: NUMERIC },
        cell: ({ row }) => withReport(row.original, (r) => <MoneyCell measures={r.target} />),
      },
      {
        id: 'retailing',
        header: 'Retailing ₹',
        meta: { className: NUMERIC },
        cell: ({ row }) => withReport(row.original, (r) => <MoneyCell measures={r.retailing} />),
      },
      {
        id: 'order_to_company',
        header: 'Order to Company ₹',
        meta: { className: NUMERIC },
        cell: ({ row }) =>
          withReport(row.original, (r) => <MoneyCell measures={r.orderToCompany} />),
      },
      ...(['sc', 'tc', 'pc', 'nc'] as const).map(
        (key): ColumnDef<DailyReportRow> => ({
          id: key,
          header: key.toUpperCase(),
          meta: { className: NUMERIC },
          cell: ({ row }) => withReport(row.original, (r) => r.counters[key]),
        }),
      ),
      {
        id: 'status',
        header: 'Status',
        meta: { className: NOWRAP },
        cell: ({ row }) => (
          <ReportStatusBadge
            kind={row.original.kind}
            hasReport={row.original.report !== null}
            isClosed={row.original.report?.isClosed ?? false}
          />
        ),
      },
    ],
    [],
  )

  // A `403 COMPANY_NOT_SELECTED` is a missing tenant, not a missing permission —
  // the company picker opens for it, so only a genuine denial lands here.
  if (isForbiddenError(error) && !isCompanyNotSelected(error)) return <Forbidden />

  return (
    <div>
      <PageHeader
        title="Daily Reports"
        description="Every sales incharge's morning or evening field report for the selected day."
        actions={
          <DayStepper
            date={date}
            label={dateLabel}
            max={today}
            onPrev={prevDate}
            onNext={nextDate}
            onSelect={selectDate}
          />
        }
      />

      <Tabs value={kind} onValueChange={selectKind}>
        <TabsList>
          {DAILY_REPORT_KINDS.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="cursor-pointer">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          itemName="sales incharges"
          maxHeight="65vh"
          pageSize={pagination.pageSize}
          pageSizeOptions={DAILY_REPORT_PAGE_SIZES}
          manualPagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          rowCount={total}
          onRowClick={openReport}
          isRowClickable={(row) => row.report !== null}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Search by employee name / employee code',
              }}
              facets={[status]}
              onReset={resetFilters}
              refresh={refresh}
            />
          }
          emptyState={
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                {error ? <CalendarX2 className="size-6" /> : <UsersRound className="size-6" />}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {error
                    ? "Couldn't load the daily reports"
                    : 'No sales incharges found for this date'}
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {error
                    ? error.message || 'Something went wrong. Try refreshing.'
                    : 'Try another date, or clear the search and status filter.'}
                </p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
