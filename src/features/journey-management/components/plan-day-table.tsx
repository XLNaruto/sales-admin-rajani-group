import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Lock, Users } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { isWorkingDay, requiresBeat, solverReasonLabel } from '../lib/activities'
import { isLocked } from '../lib/plan-flags'
import { ActivitySelect } from './activity-select'
import { BeatPicker } from './beat-picker'
import type { ActivityDef, AllocatedBeat, PlanDay } from '../types'

/** DOM id for a day row, so an issue row can scroll to it. */
function dayRowId(day: number): string {
  return `plan-day-${day}`
}

/**
 * The month, one row per day — the screen's actual work surface.
 *
 * A hand-rolled table rather than the shared `<DataTable>`: a month is a fixed
 * 28–31 rows that must all be visible and editable at once, so pagination, sorting
 * and column visibility would all be wrong here.
 *
 * A locked day is history — the server refuses every edit to it with a 409 — so its
 * controls are disabled rather than left to fail.
 */
export function PlanDayTable({
  days,
  activities,
  beats,
  onActivityChange,
  onBeatAdd,
  onBeatRemove,
  isEdited,
  flaggedDates,
  /** Day of month to scroll to and highlight (set by clicking an issue). */
  focusedDay,
  /** The whole plan is read-only (approved or superseded). */
  readOnly = false,
  busy = false,
}: {
  days: PlanDay[]
  activities: ActivityDef[]
  beats: AllocatedBeat[]
  onActivityChange: (day: PlanDay, activityId: number) => void
  onBeatAdd: (day: PlanDay, beatId: string) => void
  onBeatRemove: (day: PlanDay, beatId: string) => void
  isEdited: (date: string) => boolean
  /** Dates the server flagged — tinted so they can't be missed. */
  flaggedDates: Set<string>
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

  const workingDays = days.filter((day) => isWorkingDay(activities, day)).length

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">The month</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {workingDays} working / {days.length} days
        </span>
      </div>

      {/* Full month, no height cap: the whole table scrolls with the page and the
          column header pins to the top of the viewport as it passes. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-216 border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            {/* border-collapse drops a sticky row's own border, so the header rule
                is an inset shadow instead. */}
            <tr className="bg-card text-left shadow-[inset_0_-1px_0_var(--border)]">
              <Th className="w-20">Date</Th>
              <Th className="w-56">Activity</Th>
              <Th>Beats</Th>
              <Th className="w-52">Why</Th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const locked = isLocked(day)
              const disabled = locked || readOnly
              const edited = isEdited(day.date)
              const flagged = flaggedDates.has(day.date)
              const working = isWorkingDay(activities, day)

              return (
                <tr
                  key={day.id}
                  id={dayRowId(day.day)}
                  className={cn(
                    'border-b border-border/40 align-middle transition-colors last:border-b-0 hover:bg-accent/40',
                    !working && 'bg-muted/30',
                    locked && 'text-muted-foreground',
                    flagged && 'bg-destructive/5',
                    focusedDay === day.day && 'ring-1 ring-inset ring-primary/40',
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {String(day.day).padStart(2, '0')}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(day.date), 'EEE')}
                    </span>
                    {/* Every row of a closed plan carries the lock, not just the days
                        that have already started: the whole month is history then. */}
                    {disabled ? (
                      <Hint
                        label={
                          locked
                            ? `${format(parseISO(day.date), 'd MMM')} has already started — this day is history`
                            : 'This plan is closed to changes'
                        }
                      >
                        <span className="ml-1.5 inline-grid size-4 cursor-default place-items-center align-middle text-muted-foreground">
                          <Lock className="size-3" />
                        </span>
                      </Hint>
                    ) : null}
                  </td>

                  <td className="px-4 py-2.5">
                    <ActivitySelect
                      activities={activities}
                      value={day.activityId}
                      disabled={disabled || busy}
                      onChange={(activityId) => onActivityChange(day, activityId)}
                    />
                    {day.jointWorkingInchargeName ? (
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="size-3" />
                        {day.jointWorkingInchargeName}
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-2.5">
                    {requiresBeat(activities, day) ? (
                      <BeatPicker
                        beats={beats}
                        selected={day.beats}
                        disabled={disabled}
                        busy={busy}
                        onAdd={(beatId) => onBeatAdd(day, beatId)}
                        onRemove={(beatId) => onBeatRemove(day, beatId)}
                      />
                    ) : (
                      <span className="text-muted-foreground">{day.reason ?? 'N/A'}</span>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'text-xs',
                        edited ? 'font-medium text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {edited ? 'Your edit' : solverReasonLabel(day.solverReason)}
                    </span>
                  </td>
                </tr>
              )
            })}

            {days.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  This plan has no days on it.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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
