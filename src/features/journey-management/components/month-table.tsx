import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Lock, Pin, Store, User, Users, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { DAY_LABEL_COLOR, DAY_LABEL_HINT, DAY_LABEL_TEXT } from '../lib/day-label'
import { todayISO } from '../lib/journey-format'
import { isLocked } from '../lib/plan-flags'
import { ActivitySelect } from './activity-select'
import type { ActivityDef, MonthStripDay, PlanDay } from '../types'

/** DOM id for a date's row, so a warning row can scroll to it. */
function dayRowId(day: number): string {
  return `plan-day-${day}`
}

/**
 * The month, one row per calendar date.
 *
 * Drawn from **`month_strip`**, never from `days`: `days` holds only the rows that
 * exist — the pinned dates plus whatever the rep has already chosen — so a fresh
 * month has almost none, and that is the correct state rather than a gap to fill.
 *
 * The admin's only lever here is **pinning**: fix what a date carries for this rep,
 * or clear the pin. He does not edit the rep's days. Two kinds of row are therefore
 * read-only, because a `pinned_days` replacement cannot move them however hard we
 * try: a **locked** date (a visit landed on it) and a date the **rep has already
 * taken over**.
 *
 * A hand-rolled table rather than the shared `<DataTable>`: a month is a fixed
 * 28–31 rows that must all be visible at once, so pagination and sorting would
 * both be wrong here.
 */
