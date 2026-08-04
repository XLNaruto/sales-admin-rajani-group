import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActivitySelect } from './activity-select'
import { dayLabel, monthDates } from '../lib/journey-format'
import type { ActivityDef, PinnedDay } from '../types'

/** A row in the editor — `key` keeps React identity as rows are added/removed. */
interface DayRow extends PinnedDay {
  key: number
}

/**
 * Journey Management → Allocations → "Generate month".
 *
 * The run builds each rep's **beat list** for the month — suggested from how long
 * each beat has gone untouched — plus the dates pinned for **every rep in the
 * run**. It does not build a calendar: the rep chooses what he does on each
 * unpinned date.
 *
 * Pinning the weekly offs here is the one thing that makes `capacity` accurate,
 * because nothing else knows which day a given rep is off. Per-rep pins go through
 * the allocation screen's Save instead.
 *
 * Two rules are enforced by construction rather than by a validator, because a
 * dropdown that can't offer a wrong answer beats an error message:
 *
 * - **Only this month.** The date options *are* the month's calendar days, so a
 *   date outside the period being generated is unreachable.
 * - **One row per date.** A date already pinned by another row is dropped from
 *   this row's options, so two rows can never claim the same day.
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
  /** Activity master — the second column's options. */
  activities: ActivityDef[]
  /** A run is in flight; the dialog stays open and the confirm button spins. */
  isPending?: boolean
  /** Called with the pins (possibly none) and whether to replace existing months. */
  onGenerate: (input: { pinnedDays: PinnedDay[]; replaceExisting: boolean }) => void
}) {
  const [rows, setRows] = useState<DayRow[]>([])
  const [replaceExisting, setReplaceExisting] = useState(false)
  // Row keys only need to be unique within one editing session, not stable
  // across them — a counter is enough and never collides after a reset.
  const nextKey = useRef(0)

  const dates = useMemo(() => monthDates(month), [month])

  // Reopening starts clean, and a month step while open would otherwise leave
  // rows holding dates from the month that is no longer being generated.
  useEffect(() => {
    setRows([])
    setReplaceExisting(false)
    nextKey.current = 0
  }, [open, month])

  const taken = useMemo(() => new Set(rows.map((row) => row.date).filter(Boolean)), [rows])

  /** The first calendar day nothing has claimed yet — `''` when the month is full. */
  const firstFreeDate = dates.find((date) => !taken.has(date)) ?? ''

  const addRow = () => {
    if (!firstFreeDate) return
    setRows((prev) => [
      ...prev,
      { key: nextKey.current++, date: firstFreeDate, activityId: 0 },
    ])
  }

  const removeRow = (key: number) => setRows((prev) => prev.filter((row) => row.key !== key))

  const patchRow = (key: number, patch: Partial<PinnedDay>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  /** Rows still missing a date or an activity — the confirm button's blocker. */
  const incomplete = rows.filter((row) => !row.date || !row.activityId).length

  const handleGenerate = () => {
    if (incomplete) return
    onGenerate({
      pinnedDays: rows.map(({ date, activityId }) => ({ date, activityId })),
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
          <DialogTitle>Generate allocations for {monthLabel}?</DialogTitle>
          <DialogDescription>
            Each sales incharge gets a beat list for the month, picked from the beats he
            holds. The rest of the month is his — he chooses what he does each morning.
            Pin the dates the office fixes for everyone below.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Pinned days
              <span className="ml-2 font-normal text-muted-foreground">
                {rows.length ? `${rows.length} pinned` : 'optional'}
              </span>
            </p>
            <Hint
              label={
                firstFreeDate
                  ? 'Pin another day'
                  : `Every day of ${monthLabel} is already pinned`
              }
            >
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isPending || !firstFreeDate}
                  onClick={addRow}
                >
                  <Plus /> Add day
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
                No pinned days — every date is the rep&rsquo;s to choose. Pin the weekly
                offs here and the capacity warning gets accurate.
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
                  {/* Both controls are the same `<Combobox>` at the same width,
                      so the pair reads as one field — the row's two halves must
                      not differ in size, border or focus ring. */}
                  <Combobox
                    value={row.date}
                    onChange={(date) => patchRow(row.key, { date })}
                    // Its own date stays in the list (otherwise the trigger would
                    // read blank); every other row's is gone.
                    options={dateOptions(dates, taken, row.date)}
                    icon={CalendarDays}
                    placeholder="Select date"
                    searchable
                    searchPlaceholder="Search date"
                    disabled={isPending}
                    aria-label="Pinned day date"
                    className="min-w-0 flex-1"
                  />
                  <ActivitySelect
                    activities={activities}
                    value={row.activityId}
                    onChange={(activityId) => patchRow(row.key, { activityId })}
                    disabled={isPending}
                    placeholder="Select activity"
                    className="min-w-0 flex-1"
                  />
                  <Hint label="Remove this day">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeRow(row.key)}
                      aria-label="Remove this day"
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
                ? 'One pinned day still needs an activity.'
                : `${incomplete} pinned days still need an activity.`}
            </p>
          ) : null}

          {activities.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              The activity master isn&rsquo;t available, so days can&rsquo;t be pinned —
              generating without them still works.
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
                Replace allocations that already exist
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Off by default: a rep who already has {monthLabel} is skipped. Turning this
                on rewrites his beat list and his untouched pins — days he has already
                taken, and days a visit has landed on, survive either way.
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

/** The month's dates, minus the ones other rows hold. */
function dateOptions(dates: string[], taken: Set<string>, own: string): ComboboxOption[] {
  return dates
    .filter((date) => date === own || !taken.has(date))
    .map((date) => ({ label: dayLabel(date), value: date }))
}
