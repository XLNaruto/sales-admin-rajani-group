import { useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Lock, PencilLine, Store, TriangleAlert, User, Users, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { requiresBeat } from '../lib/activities'
import { DAY_LABEL_COLOR, DAY_LABEL_HINT, DAY_LABEL_TEXT } from '../lib/day-label'
import { isLocked } from '../lib/plan-flags'
import { unscheduledIsAProblem } from '../lib/plan-status'
import { ActivitySelect } from './activity-select'
import type {
  ActivityDef,
  MonthStripDay,
  PlanDay,
  PlanStatus,
} from '../types'

/** DOM id for a date's row, so a warning row can scroll to it. */
function dayRowId(day: number): string {
  return `plan-day-${day}`
}

/** One date of the draft calendar — what the correction pass will send. */
export interface ScheduleDraftDay {
  activityId: number
  cityId: string | null
  beatIds: string[]
}

/**
 * The month, one row per calendar date.
 *
 * Drawn from **`month_strip`**, never from `days`: `days` is **empty on a draft and
 * on a freshly published plan**, so a month with no rows is the correct state
 * rather than a gap to fill.
 *
 * Whose table this is depends entirely on the plan's status, and the header says so:
 *
 * - `draft` — nobody's. Nothing is dated yet; the allocation above is the screen.
 * - `published` — **the sales incharge's**. He is dating the month, and the correction pass is
 *   refused with a 409, so every row is read-only.
 * - `submitted` / `approved` — **the admin's**, because the sales incharge is read-only from
 *   submission onward, permanently, and a live month still has to be fixable.
 *   Correcting an approved plan does *not* reopen the cycle.
 *
 * Within an editable month, a **locked** date (a visit landed on it) is still
 * read-only: the server skips it whatever is sent, so offering a control would
 * promise a change that gets dropped.
 *
 * A hand-rolled table rather than the shared `<DataTable>`: a month is a fixed
 * 28–31 rows that must all be visible at once, so pagination and sorting would
 * both be wrong here.
 */
export function ScheduleTable({
  strip,
  days,
  status,
  activities,
  /** Cities the plan allocates — the only ones a date may be moved to. */
  cityOptions,
  /** The draft calendar by date; absent means the date carries no row. */
  draft,
  /** Beat id → name, for beats added in this edit and not yet on a saved day. */
  beatNames,
  onSetActivity,
  onSetCity,
  onClearDay,
  onEditBeats,
  /** Day of month to scroll to and highlight (set by clicking a warning). */
  focusedDay,
  /** `false` when the status or the permission forbids the correction pass. */
  editable = false,
  busy = false,
}: {
  strip: MonthStripDay[]
  days: PlanDay[]
  status: PlanStatus
  activities: ActivityDef[]
  cityOptions: ComboboxOption[]
  draft: Map<string, ScheduleDraftDay>
  beatNames: Map<string, string>
  onSetActivity: (date: string, activityId: number) => void
  onSetCity: (date: string, cityId: string | null) => void
  onClearDay: (date: string) => void
  onEditBeats: (date: string) => void
  focusedDay: number | null
  editable?: boolean
  busy?: boolean
}) {
  useEffect(() => {
    if (focusedDay == null) return
    document
      .getElementById(dayRowId(focusedDay))
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusedDay])

  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days])
  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  )
  const cityNameById = useMemo(
    () => new Map(cityOptions.map((option) => [option.value, option.label])),
    [cityOptions],
  )

  /**
   * `unscheduled` only means something is missing once the month has been handed
   * back. On a draft it is every date by definition, and on a freshly published
   * month it is the sales incharge's job in progress.
   */
  const blanksMatter = unscheduledIsAProblem(status)
  const unscheduled = strip.filter((day) => day.label === 'unscheduled').length
  const missed = strip.filter((day) => day.label === 'missed').length

  return (
    // `overflow-clip`, not `overflow-hidden`: both clip the rounded corners, but
    // `hidden` establishes a scroll container, and the column header below sticks
    // to the page — it has to see the shell's scrollport, not this card's.
    <div className="overflow-clip rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">The month</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {strip.length - unscheduled} / {strip.length} dated
        </span>
        {blanksMatter && unscheduled > 0 ? (
          <Hint label="Dates with no row at all. From submission onward the month is meant to be fully dated, so these are gaps.">
            <span className="cursor-default rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive">
              {unscheduled} blank
            </span>
          </Hint>
        ) : null}
        {/* Scheduled, past, never worked — the only figure that is a fault in every
            status, and the one `missed` exists to separate from a holiday. */}
        {missed > 0 ? (
          <Hint label="Scheduled dates that have passed with nothing recorded against them.">
            <span className="cursor-default rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning">
              {missed} missed
            </span>
          </Hint>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {status === 'draft'
            ? 'Nothing is dated yet — publish the month and the sales incharge dates it.'
            : status === 'published'
              ? 'The sales incharge is dating this month. You cannot correct it until he submits.'
              : editable
                ? 'You are correcting his calendar — every change lands as an admin edit.'
                : 'Read-only.'}
        </span>
      </div>

      {/* Full month, no height cap and — deliberately — no scroll wrapper: the
          whole table scrolls with the page and the column header pins as it
          passes. An `overflow-x-auto` here would become the header's scrollport
          (an `auto` on one axis makes the other one `auto` too) and park it a
          header's height down the table instead. */}
      <table className="w-full border-collapse text-sm">
        {/* Parks under the page's sticky header rather than at the very top of
            the scrollport, where it would slide behind it and hide the column
            labels. The page measures its header and publishes the offset. */}
        <thead className="sticky z-10" style={{ top: 'var(--plan-header-h, 0px)' }}>
          {/* border-collapse drops a sticky row's own border, so the header rule
              is an inset shadow instead. */}
          <tr className="bg-card text-left shadow-[inset_0_-1px_0_var(--border)]">
            <Th className="w-20">Date</Th>
            <Th className="w-36">State</Th>
            <Th className="w-56">Activity</Th>
            <Th className="w-44">City</Th>
            <Th>Beats</Th>
            <Th className="w-px" />
          </tr>
        </thead>
        <tbody>
          {strip.map((entry) => {
            const day = dayByDate.get(entry.date)
            const row = draft.get(entry.date)
            // A locked date survives the correction pass whatever is sent, so it is
            // read-only even in an editable month.
            const locked = day ? isLocked(day) : false
            const canEdit = editable && !locked && !busy

            const activity = row ? activityById.get(row.activityId) : undefined
            /**
             * Does this date take a city and beats?
             *
             * The master's `requires_beat` is the answer, but it may still be in
             * flight — so it falls back through the day's own activity code
             * (`requiresBeat` knows the seeded beatless codes) and finally to
             * `true`. Defaulting to `true` is the safer error: it shows the pickers
             * on a day that may not need them, rather than hiding the beats of a day
             * that does and quietly reading as "not applicable".
             */
            const takesBeats = activity
              ? activity.requiresBeat
              : row && day
                ? requiresBeat(activities, day)
                : Boolean(row)

            return (
              <tr
                key={entry.date}
                id={dayRowId(entry.day)}
                className={cn(
                  'border-b border-border/40 align-top transition-colors last:border-b-0 hover:bg-accent/40',
                  entry.label === 'holiday' && 'bg-muted/30',
                  entry.label === 'missed' && 'bg-warning/5',
                  blanksMatter && entry.label === 'unscheduled' && 'bg-destructive/5',
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
                    <Hint label="A visit has landed on this date, so it is history — the correction pass skips it whatever is sent.">
                      <span className="ml-1.5 inline-grid size-4 cursor-default place-items-center align-middle text-muted-foreground">
                        <Lock className="size-3" />
                      </span>
                    </Hint>
                  ) : null}
                </td>

                <td className="whitespace-nowrap px-4 py-2.5">
                  <LabelChip day={entry} />
                </td>

                <td className="px-4 py-2">
                  {canEdit ? (
                    <ActivitySelect
                      activities={activities}
                      value={row?.activityId ?? 0}
                      placeholder="Not scheduled"
                      className="w-full min-w-0"
                      onChange={(activityId) => onSetActivity(entry.date, activityId)}
                    />
                  ) : (
                    <span className="block truncate py-1.5 text-sm text-foreground">
                      {day?.activityName ?? '—'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {/* An activity without `requires_beat` must carry NEITHER a city
                      nor a beat — the server refuses the pairing — so the controls
                      are absent rather than disabled. */}
                  {!row ? (
                    <span className="block py-1.5 text-xs text-muted-foreground">—</span>
                  ) : !takesBeats ? (
                    <Hint label="This activity takes no beats, so it carries no city either.">
                      <span className="block cursor-default py-1.5 text-xs text-muted-foreground">
                        not applicable
                      </span>
                    </Hint>
                  ) : canEdit ? (
                    <Combobox
                      value={row.cityId ?? ''}
                      onChange={(cityId) => onSetCity(entry.date, cityId || null)}
                      options={cityOptions}
                      placeholder="Pick a city"
                      searchable={cityOptions.length > 8}
                      className="w-full min-w-0"
                    />
                  ) : (
                    <span className="block truncate py-1.5 text-sm text-foreground">
                      {day?.cityName ?? cityNameById.get(row.cityId ?? '') ?? '—'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  <BeatCell
                    day={day}
                    row={row}
                    beatNames={beatNames}
                    takesBeats={takesBeats}
                    canEdit={canEdit}
                    onEdit={() => onEditBeats(entry.date)}
                  />
                </td>

                <td className="px-4 py-2">
                  {canEdit && row ? (
                    <Hint label="Clear this date — it will be sent as having no row at all.">
                      <button
                        type="button"
                        onClick={() => onClearDay(entry.date)}
                        aria-label={`Clear ${entry.date}`}
                        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
                      >
                        <X className="size-4" />
                      </button>
                    </Hint>
                  ) : null}
                </td>
              </tr>
            )
          })}

          {strip.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
        {/* Where the approved calendar differs from the one the sales incharge handed over. */}
        {day.origin === 'admin' ? (
          <Hint label="Corrected by an admin after the sales incharge submitted the month.">
            <PencilLine className="size-3 shrink-0 text-info" aria-label="Corrected" />
          </Hint>
        ) : day.origin === 'rep' ? (
          <Hint label="The sales incharge's own row.">
            <User className="size-3 shrink-0 text-muted-foreground" aria-label="Sales incharge" />
          </Hint>
        ) : null}
      </span>
    </Hint>
  )
}

/**
 * The day's beats — the chips plus, where the date is editable, the way into the
 * beat dialog.
 *
 * A working day with a city and **no beats at all** is a day the server will refuse
 * on save (an activity with `requires_beat` needs at least one), so it is called out
 * here rather than at the far end of a failed request.
 */
function BeatCell({
  day,
  row,
  beatNames,
  takesBeats,
  canEdit,
  onEdit,
}: {
  day: PlanDay | undefined
  row: ScheduleDraftDay | undefined
  /** The beat master, for chips the saved day cannot name. */
  beatNames: Map<string, string>
  takesBeats: boolean
  canEdit: boolean
  onEdit: () => void
}) {
  if (!row) {
    return <span className="block py-1.5 text-xs text-muted-foreground">—</span>
  }

  if (!takesBeats) {
    return (
      <div className="min-w-0 py-1.5">
        {/* The note is the only thing a beatless day carries: a holiday's name, a
            leave reason, a meeting's venue. */}
        {day?.reason ? (
          <span className="block truncate text-xs text-muted-foreground">{day.reason}</span>
        ) : (
          <span className="text-xs text-muted-foreground">no beats</span>
        )}
        {day?.jointWorkingInchargeName ? (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="size-3" />
            {day.jointWorkingInchargeName}
          </span>
        ) : null}
      </div>
    )
  }

  /** Names for the saved beats, so a chip reads as more than an id. */
  const nameById = new Map((day?.beats ?? []).map((beat) => [beat.beatId, beat]))
  const empty = row.beatIds.length === 0

  return (
    <div className="min-w-0 py-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {row.beatIds.map((beatId, index) => {
          const saved = nameById.get(beatId)
          return (
            <Hint
              key={beatId}
              label={
                saved
                  ? `${index + 1}. ${saved.beatName} — ${saved.stopCount} outlets${
                      saved.locked ? ' (worked)' : ''
                    }`
                  : `${index + 1}. ${beatNames.get(beatId) ?? 'Beat'} — added in this edit`
              }
            >
              <span className="inline-flex h-5 max-w-48 cursor-default items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 text-[11px] font-medium text-primary">
                <Store className="size-2.5 shrink-0" />
                <span className="truncate">
                {saved?.beatName ?? beatNames.get(beatId) ?? `Beat ${beatId}`}
              </span>
              </span>
            </Hint>
          )
        })}

        {empty ? (
          <Hint label="An activity that takes beats needs at least one — the save will be refused without it.">
            <span className="inline-flex cursor-default items-center gap-1 text-[11px] font-medium text-warning">
              <TriangleAlert className="size-3" />
              needs a beat
            </span>
          </Hint>
        ) : null}

        {canEdit ? (
          <Hint label={row.cityId ? 'Choose the beats and their order' : 'Pick a city first'}>
            <button
              type="button"
              onClick={onEdit}
              disabled={!row.cityId}
              className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PencilLine className="size-2.5" />
              {empty ? 'add' : 'edit'}
            </button>
          </Hint>
        ) : null}
      </div>

      {day?.jointWorkingInchargeName ? (
        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="size-3" />
          {day.jointWorkingInchargeName}
        </span>
      ) : null}
    </div>
  )
}

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
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
