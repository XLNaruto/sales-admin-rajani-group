import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Loader2, Plus, Trash2, Wand2, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ActivitySelect } from './activity-select'
import { DayCountInput } from './day-count-input'
import { MonthDayPicker } from './month-day-picker'
import { monthDates, shortDayLabel } from '../lib/journey-format'
import type { ActivityDef, ActivityQuota } from '../types'

/**
 * How a row states its size.
 *
 * - `days` — a count, and the sales incharge picks which dates a month later.
 * - `dates` — the office picks the dates, and the count is however many it picked.
 */
type RowMode = 'days' | 'dates'

/** Calendar panel size, in px — a seven-column month needs the width to stay legible. */
const CALENDAR_WIDTH = 292
/** Roughly how tall the panel comes out, so it knows when to open upward instead. */
const CALENDAR_HEIGHT = 300

/** A row in the editor — `key` keeps React identity as rows are added/removed. */
interface QuotaRow {
  key: number
  activityId: number
  mode: RowMode
  /** Meaningful in `days` mode; in `dates` mode the count is `dates.length`. */
  daysCount: number
  /** Meaningful in `dates` mode. Kept across a mode switch so toggling is not destructive. */
  dates: string[]
}

/** What a row currently claims, whichever way it states it. */
function rowDays(row: QuotaRow): number {
  return row.mode === 'dates' ? row.dates.length : row.daysCount
}

/**
 * Journey Management → Journey Plans → "Generate month".
 *
 * The run **drafts** each sales incharge's month: the activity buckets below, applied to every
 * sales incharge in the run, plus the solver's split of each sales incharge's remaining days across his
 * own cities — weighted by how much work each city holds and by how long it has
 * gone untouched.
 *
 * Every plan lands as a **`draft`**, which the sales incharge cannot see at all. Publishing is
 * a separate, deliberate step per plan.
 *
 * A bucket is an activity and a size, and each row says which of the two ways it
 * means that size:
 *
 * - **Days** — a count. "Four weekly offs" is a company fact and which dates they
 *   fall on is the sales incharge's to decide a month later. The default, because
 *   it is the common case.
 * - **Dates** — the exact dates, picked on the month's calendar. For the bucket the
 *   office dates itself: a meeting on the 12th is not the sales incharge's call.
 *   The count is then whatever was picked.
 *
 * Four rules are enforced by construction rather than by a validator, because a
 * control that can't take a wrong answer beats an error message:
 *
 * - **Beatless activities only.** See `allocatableActivities` — a whole-run generate
 *   has no sales incharge to fetch the real allocatable whitelist for, so it offers everything
 *   that does not require a beat and lets the server refuse the rest.
 * - **One row per activity.** An activity another row holds is dropped from this
 *   row's options, so two rows can never allocate the same activity.
 * - **One activity per date.** A date another row picked is unclickable in this
 *   row's calendar, so no date can be claimed twice.
 * - **Never the whole month.** Each size is capped to leave at least one day for
 *   field work — the endpoint refuses a run whose activity days leave no room.
 */
