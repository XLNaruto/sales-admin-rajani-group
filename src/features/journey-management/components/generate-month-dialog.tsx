import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
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
import { ActivitySelect } from './activity-select'
import { DayCountInput } from './day-count-input'
import { monthDates } from '../lib/journey-format'
import type { ActivityDef, ActivityQuota } from '../types'

/** A row in the editor — `key` keeps React identity as rows are added/removed. */
interface QuotaRow extends ActivityQuota {
  key: number
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
 * A bucket is an activity and a **count of days**, never a date: "four weekly offs"
 * is a company fact, and which date it falls on is the sales incharge's to decide a month
 * later.
 *
 * Three rules are enforced by construction rather than by a validator, because a
 * control that can't take a wrong answer beats an error message:
 *
 * - **Beatless activities only.** See `allocatableActivities` — a whole-run generate
 *   has no sales incharge to fetch the real allocatable whitelist for, so it offers everything
 *   that does not require a beat and lets the server refuse the rest.
 * - **One row per activity.** An activity another row holds is dropped from this
 *   row's options, so two rows can never allocate the same activity.
 * - **Never the whole month.** Each count is clamped to leave at least one day for
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
  const claimed = rows.reduce((sum, row) => sum + row.daysCount, 0)
  const daysLeft = Math.max(0, daysInMonth - 1 - claimed)

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
    setRows((prev) => [...prev, { key: nextKey.current++, activityId: 0, daysCount: 1 }])
  }

  const removeRow = (key: number) =>
    setRows((prev) => prev.filter((row) => row.key !== key))

  const patchRow = (key: number, patch: Partial<ActivityQuota>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  /**
   * The most days one row may take: what is free once every *other* row has taken
   * its share, leaving one day spare — a month entirely of fixed activities has no
   * field work in it, and the endpoint refuses that run.
   */
  const rowCeiling = (key: number) => {
    const others = rows.reduce(
      (sum, row) => (row.key === key ? sum : sum + row.daysCount),
      0,
    )
    return Math.max(1, daysInMonth - 1 - others)
  }

  /** Rows still missing an activity — the confirm button's blocker. */
  const incomplete = rows.filter((row) => !row.activityId).length

  const handleGenerate = () => {
    if (incomplete) return
    onGenerate({
      activityAllocations: rows.map(({ activityId, daysCount }) => ({
        activityId,
        daysCount,
      })),
      replaceExisting,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-6">
        <DialogHeader>
          <span className="mb-3 grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <Wand2 className="size-5" />
          </span>
          <DialogTitle>Generate {monthLabel} plans?</DialogTitle>
          <DialogDescription>
            Each sales incharge gets a <strong>draft</strong> allocation: the fixed
            activity days below, plus his remaining days split across the cities his beats
            sit in. A draft is invisible to the sales incharge until you publish it.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Fixed activity days
              <span className="ml-2 font-normal text-muted-foreground">
                {rows.length
                  ? `${claimed} of ${daysInMonth} day${claimed === 1 ? '' : 's'} — ${
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
            // Padded because `overflow-y-auto` clips at the padding box: a row
            // flush against this scroller would have anything drawn outside its
            // border cut off. The negative margins keep the list optically flush
            // with the header above it.
            <div className="-mx-1 mt-3 max-h-72 space-y-2 overflow-y-auto px-1 py-1">
              {rows.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  {/* The activity takes the width; the count is a narrow fixed
                      field, because it never holds more than two digits. */}
                  <ActivitySelect
                    activities={activityOptions(activities, taken, row.activityId)}
                    value={row.activityId}
                    onChange={(activityId) => patchRow(row.key, { activityId })}
                    disabled={isPending}
                    placeholder="Select activity"
                    className="min-w-0 flex-1"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <DayCountInput
                      value={row.daysCount}
                      max={rowCeiling(row.key)}
                      disabled={isPending}
                      ariaLabel="How many days"
                      onChange={(daysCount) => patchRow(row.key, { daysCount })}
                    />
                    {/* Fixed width, so "day" and "days" both leave the delete
                        button on the same vertical line down the list. */}
                    <span className="w-8 text-sm text-muted-foreground">
                      {row.daysCount === 1 ? 'day' : 'days'}
                    </span>
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
              ))}
            </div>
          )}

          {incomplete > 0 ? (
            <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {incomplete === 1
                ? 'One row still needs an activity.'
                : `${incomplete} rows still need an activity.`}
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

        <DialogFooter className="mt-6">
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
