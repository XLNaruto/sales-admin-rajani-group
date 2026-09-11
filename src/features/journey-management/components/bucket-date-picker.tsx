import { useMemo } from 'react'
import { format, getDay, parseISO } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Popover } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { monthDates, monthLabel, shortDayLabel, todayISO } from '../lib/journey-format'

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
 * - **Nothing in the past.** A day that has gone cannot be planned, worked
 *   differently, or taken back — whatever it holds is now a record of what
 *   happened. Past dates are therefore shown and never editable, including the
 *   ones this bucket holds: a chip for one carries no remove button. The whole
 *   month of a month already over is read-only by this rule alone.
 */
export function BucketDatePicker({
  month,
  lockedDates,
  takenDates,
  scheduledDates,
  dates,
  max,
  disabled = false,
  readOnly = false,
  label,
  onChange,
  onToggle,
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
  /**
   * Dates the SALES INCHARGE has already put this bucket on.
   *
   * Shown as held — a chip and a filled cell — because a bucket whose days are
   * all dated on the calendar below read as an untouched "Pick dates" here, and
   * the admin's next move was to pin the same dates a second time.
   *
   * They are **his**, so they are not pinnable and not removable from here: a
   * pin is a promise he can no longer move, and re-pinning a date he has already
   * dated would charge the bucket twice for the one day. Changing one is done on
   * the calendar below, which is the surface that owns it.
   */
  scheduledDates?: Set<string>
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
  /**
   * Give the bucket a date on the CALENDAR, or take one off it — present only
   * once a calendar exists and is editable.
   *
   * The two surfaces then stay one story: the dates here and the rows below are
   * the same facts, so a date added here grows a row below it and a date removed
   * here clears one. Without this the picker could only ever pin, and a pin is a
   * second, stronger kind of date that the sales incharge can no longer move —
   * which is not what "take this day off him" means.
   */
  onToggle?: (date: string, on: boolean) => void
}) {
  const selected = useMemo(() => new Set(dates), [dates])
  /** His dates, minus any the admin has since pinned — those render as pins. */
  const held = useMemo(
    () => [...(scheduledDates ?? [])].filter((date) => !selected.has(date)).sort(),
    [scheduledDates, selected],
  )
  /**
   * Today, in the same `yyyy-MM-dd` shape the dates are in — so "has it passed"
   * is a string comparison and never a timezone question.
   */
  const today = todayISO()
  const isPast = (date: string) => date < today

  /**
   * The ceiling counts HIS dates too. The bucket has `max` days and he has
   * already spent `held.length` of them, so pinning past what is left would
   * promise days the count does not hold.
   */
  const full = dates.length + held.length >= max

  const cells = useMemo(() => {
    const days = monthDates(month)
    if (days.length === 0) return []
    const lead = getDay(parseISO(days[0]))
    return [...Array.from({ length: lead }, () => null), ...days]
  }, [month])

  const toggle = (date: string) => {
    // The day has gone. Nothing about it is a plan any more, so neither adding
    // nor removing it means anything — the cell is disabled, and this guards the
    // keyboard race behind it.
    if (isPast(date)) return

    // A PIN comes off the allocation, whichever surface owns the rest: it is the
    // admin's own promise, and it is the allocation's Save that made it.
    if (selected.has(date)) {
      onChange(dates.filter((candidate) => candidate !== date))
      return
    }

    // Refused rather than sent and rejected: a date a visit has landed on is
    // nobody's to re-plan, the admin's included — and a date another bucket has
    // fixed is already carrying its one activity.
    if (lockedDates?.has(date) || takenDates?.has(date)) return

    // The calendar owns the date whenever there is one to write. Taking a date
    // off the bucket is a real edit of his month, not the removal of a pin.
    if (onToggle) {
      if (scheduledDates?.has(date)) {
        onToggle(date, false)
        return
      }
      if (full) return
      onToggle(date, true)
      return
    }

    // No calendar to write: the only date this screen can give is a pin.
    if (scheduledDates?.has(date)) return
    // Silently refused rather than swapping one out: the cell is already
    // disabled, so this only guards a keyboard race.
    if (full) return
    onChange([...dates, date].sort())
  }

  /**
   * One date on the bucket, as a chip.
   *
   * **The two kinds look the same**, deliberately. A pin and a dated day differ
   * in which Save commits them, not in what they tell the admin: the bucket is on
   * that date either way, and giving his own dates a second, quieter style made
   * the common row — every date dated by him — read as an empty one next to a
   * single pin. Which is which is in the tooltip, where it matters.
   */
  const chip = (date: string, held = false) => {
    const remove = isPast(date)
      ? undefined
      : held
        ? onToggle && (() => onToggle(date, false))
        : () => onChange(dates.filter((candidate) => candidate !== date))

    return (
      <Hint
        key={date}
        label={
          isPast(date)
            ? `${shortDayLabel(date)} has passed — the day is a record now, not a plan.`
            : held
              ? onToggle
                ? `${shortDayLabel(date)} is dated on the calendar below. Removing it here clears that day too.`
                : `${shortDayLabel(date)} is dated on the calendar below — the sales incharge's own day.`
              : `${shortDayLabel(date)} is pinned by you. The allocation's Save fixes it, and he cannot move it.`
        }
      >
        <span
          className={cn(
            'inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-full bg-primary/10 pl-3 text-xs font-medium text-primary',
            !readOnly && remove ? 'pr-1.5' : 'pr-3',
          )}
        >
          <span className="min-w-0 truncate">{shortDayLabel(date)}</span>
          {!readOnly && remove ? (
            <button
              type="button"
              disabled={disabled}
              onClick={remove}
              aria-label={
                held
                  ? `Remove ${shortDayLabel(date)} from ${label}`
                  : `Unpin ${shortDayLabel(date)}`
              }
              className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </span>
      </Hint>
    )
  }

  /** His own dated days, in the same chip. */
  const heldChip = (date: string) => chip(date, true)

  // The dates read as chips, the same as the distributors above them: each one
  // is a separate promise about the month, and a summary count hides which.
  if (readOnly) {
    return dates.length === 0 && held.length === 0 ? null : (
      <>
        {dates.map((date) => chip(date))}
        {held.map(heldChip)}
      </>
    )
  }

  return (
    <>
      {dates.map((date) => chip(date))}
      {held.map(heldChip)}

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
              {dates.length + held.length === 0
                ? 'Pick dates'
                : `${dates.length + held.length}/${max}`}
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
              {dates.length + held.length} / {max}
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
              /** The bucket already holds this date on the calendar. */
              const onCalendar = Boolean(scheduledDates?.has(date)) && !selected.has(date)
              const past = isPast(date)
              const reason = past
                ? 'This day has gone — it can no longer be planned.'
                : lockedDates?.has(date)
                ? 'A visit has landed on this date, so it is history.'
                : takenDates?.has(date)
                  ? `Already fixed for ${takenDates.get(date)} — one date carries one fixed activity.`
                  : onCalendar && !onToggle
                    ? 'He has already dated this himself. Pinning it again would spend the day twice.'
                    : null
              // A date the bucket already holds is never blocked when the
              // calendar is writable: clicking it is how the day comes off.
              const blocked =
                past ||
                (!selected.has(date) && !(onCalendar && onToggle) && (reason != null || full))

              const cell = (
                <button
                  type="button"
                  onClick={() => toggle(date)}
                  // The ceiling disables what is left rather than hiding it, so
                  // the shape of the month stays readable while it bites.
                  disabled={blocked}
                  aria-pressed={selected.has(date) || onCalendar}
                  className={cn(
                    'grid h-8 w-full cursor-pointer place-items-center rounded-lg text-sm tabular-nums transition-colors',
                    selected.has(date)
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : // A date the bucket holds on the calendar is filled too —
                        // the day IS spoken for — but flat and muted, so a pin
                        // still reads as the stronger promise of the two.
                        onCalendar
                        ? 'bg-muted font-semibold text-foreground hover:bg-muted/70'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                    'disabled:cursor-not-allowed disabled:hover:bg-transparent',
                    // A past date the bucket HOLDS keeps its fill: the day is
                    // spent on this bucket, which is a fact worth reading even
                    // though nothing about it can change.
                    !onCalendar && !selected.has(date) && 'disabled:text-muted-foreground/40',
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
                : held.length >= max - dates.length
                  ? 'He has dated the rest himself.'
                  : `${max - dates.length - held.length} day${
                      max - dates.length - held.length === 1 ? '' : 's'
                    } left undated — his to pick.`}
            </p>
            {/* Only when something is actually clearable: a bucket whose dates
                have all passed would otherwise offer a button that does nothing. */}
            {[...dates, ...held].some((date) => !isPast(date)) ? (
              <button
                type="button"
                onClick={() => {
                  // Both kinds of date, in one gesture: the pins off the
                  // allocation and the dated days off the calendar. Clearing only
                  // half of a row that shows both would read as a no-op.
                  // The past is not clearable — those days are spent. Only the
                  // dates still ahead come off.
                  const spent = dates.filter(isPast)
                  if (dates.length > spent.length) onChange(spent)
                  if (onToggle) {
                    held.filter((date) => !isPast(date)).forEach((d) => onToggle(d, false))
                  }
                }}
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
