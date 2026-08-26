import { useMemo } from 'react'
import { format, getDay, parseISO } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Popover } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { monthDates, monthLabel, shortDayLabel } from '../lib/journey-format'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * The **optional** dates on an allocation bucket.
 *
 * The model this screen is built on is that the admin allocates counts and the
 * sales incharge picks the dates — that has not changed, and a bucket with no
 * dates on it is still the ordinary case. This is the exception the admin
 * occasionally needs: a meeting that is on the 4th, a depot visit that has to
 * land in the first week. Naming a date here pins it; leaving it empty leaves
 * the choice where it was.
 *
 * Two rules the control enforces by construction rather than by a validator:
 *
 * - **At most `max` dates**, `max` being the bucket's own day count. Six dates
 *   on five days is not a thing the month can mean, so once the count is reached
 *   the remaining days are disabled rather than silently dropped later.
 * - **Only dates inside the plan's month.** The calendar does not page: an
 *   allocation belongs to one month and a date outside it has nowhere to land.
 */
export function BucketDatePicker({
  month,
  lockedDates,
  takenDates,
  dates,
  max,
  disabled = false,
  readOnly = false,
  label,
  onChange,
}: {
  /** The plan's month, `yyyy-MM` — the only month this picker offers. */
  month: string
  /**
   * Dates a visit has already landed on. The server refuses a pin on one
   * (`JOURNEY_PLAN_DAY_LOCKED`), so they are disabled here — a dead cell beats a
   * 400 that takes the whole month's save down with it.
   */
  lockedDates?: Set<string>
  /**
   * Dates another bucket has already pinned, and what pinned them.
   *
   * **One date carries one fixed activity.** A date is a day of his month, and
   * two activities fixed to it is two instructions for the same day — so a date
   * spoken for elsewhere in the allocation is disabled here and says who has it.
   */
  takenDates?: Map<string, string>
  /** Dates already pinned, `yyyy-MM-dd`. */
  dates: string[]
  /** The bucket's day count. Picking stops here. */
  max: number
  disabled?: boolean
  /** Frozen month: the dates are shown as text with no calendar behind them. */
  readOnly?: boolean
  /** What the dates are for, for the accessible name (e.g. "Depot Visit"). */
  label: string
  onChange: (dates: string[]) => void
}) {
  const selected = useMemo(() => new Set(dates), [dates])
  const full = dates.length >= max

  const cells = useMemo(() => {
    const days = monthDates(month)
    if (days.length === 0) return []
    const lead = getDay(parseISO(days[0]))
    return [...Array.from({ length: lead }, () => null), ...days]
  }, [month])

  const toggle = (date: string) => {
    // Refused rather than sent and rejected: a date a visit has landed on is
    // nobody's to re-plan, the admin's included — and a date another bucket has
    // fixed is already carrying its one activity.
    if (!selected.has(date) && (lockedDates?.has(date) || takenDates?.has(date))) return
    if (selected.has(date)) {
      onChange(dates.filter((candidate) => candidate !== date))
      return
    }
    // Silently refused rather than swapping one out: the cell is already
    // disabled, so this only guards a keyboard race.
    if (full) return
    onChange([...dates, date].sort())
  }

  /** One pinned date, as a chip. Read-only ones carry no remove button. */
  const chip = (date: string) => (
    <span
      key={date}
      className="inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-full bg-primary/10 pr-1.5 pl-3 text-xs font-medium text-primary"
    >
      <span className="min-w-0 truncate">{shortDayLabel(date)}</span>
      {!readOnly ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(dates.filter((candidate) => candidate !== date))}
          aria-label={`Unpin ${shortDayLabel(date)}`}
          className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )

  // The dates read as chips, the same as the distributors above them: each one
  // is a separate promise about the month, and a summary count hides which.
  if (readOnly) {
    return dates.length === 0 ? null : <>{dates.map(chip)}</>
  }

  return (
    <>
      {dates.map(chip)}

      <Popover
        align="start"
        width={272}
        height={340}
        disabled={disabled}
        wrapClassName="inline-flex max-w-full min-w-0"
        className="p-3"
        trigger={
          // A chip, not a field: the dates are optional and usually absent, so an
          // empty input-looking box on every row would read as something left
          // unfilled. It stays reachable when the count is full — the calendar is
          // also how a date is swapped for another.
          <span
            className={cn(
              'inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-3 text-xs font-medium transition-colors',
              full
                ? 'border-primary/30 text-primary/80 hover:border-primary/50'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="truncate">
              {dates.length === 0 ? 'Pick dates' : `${dates.length}/${max}`}
            </span>
          </span>
        }
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            {/* No month pager: the allocation is for this month, and a date
              outside it has nowhere to land. */}
            <span className="truncate font-heading text-sm font-semibold">
              {monthLabel(month)}
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                full ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              {dates.length} / {max}
            </span>
          </div>

          <div
            role="group"
            aria-label={`Dates for ${label}`}
            className="mt-3 grid grid-cols-7 gap-1"
          >
            {WEEKDAYS.map((weekday, i) => (
              <span
                key={`${weekday}-${i}`}
                className="grid h-6 place-items-center text-[10px] font-semibold uppercase text-muted-foreground"
              >
                {weekday}
              </span>
            ))}

            {cells.map((date, index) => {
              if (date == null) return <span key={`pad-${index}`} aria-hidden="true" />

              // Why this date cannot be picked, when it cannot. A cell with a
              // reason gets the tooltip; the other 28 stay plain.
              const reason = lockedDates?.has(date)
                ? 'A visit has landed on this date, so it is history.'
                : takenDates?.has(date)
                  ? `Already fixed for ${takenDates.get(date)} — one date carries one fixed activity.`
                  : null
              const blocked = !selected.has(date) && (reason != null || full)

              const cell = (
                <button
                  type="button"
                  onClick={() => toggle(date)}
                  // The ceiling disables what is left rather than hiding it, so
                  // the shape of the month stays readable while it bites.
                  disabled={blocked}
                  aria-pressed={selected.has(date)}
                  className={cn(
                    'grid h-8 w-full cursor-pointer place-items-center rounded-lg text-sm tabular-nums transition-colors',
                    selected.has(date)
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                    'disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent',
                  )}
                >
                  {format(parseISO(date), 'd')}
                </button>
              )

              // The design-system tooltip, not `title`. Wrapped in a span
              // because a disabled button fires no pointer events, so the
              // trigger has to be something that still hears the hover.
              return reason && blocked ? (
                <Hint key={date} label={reason}>
                  <span className="grid cursor-not-allowed">{cell}</span>
                </Hint>
              ) : (
                <span key={date} className="grid">
                  {cell}
                </span>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <p className="text-[11px] text-muted-foreground">
              {full
                ? 'All the bucket’s days are dated.'
                : `${max - dates.length} day${max - dates.length === 1 ? '' : 's'} left undated — his to pick.`}
            </p>
            {dates.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3" />
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </Popover>
    </>
  )
}