export function GenerateMonthDialog({
  open,
  onOpenChange,
  month,
  monthLabel,
  activities,
  isPending = false,
  onGenerate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The period being generated, as `yyyy-MM`. */
  month: string
  /** That period as "August 2026", for the copy. */
  monthLabel: string
  /** Activity master — the first column's options. */
  activities: ActivityDef[]
  /** A run is in flight; the dialog stays open and the confirm button spins. */
  isPending?: boolean
  /** Called with the buckets (possibly none) and whether to replace existing months. */
  onGenerate: (input: {
    activityAllocations: ActivityQuota[]
    replaceExisting: boolean
  }) => void
}) {
  const [rows, setRows] = useState<QuotaRow[]>([])
  const [replaceExisting, setReplaceExisting] = useState(false)
  // Row keys only need to be unique within one editing session, not stable
  // across them — a counter is enough and never collides after a reset.
  const nextKey = useRef(0)

  const daysInMonth = useMemo(() => monthDates(month).length, [month])

  // Reopening starts clean, and a month step while open would otherwise leave
  // counts sized for the month that is no longer being generated.
  useEffect(() => {
    setRows([])
    setReplaceExisting(false)
    nextKey.current = 0
  }, [open, month])

  const taken = useMemo(
    () => new Set(rows.map((row) => row.activityId).filter(Boolean)),
    [rows],
  )

  /**
   * Days the rows already claim. The ceiling is `daysInMonth - 1`, not the month:
   * the endpoint refuses a run whose activity days leave no room for field work,
   * and there is nothing for the solver to spread across the cities either.
   */
  const claimed = rows.reduce((sum, row) => sum + rowDays(row), 0)
  const daysLeft = Math.max(0, daysInMonth - 1 - claimed)

  /** Dates the dated rows hold, so no two rows can claim the same one. */
  const datesTaken = useMemo(
    () => new Set(rows.flatMap((row) => (row.mode === 'dates' ? row.dates : []))),
    [rows],
  )

  /**
   * Measured against the ALLOCATABLE set, not the whole master: field-selling rows
   * are filtered out of every picker, so counting them here would leave the "Add
   * activity" button live with nothing left to choose.
   */
  const allocatable = useMemo(() => allocatableActivities(activities), [activities])
  const allActivitiesUsed = allocatable.every((activity) => taken.has(activity.id))
  const canAddRow = allocatable.length > 0 && !allActivitiesUsed && daysLeft > 0

  const addRow = () => {
    if (!canAddRow) return
    setRows((prev) => [
      ...prev,
      { key: nextKey.current++, activityId: 0, mode: 'days', daysCount: 1, dates: [] },
    ])
  }

  const removeRow = (key: number) =>
    setRows((prev) => prev.filter((row) => row.key !== key))

  const patchRow = (key: number, patch: Partial<QuotaRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  /**
   * The most days one row may take: what is free once every *other* row has taken
   * its share, leaving one day spare — a month entirely of fixed activities has no
   * field work in it, and the endpoint refuses that run.
   */
  const rowCeiling = (key: number) => {
    const others = rows.reduce(
      (sum, row) => (row.key === key ? sum : sum + rowDays(row)),
      0,
    )
    return Math.max(1, daysInMonth - 1 - others)
  }

  /**
   * Rows that cannot be sent yet — the confirm button's blocker. A row is unfinished
   * with no activity chosen, and a dated row is unfinished with no date on it: it
   * would be a bucket of nothing.
   */
  const missingActivity = rows.filter((row) => !row.activityId).length
  const missingDates = rows.filter(
    (row) => row.activityId && row.mode === 'dates' && row.dates.length === 0,
  ).length
  const incomplete = missingActivity + missingDates

  const handleGenerate = () => {
    if (incomplete) return
    onGenerate({
      activityAllocations: rows.map((row) => ({
        activityId: row.activityId,
        daysCount: rowDays(row),
        // A count-only row stays dateless, which is what it means: the sales
        // incharge dates it himself.
        ...(row.mode === 'dates' ? { dates: row.dates } : {}),
      })),
      replaceExisting,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Capped at the viewport and laid out as a column, so a month with many
        // dated rows scrolls its middle rather than growing off the screen —
        // `Dialog` locks body scroll, so anything past the fold is unreachable.
        // `dvh`, not `vh`: on mobile `vh` counts the browser chrome as available
        // and puts the footer under it. `-2rem` is the overlay's own `p-4`.
        className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 p-6"
        // Withheld mid-run, exactly as Cancel is disabled: the dialog stays open
        // and spinning through a generate, and an X that abandoned it would leave
        // a run the admin can no longer see the outcome of.
        onClose={isPending ? undefined : () => onOpenChange(false)}
      >
        <DialogHeader className="shrink-0">
          {/* `pr-10` keeps a long month clear of the close button in the corner. */}
          <div className="flex items-center gap-3 pr-10">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Wand2 className="size-5" />
            </span>
            <DialogTitle>Generate {monthLabel} plans?</DialogTitle>
          </div>
          <DialogDescription>
            Each sales incharge gets a <strong>draft</strong> allocation: the fixed
            activity days below, plus his remaining days split across the cities his beats
            sit in. A draft is invisible to the sales incharge until you publish it.
          </DialogDescription>
        </DialogHeader>

        {/* The one part that scrolls. `min-h-0` is what lets it: a flex child
            defaults to `min-height: auto`, which refuses to shrink below its
            content and pushes the footer off the bottom instead. */}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-1 -mx-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Fixed activity days
              <span className="ml-2 font-normal text-muted-foreground">
                {rows.length
                  ? `${claimed} of ${daysInMonth} days — ${
                      daysInMonth - claimed
                    } left for the cities`
                  : 'optional'}
              </span>
            </p>
            <Hint
              label={
                allocatable.length === 0
                  ? 'No allocatable activity is available'
                  : allActivitiesUsed
                    ? 'Every activity already has a count'
                    : daysLeft === 0
                      ? `No day of ${monthLabel} is left for another activity — one has to stay free for field work`
                      : 'Add another activity'
              }
            >
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isPending || !canAddRow}
                  onClick={addRow}
                >
                  <Plus /> Add activity
                </Button>
              </span>
            </Hint>
          </div>

          {rows.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 py-8 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <CalendarDays className="size-5" />
              </span>
              <p className="max-w-xs text-sm text-muted-foreground">
                No fixed activities — the solver will give every date of the month to the
                cities. Set the weekly offs and the monthly meeting here and the
                allocation lands realistic.
              </p>
            </div>
          ) : (
            // No scroller of its own: the whole middle of the dialog scrolls now,
            // and a list that also capped itself would put a second scrollbar
            // inside the first.
            <div className="mt-3 space-y-2">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="space-y-2 rounded-xl border border-border/60 p-2"
                >
                  <div className="flex items-center gap-2">
                    {/* The activity takes the width; the size sits in a fixed-width
                        cluster, so the delete button stays on one vertical line
                        down the list whichever mode a row is in. */}
                    <ActivitySelect
                      activities={activityOptions(activities, taken, row.activityId)}
                      value={row.activityId}
                      onChange={(activityId) => patchRow(row.key, { activityId })}
                      disabled={isPending}
                      placeholder="Select activity"
                      className="min-w-0 flex-1"
                    />
                    <ModeToggle
                      value={row.mode}
                      disabled={isPending}
                      onChange={(mode) => patchRow(row.key, { mode })}
                    />
                    <div className="flex w-28 shrink-0 items-center gap-2">
                      {row.mode === 'days' ? (
                        <>
                          <DayCountInput
                            value={row.daysCount}
                            max={rowCeiling(row.key)}
                            disabled={isPending}
                            ariaLabel="How many days"
                            onChange={(daysCount) => patchRow(row.key, { daysCount })}
                          />
                          <span className="text-sm text-muted-foreground">
                            {row.daysCount === 1 ? 'day' : 'days'}
                          </span>
                        </>
                      ) : (
                        // The calendar lives in a portalled panel, so a dated row
                        // costs the same height as a counted one — the rows list
                        // scrolls, and an inline calendar was most of its window.
                        <Popover
                          align="end"
                          width={CALENDAR_WIDTH}
                          height={CALENDAR_HEIGHT}
                          disabled={isPending}
                          wrapClassName="w-full"
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full cursor-pointer"
                              disabled={isPending}
                            >
                              <CalendarDays /> Add date
                            </Button>
                          }
                        >
                          <MonthDayPicker
                            month={month}
                            value={row.dates}
                            // This row's own dates are its to deselect, so only
                            // the other rows' are out of reach.
                            taken={
                              new Set(
                                [...datesTaken].filter(
                                  (date) => !row.dates.includes(date),
                                ),
                              )
                            }
                            max={rowCeiling(row.key)}
                            disabled={isPending}
                            onChange={(dates) => patchRow(row.key, { dates })}
                          />
                        </Popover>
                      )}
                    </div>
                    <Hint label="Remove this activity">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => removeRow(row.key)}
                        aria-label="Remove this activity"
                        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </Hint>
                  </div>

                  {/* The dates themselves, whether or not the calendar is open —
                      a closed row still has to say what it holds, and each chip
                      drops its own date without reopening the calendar. */}
                  {row.mode === 'dates' && row.dates.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.dates.map((date) => (
                        <DateChip
                          key={date}
                          date={date}
                          disabled={isPending}
                          onRemove={() =>
                            patchRow(row.key, {
                              dates: row.dates.filter((d) => d !== date),
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : null}

                </div>
              ))}
            </div>
          )}

          {/* Both blockers, each named for what it actually is — "3 rows are
              incomplete" would not say which control to go and fix. */}
          {missingActivity > 0 ? (
            <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {missingActivity === 1
                ? 'One row still needs an activity.'
                : `${missingActivity} rows still need an activity.`}
            </p>
          ) : null}

          {missingDates > 0 ? (
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              {missingDates === 1
                ? 'One row is set to dates but has none picked.'
                : `${missingDates} rows are set to dates but have none picked.`}
            </p>
          ) : null}

          {allocatable.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No allocatable activity is available, so no day can be fixed — generating
              without any still works, and the solver gives the whole month to the cities.
            </p>
          ) : null}

          {/* The destructive option, last and unchecked: a plain run skips anyone
              who already has a month, which is the safe default. */}
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 px-3.5 py-3">
            <Checkbox
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 cursor-pointer"
              aria-label="Replace existing allocations"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Replace plans that already exist
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Off by default: a sales incharge who already has {monthLabel} is skipped.
                Turning this on rewrites his <strong>draft</strong> allocation. A plan
                that has left draft is skipped either way — regenerating it would throw
                away the schedule the sales incharge wrote.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter className="mt-6 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={isPending || incomplete > 0}
            onClick={handleGenerate}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Wand2 />} Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One picked date, with its own remove.
 *
 * The chips are what a **closed** dated row reads as, so they are the row's real
 * display of its dates and not a preview of the calendar. Dropping one from here
 * saves reopening the calendar to click the same date off.
 */
function DateChip({
  date,
  disabled,
  onRemove,
}: {
  date: string
  disabled?: boolean
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 py-1 pl-2 pr-1 text-xs font-medium text-primary">
      {shortDayLabel(date)}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Remove ${date}`}
        className="grid size-4 cursor-pointer place-items-center rounded transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

/**
 * "Days | Dates" — how one row states its size.
 *
 * A two-pill segment rather than a checkbox, because neither mode is the negative
 * of the other: a count and a set of dates are two ways of saying the same thing,
 * and the control should read that way.
 */
function ModeToggle({
  value,
  disabled,
  onChange,
}: {
  value: RowMode
  disabled?: boolean
  onChange: (mode: RowMode) => void
}) {
  const MODES: { mode: RowMode; label: string; hint: string }[] = [
    {
      mode: 'days',
      label: 'Days',
      hint: 'A count of days — the sales incharge picks which dates',
    },
    { mode: 'dates', label: 'Dates', hint: 'Pick the exact dates yourself' },
  ]
  return (
    <div
      role="group"
      aria-label="How this activity is sized"
      className="inline-flex shrink-0 rounded-lg border border-border/70 p-0.5"
    >
      {MODES.map((option) => {
        const active = option.mode === value
        return (
          <Hint key={option.mode} label={option.hint}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(option.mode)}
              className={cn(
                'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          </Hint>
        )
      })}
    </div>
  )
}

/**
 * The activities a run may allocate: **the ones that take no beats**, working or not.
 *
 * `is_admin_allocatable` is not on the activity master, and the one endpoint that
 * filters by it (`allocation-options`) is keyed on a sales incharge, which a whole-run generate
 * has none of. So the dialog narrows on `requires_beat: false`, which is the same
 * cut in practice: an activity that needs beats is field selling, and which day the
 * sales incharge sells is his to decide. Everything else is allocatable whether it is a working
 * day or not — a meeting day and a training day as much as a weekly off.
 *
 * The server stays the authority: a 400 naming a non-allocatable activity is shown
 * verbatim.
 */
function allocatableActivities(activities: ActivityDef[]): ActivityDef[] {
  return activities.filter((activity) => !activity.requiresBeat)
}

/** The allocatable master, minus the activities other rows hold. */
function activityOptions(
  activities: ActivityDef[],
  taken: Set<number>,
  own: number,
): ActivityDef[] {
  // Its own activity stays in the list (otherwise the trigger would read blank);
  // every other row's is gone.
  return allocatableActivities(activities).filter(
    (activity) => activity.id === own || !taken.has(activity.id),
  )
}