export function MonthTable({
  strip,
  days,
  activities,
  /** Draft pins by date — what Save will send as the full replacement. */
  pinned,
  onPin,
  onUnpin,
  /** Day of month to scroll to and highlight (set by clicking a warning). */
  focusedDay,
  readOnly = false,
  busy = false,
}: {
  strip: MonthStripDay[]
  days: PlanDay[]
  activities: ActivityDef[]
  pinned: Map<string, number>
  onPin: (date: string, activityId: number) => void
  onUnpin: (date: string) => void
  focusedDay: number | null
  readOnly?: boolean
  busy?: boolean
}) {
  useEffect(() => {
    if (focusedDay == null) return
    document
      .getElementById(dayRowId(focusedDay))
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusedDay])

  const dayByDate = new Map(days.map((day) => [day.date, day]))
  const absent = strip.filter((day) => day.label === 'absent').length
  const today = todayISO()

  return (
    // `overflow-clip`, not `overflow-hidden`: both clip the rounded corners, but
    // `hidden` establishes a scroll container, and the column header below sticks
    // to the page — it has to see the shell's scrollport, not this card's.
    <div className="overflow-clip rounded-xl border border-border/60 bg-card">
      {/* Read once per render, not per row: `todayISO` is a string compare, and a
          row-level call would let the date shift mid-table across midnight. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">The month</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {pinned.size} pinned / {strip.length} days
        </span>
        {/* The one count worth surfacing: past dates nobody accounted for. Future
            dates with nothing on them are normal and are not counted here. */}
        {absent > 0 ? (
          <Hint label="Dates that have passed with no entry at all — nobody said anything and nobody worked.">
            <span className="cursor-default rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning">
              {absent} unaccounted
            </span>
          </Hint>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          The rep chooses every unpinned date himself.
        </span>
      </div>

      {/* Full month, no height cap and — deliberately — no scroll wrapper: the
          whole table scrolls with the page and the column header pins as it
          passes. An `overflow-x-auto` here would become the header's scrollport
          (an `auto` on one axis makes the other one `auto` too) and park it a
          header's height down the table instead. Columns compress instead of
          scrolling sideways; the width hints below keep the shape. */}
      <table className="w-full border-collapse text-sm">
        {/* Parks under the page's sticky header rather than at the very top of
            the scrollport, where it would slide behind it and hide the column
            labels. The page measures its header and publishes the offset. */}
        <thead className="sticky z-10" style={{ top: 'var(--plan-header-h, 0px)' }}>
          {/* border-collapse drops a sticky row's own border, so the header rule
              is an inset shadow instead. */}
          <tr className="bg-card text-left shadow-[inset_0_-1px_0_var(--border)]">
            <Th className="w-20">Date</Th>
            <Th className="w-32">State</Th>
            <Th className="w-64">Pinned activity</Th>
            <Th>What happened</Th>
          </tr>
        </thead>
        <tbody>
          {strip.map((entry) => {
            const day = dayByDate.get(entry.date)
            // A date with no row is still history once it has passed: pinning it
            // would fix an activity onto a day nobody can work any more.
            const locked = day ? isLocked(day) : entry.date <= today
            // The rep owns this date: he chose it himself, and the server keeps
            // his row through any pinned-days replacement. Nothing to edit.
            const repOwned = day?.origin === 'rep'
            const editable = !readOnly && !locked && !repOwned
            const draftPin = pinned.get(entry.date)

            return (
              <tr
                key={entry.date}
                id={dayRowId(entry.day)}
                className={cn(
                  'border-b border-border/40 align-middle transition-colors last:border-b-0 hover:bg-accent/40',
                  entry.label === 'holiday' && 'bg-muted/30',
                  entry.label === 'absent' && 'bg-warning/5',
                  locked && 'text-muted-foreground',
                  focusedDay === entry.day && 'ring-1 ring-inset ring-primary/40',
                )}
              >
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {String(entry.day).padStart(2, '0')}
                  </span>{' '}
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(entry.date), 'EEE')}
                  </span>
                  {locked ? (
                    <Hint
                      label={`${format(
                        parseISO(entry.date),
                        'd MMM',
                      )} has passed — it is history now, so it can't be pinned`}
                    >
                      <span className="ml-1.5 inline-grid size-4 cursor-default place-items-center align-middle text-muted-foreground">
                        <Lock className="size-3" />
                      </span>
                    </Hint>
                  ) : null}
                </td>

                <td className="px-4 py-2.5">
                  <LabelChip day={entry} />
                </td>

                <td className="px-4 py-2.5">
                  {repOwned ? (
                    <Hint label="He chose this date himself. His choice survives a save, so it can't be pinned over.">
                      <span className="inline-flex cursor-default items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3" />
                        His own choice
                      </span>
                    </Hint>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <ActivitySelect
                        activities={activities}
                        value={draftPin ?? 0}
                        disabled={!editable || busy}
                        placeholder="Not pinned"
                        className="min-w-0 flex-1"
                        onChange={(activityId) => onPin(entry.date, activityId)}
                      />
                      {draftPin && editable ? (
                        <Hint label="Clear the pin — the rep decides this date">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onUnpin(entry.date)}
                            aria-label={`Clear the pin on ${entry.date}`}
                            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
                          >
                            <X className="size-4" />
                          </button>
                        </Hint>
                      ) : null}
                    </div>
                  )}
                </td>

                <td className="px-4 py-2.5">
                  <Actual day={day} beatCount={entry.beatCount} />
                </td>
              </tr>
            )
          })}

          {strip.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No calendar for this month.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

/** The server's derived label, as a chip. Each carries its own explanation. */
function LabelChip({ day }: { day: MonthStripDay }) {
  return (
    <Hint label={DAY_LABEL_HINT[day.label]}>
      <span className="inline-flex cursor-default items-center gap-1.5 text-xs font-medium text-foreground">
        <span
          aria-hidden
          style={{
            display: 'block',
            width: 4,
            height: 12,
            borderRadius: 1,
            backgroundColor: DAY_LABEL_COLOR[day.label],
          }}
        />
        {DAY_LABEL_TEXT[day.label]}
        {day.origin === 'pinned' ? (
          <Pin className="size-3 shrink-0 text-info" aria-label="Pinned" />
        ) : null}
      </span>
    </Hint>
  )
}

/**
 * What the rep actually did with the date — read-only throughout. The beats here
 * are his own picks, snapshotted with their outlets when he chose them.
 */
function Actual({ day, beatCount }: { day: PlanDay | undefined; beatCount: number }) {
  if (!day) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="min-w-0">
      <span className="block truncate text-sm text-foreground">{day.activityName}</span>
      {day.beats.length ? (
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {day.beats.map((beat) => (
            <Hint key={beat.id} label={`${beat.stopCount} outlets`}>
              <span className="inline-flex h-5 max-w-48 cursor-default items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 text-[11px] font-medium text-primary">
                <Store className="size-2.5 shrink-0" />
                <span className="truncate">{beat.beatName}</span>
              </span>
            </Hint>
          ))}
        </span>
      ) : beatCount === 0 && day.reason ? (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {day.reason}
        </span>
      ) : null}
      {day.jointWorkingInchargeName ? (
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="size-3" />
          {day.jointWorkingInchargeName}
        </span>
      ) : null}
    </div>
  )
}

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className={cn(
        // Tint sits on the cells, not the row: the sticky row needs an opaque
        // `bg-card` underneath or scrolled days show through it.
        'bg-muted/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}
