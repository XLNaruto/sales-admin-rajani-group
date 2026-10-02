import { useMemo } from 'react'
import type { Column, ColumnDef } from '@tanstack/react-table'
import { CalendarX2, Globe2, Route, UsersRound } from 'lucide-react'
import { DayStepper } from '@/components/common/day-stepper'
import { FilterBar } from '@/components/common/filter-bar'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Combobox } from '@/components/ui/combobox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { isCompanyNotSelected } from '@/features/company'
import {
  DAILY_SUMMARY_PAGE_SIZES,
  useDailySummaryScreen,
} from '../hooks/use-daily-summary-screen'
import {
  DAILY_SUMMARY_TABS,
  DAY_TYPE_LABEL,
  formatNetValue,
  timeIST,
} from '../lib/daily-summary-format'
import type { DailySummary } from '../types'

interface DailySummaryPageProps {
  /** Encrypted `?data=` token carrying the screen's filters. */
  data?: string
}

/**
 * Compact cells: 15 columns have to read on one screen, so every column drops
 * to small text and tight padding (header and body alike).
 */
const COMPACT = 'px-2.5 text-xs [&:is(th)]:h-9 [&:is(th)]:text-[11px] [&:is(td)]:py-2'
/** Pinned Field User column. `bg-card` on cells only — the header keeps its own. */
const PINNED = `${COMPACT} sticky left-0 z-10 min-w-44 whitespace-nowrap [&:is(td)]:bg-card`
const NOWRAP = `${COMPACT} whitespace-nowrap`
const NUMERIC = `${COMPACT} whitespace-nowrap tabular-nums`
/** Long free-text lists (beats, JW users) wrap instead of widening the table. */
const WRAP = `${COMPACT} min-w-40`

/** Sortable header styled like the plain ones: same size, case and tracking. */
function SortHeader({ column, title }: { column: Column<DailySummary>; title: string }) {
  return (
    <DataTableColumnHeader
      column={column}
      title={title}
      className="-ml-2 h-7 gap-0 px-2 text-[11px] font-semibold uppercase tracking-wider [&_svg]:ml-1 [&_svg]:size-3"
    />
  )
}

/**
 * Dashboard → Daily Summary.
 *
 * One row per sales incharge for a single day: when they logged in and out,
 * their first call, call counts, productivity, primary order value and the beats
 * they worked. The day type is the backend's verdict and is shown as sent.
 * Clicking a row opens that rep's day trail, for admins holding `live-day:read`.
 */
