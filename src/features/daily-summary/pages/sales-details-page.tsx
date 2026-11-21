import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarX2, Hash, ReceiptText, UserX } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { DayStepper } from '@/components/common/day-stepper'
import { EmptyState } from '@/components/common/empty-state'
import { RefreshControl } from '@/components/common/refresh-control'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { isCompanyNotSelected } from '@/features/company'
import { SalesDetailsTable } from '../components/sales-details-table'
import {
  SALES_DETAILS_PAGE_SIZES,
  useSalesDetailsScreen,
} from '../hooks/use-sales-details-screen'
import { formatAmount, formatQty, SALES_DETAILS_FILTERS } from '../lib/daily-summary-format'

const HEADER_BUTTON =
  'inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'

interface SalesDetailsPageProps {
  /** Encrypted `?data=` token carrying `{ id, date, name, code, backData }`. */
  data?: string
}

/** One headline figure, with an optional breakdown line under it. */
function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground tabular-nums">{sub}</p> : null}
    </div>
  )
}

const rupees = (value: number) => `₹${formatAmount(value)}`

/** `2026-11-01` → `1 Nov`, or null when absent / unparseable. */
function shortDate(value: string | null): string | null {
  if (!value) return null
  try {
    return format(parseISO(value), 'd MMM')
  } catch {
    return null
  }
}

/**
 * Dashboard → Daily Summary → one rep's Sales Details.
 *
 * Every call the rep made on the day, in time order, with the orders booked in
 * it — a zero-sale call still has a row, and an order with no visit gets its
 * own. Whole-day totals and the rep's month-to-date net sales (primary and
 * secondary) head the page; the call list is server-paged. Uses the
 * Daily Summary's grant and order-status rule, so the rows add up to its row.
 */
export function SalesDetailsPage({ data }: SalesDetailsPageProps) {
  const {
    id,
    date,
    dateLabel,
    today,
    selectDate,
    prevDate,
    nextDate,
    name,
    code,
    details,
    type,
    selectType,
    pagination,
    onPaginationChange,
    isLoading,
    error,
    repMissing,
    refresh,
    back,
  } = useSalesDetailsScreen(data)

  if (isForbiddenError(error) && !isCompanyNotSelected(error)) return <Forbidden />

  const backLink = (
    <Link to={back.to} search={back.search} className={HEADER_BUTTON}>
      <ArrowLeft className="size-4" />
      Daily Summary
    </Link>
  )

  let body: ReactNode
  if (!id || repMissing) {
    body = (
      <EmptyState
        icon={UserX}
        title="This sales incharge isn't in the selected company"
        description="They may belong to a different company. Go back to the list to pick a rep in this one."
        action={backLink}
      />
    )
  } else if (isLoading) {
    body = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  } else if (error || !details) {
    body = (
      <EmptyState
        icon={CalendarX2}
        title="Couldn't load the sales details"
        description={error?.message || 'Something went wrong. Try again.'}
        action={
          <Button variant="outline" onClick={refresh.onRefresh}>
            Try again
          </Button>
        }
      />
    )
  } else {
    const t = details.dayTotals
    const mtdFrom = shortDate(details.mtdFrom)
    body = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure
            label="Day Quantity"
            value={`${formatQty(t.qty)} units`}
            sub={`${formatQty(t.stdQty)} std units`}
          />
          <Figure
            label="Day Value"
            value={rupees(t.value)}
            sub={`Discount ${rupees(t.discount)}`}
          />
          <Figure label="Day Net Sales" value={rupees(t.netSales)} />
          <Figure
            label={mtdFrom ? `MTD Net Sales (from ${mtdFrom})` : 'MTD Net Sales'}
            value={rupees(details.mtdNetSales)}
            sub={`Primary ${rupees(details.mtdPrimaryNetSales)} · Secondary ${rupees(details.mtdSecondaryNetSales)}`}
          />
        </div>
        <Tabs value={type} onValueChange={selectType}>
          <TabsList>
            {SALES_DETAILS_FILTERS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="cursor-pointer">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SalesDetailsTable
          rows={details.rows}
          total={details.total}
          isLoading={false}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          pageSizeOptions={SALES_DETAILS_PAGE_SIZES}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header — whose sales, which day, and the way back. */}
      <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <ReceiptText className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Sales Details · {dateLabel}
              </p>
              <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
                {name ?? 'Sales incharge'}
              </h1>
              {code ? (
                <span className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Hash className="size-3" />
                  {code}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {id && !repMissing ? (
              <>
                <RefreshControl {...refresh} compact />
                <DayStepper
                  date={date}
                  label={dateLabel}
                  max={today}
                  onPrev={prevDate}
                  onNext={nextDate}
                  onSelect={selectDate}
                />
              </>
            ) : null}
            {backLink}
          </div>
        </div>
      </div>

      {body}
    </div>
  )
}
