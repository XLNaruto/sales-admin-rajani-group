import { useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Lock, PencilLine, Store, TriangleAlert, User, Users, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { takesCity } from '../lib/activities'
import { DAY_LABEL_COLOR, DAY_LABEL_HINT, DAY_LABEL_TEXT } from '../lib/day-label'
import { isLocked } from '../lib/plan-flags'
import { unscheduledIsAProblem } from '../lib/plan-status'
import { ActivitySelect } from './activity-select'
import type { CitySelect } from './allocation-editor'
import type {
  ActivityDef,
  MonthStripDay,
  PlanDay,
  PlanDayEntry,
  PlanStatus,
} from '../types'

/** DOM id for a date's first row, so a warning row can scroll to it. */
function dayRowId(day: number): string {
  return `plan-day-${day}`
}

/**
 * ONE piece of work on a date, as the draft carries it.
 *
 * Only entries the admin has actually answered live in the draft — the trailing
 * blank picker each editable date shows is `EMPTY_ENTRY`, a render-only constant,
 * so an untouched date never counts as an unsaved edit.
 */
export interface ScheduleDraftEntry {
  activityId: number
  /** Required once the activity takes beats; null on a beatless one. */
  distributorId: string | null
  /** Only meaningful on a beatless entry — derived from the beats otherwise. */
  cityId: string | null
  beatIds: string[]
}

/** One date of the draft calendar — everything on it, in intended order. */
export interface ScheduleDraftDay {
  entries: ScheduleDraftEntry[]
}

/** A blank picker row, so a date with nothing on it still offers one. */
const EMPTY_ENTRY: ScheduleDraftEntry = {
  activityId: 0,
  distributorId: null,
  cityId: null,
  beatIds: [],
}

/**
 * The month, one row per **piece of work** — so a date carrying two activities is
 * two rows, with its date and state cells spanning them.
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
 * promise a change that gets dropped. Locking is a property of the DATE, not of an
 * entry — every piece of work on a locked date is history together.
 *
 * A hand-rolled table rather than the shared `<DataTable>`: a month is a fixed
 * 28–31 dates that must all be visible at once, so pagination and sorting would
 * both be wrong here.
 */
export function ScheduleTable({
  strip,
  days,
  status,
  activities,
  /** Distributors the plan allocates — what a field entry is normally assigned to. */
  distributorOptions,
  /** The city master — offered on a distributor-search entry and nowhere else. */
  city,
  /** The draft calendar by date; absent means the date carries no work. */
  draft,
  /** Beat id → name, for beats added in this edit and not yet on a saved entry. */
  beatNames,
  /** Distributor id → name, for read-only rows. */
  distributorNames,
  onSetActivity,
  onSetDistributor,
  onSetCity,
  onRemoveEntry,
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
  distributorOptions: ComboboxOption[]
  city: CitySelect
  draft: Map<string, ScheduleDraftDay>
  beatNames: Map<string, string>
  distributorNames: Map<string, string>
  onSetActivity: (date: string, index: number, activityId: number) => void
  onSetDistributor: (date: string, index: number, distributorId: string | null) => void
  onSetCity: (date: string, index: number, cityId: string | null) => void
  onRemoveEntry: (date: string, index: number) => void
  onClearDay: (date: string) => void
  onEditBeats: (target: { date: string; index: number }) => void
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

  /**
   * `unscheduled` only means something is missing once the month has been handed
   * back. On a draft it is every date by definition, and on a freshly published
   * month it is the sales incharge's job in progress.
   */
  const blanksMatter = unscheduledIsAProblem(status)
  const unscheduled = strip.filter((day) => day.label === 'unscheduled').length
  const missed = strip.filter((day) => day.label === 'missed').length
  /** Pieces of work across the month — the figure the buckets reconcile with. */
  const entryCount = [...draft.values()].reduce(
    (total, day) => total + day.entries.filter((entry) => entry.activityId > 0).length,
    0,
  )

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
        {/* Distinct from the date count, and it has to be: a date carrying two
            activities spends two allocated days, so this is the number the
            allocation above is measured against. */}
        {entryCount > 0 ? (
          <Hint label="Pieces of work across the month. A date carrying two activities counts twice — each spends a day from its own bucket.">
            <span className="cursor-default rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
              {entryCount} {entryCount === 1 ? 'activity' : 'activities'}
            </span>
          </Hint>
        ) : null}
        {blanksMatter && unscheduled > 0 ? (
          <Hint label="Dates with nothing on them at all. Worth a look once the month has been handed back — but a month with a few is still publishable and still approvable.">
            <span className="cursor-default rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning">
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
            <Th className="w-48">Distributor / City</Th>
            <Th>Beats</Th>
            <Th className="w-px" />
          </tr>
        </thead>
        <tbody>
          {strip.map((stripDay) => (
            <DayRows
              key={stripDay.date}
              stripDay={stripDay}
              day={dayByDate.get(stripDay.date)}
              draftDay={draft.get(stripDay.date)}
              activities={activities}
              activityById={activityById}
              distributorOptions={distributorOptions}
              city={city}
              beatNames={beatNames}
              distributorNames={distributorNames}
              blanksMatter={blanksMatter}
              focused={focusedDay === stripDay.day}
              editable={editable}
              busy={busy}
              onSetActivity={onSetActivity}
              onSetDistributor={onSetDistributor}
              onSetCity={onSetCity}
              onRemoveEntry={onRemoveEntry}
              onClearDay={onClearDay}
              onEditBeats={onEditBeats}
            />
          ))}

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

/**
 * One calendar date — as many rows as it carries pieces of work, with the date and
 * state cells spanning them.
 *
 * An editable, unlocked date always shows **one row more** than it has work: the
 * trailing blank picker. That is what makes "add a second activity to the 12th" a
 * single click rather than a mode, and it is why a date with nothing on it looks
 * exactly like one that has been emptied.
 */
function DayRows({
  stripDay,
  day,
  draftDay,
  activities,
  activityById,
  distributorOptions,
  city,
  beatNames,
  distributorNames,
  blanksMatter,
  focused,
  editable,
  busy,
  onSetActivity,
  onSetDistributor,
  onSetCity,
  onRemoveEntry,
  onClearDay,
  onEditBeats,
}: {
  stripDay: MonthStripDay
  day: PlanDay | undefined
  draftDay: ScheduleDraftDay | undefined
  activities: ActivityDef[]
  activityById: Map<number, ActivityDef>
  distributorOptions: ComboboxOption[]
  city: CitySelect
  beatNames: Map<string, string>
  distributorNames: Map<string, string>
  blanksMatter: boolean
  focused: boolean
  editable: boolean
  busy: boolean
  onSetActivity: (date: string, index: number, activityId: number) => void
  onSetDistributor: (date: string, index: number, distributorId: string | null) => void
  onSetCity: (date: string, index: number, cityId: string | null) => void
  onRemoveEntry: (date: string, index: number) => void
  onClearDay: (date: string) => void
  onEditBeats: (target: { date: string; index: number }) => void
}) {
  // A locked date survives the correction pass whatever is sent, so it is
  // read-only even in an editable month — and it locks every entry on it,
  // because the lock belongs to the date.
  const locked = day ? isLocked(day) : false
  const canEdit = editable && !locked && !busy

  const entries = draftDay?.entries ?? []
  // The trailing blank picker. Absent on a read-only date, where it would be a
  // control that does nothing.
  const rows = canEdit ? [...entries, EMPTY_ENTRY] : entries

  /**
   * The saved entry behind a draft row — matched on (activity, distributor), NOT
   * on position.
   *
   * Position drifts the moment anything is removed or reordered: delete the first
   * of two entries and row 0 is now what was saved as row 1, so an index lookup
   * would hand it the wrong city, note and beat names. The pair is unique within
   * a date by the server's own rule — the same activity may repeat only for two
   * different distributors — so it identifies the row for as long as the row is
   * still the same piece of work.
   */
  const savedByKey = new Map(
    (day?.activities ?? []).map((saved) => [
      `${saved.activityId}|${saved.distributorId ?? ''}`,
      saved,
    ]),
  )

  const rowClass = cn(
    'border-b border-border/40 align-top transition-colors hover:bg-accent/40',
    stripDay.label === 'holiday' && 'bg-muted/30',
    stripDay.label === 'missed' && 'bg-warning/5',
    blanksMatter && stripDay.label === 'unscheduled' && 'bg-destructive/5',
    locked && 'text-muted-foreground',
    focused && 'ring-1 ring-inset ring-primary/40',
  )

  if (rows.length === 0) {
    return (
      <tr id={dayRowId(stripDay.day)} className={rowClass}>
        <DateCell day={stripDay} locked={locked} />
        <td className="whitespace-nowrap px-4 py-2.5">
          <LabelChip day={stripDay} />
        </td>
        <td className="px-4 py-2.5 text-sm text-muted-foreground" colSpan={4}>
          —
        </td>
      </tr>
    )
  }

  return (
    <>
      {rows.map((entry, index) => {
        const first = index === 0
        const last = index === rows.length - 1
        // The trailing blank picker is not an entry the plan holds.
        const isPlaceholder = entry.activityId === 0
        const saved = isPlaceholder
          ? undefined
          : savedByKey.get(`${entry.activityId}|${entry.distributorId ?? ''}`)
        const activity = activityById.get(entry.activityId)
        /**
         * Does this entry take a distributor and beats?
         *
         * The master's `requires_beat` is the answer, but it may still be in
         * flight — so it falls back to whether the entry already carries a
         * distributor. Defaulting to "yes" for an unknown activity is the safer
         * error: it shows the pickers on work that may not need them, rather than
         * hiding the beats of work that does.
         */
        const takesBeats = activity
          ? activity.requiresBeat
          : isPlaceholder
            ? false
            : entry.distributorId !== null || Boolean(saved?.distributorId)

        return (
          <tr
            key={index}
            id={first ? dayRowId(stripDay.day) : undefined}
            className={cn(rowClass, !last && 'border-b-transparent')}
          >
            {first ? (
              <>
                <DateCell day={stripDay} locked={locked} rowSpan={rows.length} />
                <td rowSpan={rows.length} className="whitespace-nowrap px-4 py-2.5">
                  <LabelChip day={stripDay} />
                </td>
              </>
            ) : null}

            <td className="px-4 py-2">
              {canEdit ? (
                <ActivitySelect
                  activities={activities}
                  value={entry.activityId}
                  placeholder={
                    isPlaceholder && entries.length > 0 ? 'Add activity' : 'Not scheduled'
                  }
                  className="w-full min-w-0"
                  onChange={(activityId) => onSetActivity(stripDay.date, index, activityId)}
                />
              ) : (
                <span className="block truncate py-1.5 text-sm text-foreground">
                  {saved?.activityName ?? '—'}
                </span>
              )}
            </td>

            <td className="px-4 py-2">
              <WhereCell
                date={stripDay.date}
                index={index}
                entry={entry}
                saved={saved}
                takesBeats={takesBeats}
                // Only a distributor search names a city; every other beatless
                // activity has no use for one. Falls back to the saved entry's
                // own code while the master is still loading.
                takesCity={takesCity(activity?.code ?? saved?.activityCode)}
                isPlaceholder={isPlaceholder}
                canEdit={canEdit}
                distributorOptions={distributorOptions}
                city={city}
                distributorNames={distributorNames}
                onSetDistributor={onSetDistributor}
                onSetCity={onSetCity}
              />
            </td>

            <td className="px-4 py-2">
              <BeatCell
                entry={isPlaceholder ? undefined : entry}
                saved={saved}
                beatNames={beatNames}
                takesBeats={takesBeats}
                canEdit={canEdit}
                onEdit={() => onEditBeats({ date: stripDay.date, index })}
              />
            </td>

            <td className="whitespace-nowrap px-4 py-2">
              {canEdit && !isPlaceholder ? (
                <Hint label="Remove this piece of work from the date.">
                  <button
                    type="button"
                    onClick={() => onRemoveEntry(stripDay.date, index)}
                    aria-label={`Remove activity ${index + 1} on ${stripDay.date}`}
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
                  >
                    <X className="size-4" />
                  </button>
                </Hint>
              ) : canEdit && isPlaceholder && entries.length > 0 ? (
                <Hint label="Clear this date — everything on it will be sent as gone.">
                  <button
                    type="button"
                    onClick={() => onClearDay(stripDay.date)}
                    aria-label={`Clear ${stripDay.date}`}
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
    </>
  )
}

/** The date itself, plus the lock marker when a visit has landed on it. */
function DateCell({
  day,
  locked,
  rowSpan,
}: {
  day: MonthStripDay
  locked: boolean
  rowSpan?: number
}) {
  return (
    <td rowSpan={rowSpan} className="whitespace-nowrap px-4 py-2.5">
      <span className="font-mono font-semibold tabular-nums text-foreground">
        {String(day.day).padStart(2, '0')}
      </span>{' '}
      <span className="text-xs text-muted-foreground">
        {format(parseISO(day.date), 'EEE')}
      </span>
      {locked ? (
        <Hint label="A visit has landed on this date, so it is history — the correction pass skips it whatever is sent.">
          <span className="ml-1.5 inline-grid size-4 cursor-default place-items-center align-middle text-muted-foreground">
            <Lock className="size-3" />
          </span>
        </Hint>
      ) : null}
    </td>
  )
}

/**
 * The server's derived label, as a chip. Each carries its own explanation.
 *
 * The label belongs to the DATE, not to a piece of work on it: a date carrying a
 * leave and a meeting is one square, badged by the working half.
 */
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
 * WHERE the work happens — three different answers, decided by the activity:
 *
 * - **A field entry names a DISTRIBUTOR.** That is the bucket it spends, and it is
 *   what the beat picker is filtered by. Its city is DERIVED from the beats
 *   server-side, so it is shown and never offered as a control: a city picker here
 *   would let the admin contradict the beats he just chose.
 * - **A distributor search names a CITY**, from the whole master — the search is
 *   for somewhere he has nobody yet, so his existing cities are the wrong list.
 * - **Everything else names nothing.** A weekly off or a meeting has no place to
 *   be, and an optional field nothing acts on is worse than no field.
 */
function WhereCell({
  date,
  index,
  entry,
  saved,
  takesBeats,
  takesCity: showCity,
  isPlaceholder,
  canEdit,
  distributorOptions,
  city,
  distributorNames,
  onSetDistributor,
  onSetCity,
}: {
  date: string
  index: number
  entry: ScheduleDraftEntry
  saved: PlanDayEntry | undefined
  takesBeats: boolean
  takesCity: boolean
  isPlaceholder: boolean
  canEdit: boolean
  distributorOptions: ComboboxOption[]
  city: CitySelect
  distributorNames: Map<string, string>
  onSetDistributor: (date: string, index: number, distributorId: string | null) => void
  onSetCity: (date: string, index: number, cityId: string | null) => void
}) {
  if (isPlaceholder) {
    return <span className="block py-1.5 text-xs text-muted-foreground">—</span>
  }

  if (takesBeats) {
    const name =
      saved?.distributorName ??
      (entry.distributorId ? distributorNames.get(entry.distributorId) : null)

    return (
      <div className="min-w-0 py-0.5">
        {canEdit ? (
          <Combobox
            value={entry.distributorId ?? ''}
            onChange={(distributorId) =>
              onSetDistributor(date, index, distributorId || null)
            }
            options={distributorOptions}
            placeholder="Pick a distributor"
            searchable={distributorOptions.length > 8}
            className="w-full min-w-0"
          />
        ) : (
          <span className="block truncate py-1.5 text-sm text-foreground">
            {name ?? '—'}
          </span>
        )}
        {/* Derived from the beats, so it is a read-out rather than a choice. */}
        {saved?.cityName ? (
          <Hint label="Derived from the beats on this entry — a beat's city comes from its primary distributor.">
            <span className="mt-0.5 block cursor-default truncate text-[11px] text-muted-foreground">
              {saved.cityName}
            </span>
          </Hint>
        ) : null}
        {!entry.distributorId && canEdit ? (
          <Hint label="Work that takes beats must say whose days it spends — the save is refused without it.">
            <span className="mt-0.5 inline-flex cursor-default items-center gap-1 text-[11px] font-medium text-warning">
              <TriangleAlert className="size-3" />
              needs a distributor
            </span>
          </Hint>
        ) : null}
      </div>
    )
  }

  if (!showCity) {
    return (
      <Hint label="This activity happens wherever he is — it names no distributor and no city.">
        <span className="block cursor-default py-1.5 text-xs text-muted-foreground">
          not applicable
        </span>
      </Hint>
    )
  }

  return (
    <div className="min-w-0 py-0.5">
      {canEdit ? (
        <Combobox
          value={entry.cityId ?? ''}
          onChange={(cityId) => onSetCity(date, index, cityId || null)}
          options={city.options}
          loading={city.loading}
          onScrollEnd={city.onScrollEnd}
          onSearchChange={city.onSearchChange}
          searchable
          placeholder="Anywhere"
          searchPlaceholder="Search cities…"
          className="w-full min-w-0"
        />
      ) : (
        <span className="block truncate py-1.5 text-sm text-muted-foreground">
          {saved?.cityName ?? 'Anywhere'}
        </span>
      )}
    </div>
  )
}

/**
 * The entry's beats — the chips plus, where it is editable, the way into the beat
 * dialog.
 *
 * A field entry with a distributor and **no beats at all** is one the server will
 * refuse on save (an activity with `requires_beat` needs at least one), so it is
 * called out here rather than at the far end of a failed request.
 */
function BeatCell({
  entry,
  saved,
  beatNames,
  takesBeats,
  canEdit,
  onEdit,
}: {
  entry: ScheduleDraftEntry | undefined
  saved: PlanDayEntry | undefined
  /** The beat master, for chips the saved entry cannot name. */
  beatNames: Map<string, string>
  takesBeats: boolean
  canEdit: boolean
  onEdit: () => void
}) {
  if (!entry) {
    return <span className="block py-1.5 text-xs text-muted-foreground">—</span>
  }

  if (!takesBeats) {
    return (
      <div className="min-w-0 py-1.5">
        {/* The note is the only thing beatless work carries: a holiday's name, a
            leave reason, a meeting's venue. */}
        {saved?.reason ? (
          <span className="block truncate text-xs text-muted-foreground">
            {saved.reason}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">no beats</span>
        )}
        {saved?.jointWorkingInchargeName ? (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="size-3" />
            {saved.jointWorkingInchargeName}
          </span>
        ) : null}
      </div>
    )
  }

  /** Names for the saved beats, so a chip reads as more than an id. */
  const savedById = new Map((saved?.beats ?? []).map((beat) => [beat.beatId, beat]))
  const empty = entry.beatIds.length === 0

  return (
    <div className="min-w-0 py-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {entry.beatIds.map((beatId, index) => {
          const beat = savedById.get(beatId)
          return (
            <Hint
              key={beatId}
              label={
                beat
                  ? `${index + 1}. ${beat.beatName} — ${beat.stopCount} outlets${
                      beat.locked ? ' (worked)' : ''
                    }`
                  : `${index + 1}. ${beatNames.get(beatId) ?? 'Beat'} — added in this edit`
              }
            >
              <span className="inline-flex h-5 max-w-48 cursor-default items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 text-[11px] font-medium text-primary">
                <Store className="size-2.5 shrink-0" />
                <span className="truncate">
                  {beat?.beatName ?? beatNames.get(beatId) ?? `Beat ${beatId}`}
                </span>
              </span>
            </Hint>
          )
        })}

        {empty ? (
          <Hint label="Work that takes beats needs at least one — the save will be refused without it.">
            <span className="inline-flex cursor-default items-center gap-1 text-[11px] font-medium text-warning">
              <TriangleAlert className="size-3" />
              needs a beat
            </span>
          </Hint>
        ) : null}

        {canEdit ? (
          <Hint
            label={
              entry.distributorId
                ? 'Choose the beats and their order'
                : 'Pick a distributor first — the beat list is his'
            }
          >
            <button
              type="button"
              onClick={onEdit}
              disabled={!entry.distributorId}
              className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PencilLine className="size-2.5" />
              {empty ? 'add' : 'edit'}
            </button>
          </Hint>
        ) : null}
      </div>

      {saved?.jointWorkingInchargeName ? (
        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="size-3" />
          {saved.jointWorkingInchargeName}
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