export function DailySummaryPage({ data }: DailySummaryPageProps) {
  const {
    date,
    dateLabel,
    today,
    selectDate,
    prevDate,
    nextDate,
    tab,
    selectTab,
    region,
    search,
    setSearch,
    clearSearch,
    rows,
    total,
    isLoading,
    error,
    refresh,
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
    canOpenDay,
    openDay,
  } = useDailySummaryScreen(data)

  const columns = useMemo<ColumnDef<DailySummary>[]>(
    () => [
      {
        id: 'sales_incharge_name',
        accessorKey: 'salesInchargeName',
        header: ({ column }) => <SortHeader column={column} title="Field User" />,
        meta: { className: PINNED },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {canOpenDay && (
              <Hint label="Open this rep's day on the Live Map">
                <button
                  type="button"
                  onClick={() => openDay(row.original)}
                  aria-label={`Open ${row.original.salesInchargeName}'s day`}
                  className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                  <Route className="size-3" />
                </button>
              </Hint>
            )}
            <span className="font-medium text-foreground">
              {row.original.salesInchargeName}
            </span>
          </div>
        ),
      },
      {
        id: 'day_type',
        header: 'Type',
        enableSorting: false,
        meta: { className: NOWRAP },
        cell: ({ row }) => (row.original.dayType ? DAY_TYPE_LABEL[row.original.dayType] : ''),
      },
      {
        id: 'log_in_at',
        accessorKey: 'logInAt',
        header: ({ column }) => <SortHeader column={column} title="Log In" />,
        meta: { className: NOWRAP },
        cell: ({ row }) => <span className="tabular-nums">{timeIST(row.original.logInAt)}</span>,
      },
      {
        id: 'first_call_at',
        accessorKey: 'firstCallAt',
        header: ({ column }) => <SortHeader column={column} title="First Call" />,
        meta: { className: NOWRAP },
        cell: ({ row }) => (
          <span className="tabular-nums">{timeIST(row.original.firstCallAt)}</span>
        ),
      },
      {
        id: 'tc',
        accessorFn: (row) => row.counters.tc,
        header: ({ column }) => <SortHeader column={column} title="TC" />,
        meta: { className: NUMERIC },
        cell: ({ row }) => row.original.counters.tc,
      },
      {
        id: 'pc',
        accessorFn: (row) => row.counters.pc,
        header: ({ column }) => <SortHeader column={column} title="PC" />,
        meta: { className: NUMERIC },
        cell: ({ row }) => row.original.counters.pc,
      },
      {
        id: 'productivity_percentage',
        accessorKey: 'productivityPercentage',
        header: ({ column }) => <SortHeader column={column} title="Productivity(%)" />,
        meta: { className: NUMERIC },
        cell: ({ row }) => row.original.productivityPercentage,
      },
      {
        id: 'total_physical_calls',
        header: 'Total Physical Calls',
        enableSorting: false,
        meta: { className: NUMERIC },
        cell: ({ row }) => row.original.totalPhysicalCalls,
      },
      {
        id: 'net_value',
        accessorKey: 'netValue',
        header: ({ column }) => <SortHeader column={column} title="Net Value" />,
        meta: { className: NUMERIC },
        cell: ({ row }) => formatNetValue(row.original.netValue),
      },
      {
        id: 'sc',
        header: 'Selected Journey Point of Sale',
        enableSorting: false,
        meta: { className: NUMERIC },
        cell: ({ row }) => row.original.counters.sc,
      },
      {
        id: 'log_out_at',
        header: 'Log Out Time',
        enableSorting: false,
        meta: { className: NOWRAP },
        cell: ({ row }) => {
          const { logOutAt, isDayOpen } = row.original
          if (logOutAt) return <span className="tabular-nums">{timeIST(logOutAt)}</span>
          if (isDayOpen) {
            return <span className="font-medium text-warning">Day Not Ended</span>
          }
          return null
        },
      },
      {
        id: 'beat_names',
        header: 'Selected Beat',
        enableSorting: false,
        meta: { className: WRAP },
        cell: ({ row }) => row.original.beatNames.join(', '),
      },
      {
        id: 'joint_working_names',
        header: 'Selected JW User',
        enableSorting: false,
        meta: { className: WRAP },
        cell: ({ row }) => row.original.jointWorkingNames.join(', '),
      },
    ],
    [canOpenDay, openDay],
  )

  // A `403 COMPANY_NOT_SELECTED` is a missing tenant, not a missing permission —
  // the company picker opens for it, so only a genuine denial lands here.
  if (isForbiddenError(error) && !isCompanyNotSelected(error)) return <Forbidden />

  return (
    <div>
      <PageHeader
        title="Daily Summary"
        description="Attendance, calls, productivity and order value for every sales incharge on the selected day."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Combobox
              {...region}
              icon={Globe2}
              placeholder="Region"
              searchPlaceholder="Search states"
              aria-label="Region"
              className="w-52"
            />
            <DayStepper
              date={date}
              label={dateLabel}
              max={today}
              onPrev={prevDate}
              onNext={nextDate}
              onSelect={selectDate}
            />
          </div>
        }
      />

      <div className="overflow-x-auto pb-1">
        <Tabs value={tab} onValueChange={selectTab}>
          <TabsList>
            {DAILY_SUMMARY_TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="cursor-pointer">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          itemName="sales incharges"
          maxHeight="65vh"
          pageSize={pagination.pageSize}
          pageSizeOptions={DAILY_SUMMARY_PAGE_SIZES}
          manualPagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          rowCount={total}
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          onRowClick={canOpenDay ? openDay : undefined}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Search by employee name / employee code',
              }}
              onReset={clearSearch}
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
                    ? "Couldn't load the daily summary"
                    : 'No sales incharges found for this date'}
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {error
                    ? error.message || 'Something went wrong. Try refreshing.'
                    : 'Try another date, region or tab.'}
                </p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
