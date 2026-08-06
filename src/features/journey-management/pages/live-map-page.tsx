import {
  BadgeCheck,
  CalendarDays,
  Hash,
  Navigation,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { Hint } from '@/components/common/hint'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { CardPagination } from '../components/card-pagination'
import { DayScopeSegments } from '../components/day-scope-segments'
import { LiveDayCard } from '../components/live-day-card'
import { LiveMapSkeleton } from '../components/live-map-skeleton'
import { LiveStatRail } from '../components/live-stat-rail'
import { MonthStepper } from '../components/month-stepper'
import { useLiveMap } from '../hooks/use-live-map'
import { toKm } from '../lib/journey-format'

/** One provenance fact in the header, as an icon + value chip. */
function HeaderChip({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null

  return (
    <Hint label={`${label}: ${value}`}>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('truncate', mono && 'font-mono tabular-nums')}>{value}</span>
      </span>
    </Hint>
  )
}

interface LiveMapPageProps {
  /** Encrypted `?data=` token carrying `{ id, month }`. */
  data?: string
}

/**
 * Journey Management → Live Map.
 *
 * One sales incharge's month as it actually happened: pick the person, pick the
 * month, and every day of it comes back as a card — when the day started, which beat
 * was worked, and the counters the field reports are read by.
 *
 * A month is a fixed 28–31 cards, so the grid is deliberately not a table: the whole
 * month has to be scannable in one pass, because the point of the screen is spotting
 * the day that breaks the pattern. Every headline figure comes from the response's
 * `totals`, computed over the whole range.
 */
export function LiveMapPage({ data }: LiveMapPageProps) {
  const {
    inchargeId,
    incharge,
    inchargeCode,
    inchargeHint,
    month,
    monthLabel,
    prevMonth,
    nextMonth,
    selectMonth,
    today,
    isLoading,
    scope,
    setScope,
    counts,
    days,
    pagedDays,
    page,
    pageCount,
    goToPage,
    from,
    to,
    totals,
  } = useLiveMap(data)

  return (
    <div>
      {/* Header — who is being watched, and over which month. The name itself is the incharge picker. */}
      <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Navigation className="size-5" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Live map
              </p>
              <Combobox
                variant="inline"
                withAvatars
                placeholder="Select sales incharge"
                searchPlaceholder="Search sales incharge…"
                value={incharge.value}
                onChange={incharge.onChange}
                options={incharge.options}
                loading={incharge.loading}
                onScrollEnd={incharge.onScrollEnd}
                onSearchChange={incharge.onSearchChange}
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <HeaderChip icon={Hash} label="Employee code" value={inchargeCode} mono />
                <HeaderChip icon={BadgeCheck} label="Designation" value={inchargeHint} />
                <HeaderChip
                  icon={CalendarDays}
                  label="Days reported"
                  value={`${totals.daysOnField} of ${totals.days} days on field`}
                />
                {totals.gpsFlaggedDays > 0 ? (
                  <Hint
                    label={`${totals.gpsFlaggedDays} day(s) carry a mock-location hit`}
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                      <ShieldAlert className="size-3.5 shrink-0" />
                      {totals.gpsFlaggedDays} GPS flagged
                    </span>
                  </Hint>
                ) : null}
              </div>
            </div>
          </div>

          {/* Month pager — the whole screen is scoped to one month, and the
              endpoint caps a range at 31 days, so this is the only date control. */}
          <MonthStepper
            month={month}
            label={monthLabel}
            onPrev={prevMonth}
            onNext={nextMonth}
            onSelect={selectMonth}
          />
        </div>
      </div>

      {/* The rail, the scope segments and the grid all read off the same response,
          so they load as one block — showing the rail's zeros next to a spinner
          reads as a month with no work in it. */}
      {isLoading ? (
        <LiveMapSkeleton />
      ) : (
        <>
          <LiveStatRail totals={totals} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <DayScopeSegments value={scope} onChange={setScope} counts={counts} />
            <p className="text-xs text-muted-foreground">
              {toKm(totals.distanceMetres).toLocaleString('en-IN')} km travelled across{' '}
              {monthLabel}
            </p>
          </div>

          {days.length ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {pagedDays.map((day) => (
                  <LiveDayCard
                    key={day.date}
                    day={day}
                    today={today}
                    inchargeId={inchargeId ?? ''}
                  />
                ))}
              </div>

              <div className="mt-5">
                <CardPagination
                  page={page}
                  pageCount={pageCount}
                  from={from}
                  to={to}
                  total={days.length}
                  itemName="days"
                  onPageChange={goToPage}
                />
              </div>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={ShieldAlert}
                title="Nothing in this slice"
                description={`No day in ${monthLabel} matches this filter.`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
