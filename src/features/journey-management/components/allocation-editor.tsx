import { useMemo, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  MapPin,
  Plus,
  Store,
  Trash2,
  TriangleAlert,
  Truck,
  X,
} from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { bucketKey, type BucketDraft } from '../lib/allocation-buckets'
import { takesCity } from '../lib/activities'
import type { ScheduledDays } from '../lib/scheduled-days'
import { BucketDatePicker } from './bucket-date-picker'
import { DayCountInput } from './day-count-input'
import type {
  ActivityAllocation,
  AllocationOptions,
  DistributorAllocation,
} from '../types'

/** The lazily-paged city master, as the caller hands it over. */
export interface CitySelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

/** Days a bucket list promises, whatever it is a list of. */
function sum(rows: BucketDraft[]): number {
  return rows.reduce((total, row) => total + row.daysCount, 0)
}

/**
 * Journey Management → Journey Plan → the allocation.
 *
 * **The admin allocates COUNTS. He never picks a date or a beat.** Two sets of
 * buckets: activity days ("one meeting day, four weekly offs, two days of
 * distributor search in Rajkot") and distributor days ("six on Halvad Traders,
 * four on Morbi Agencies"). Which date, and which of that distributor's beats,
 * are the sales incharge's to decide a month later.
 *
 * ── The counts are a PART of the month, not all of it ──────────────────────
 * This is the rule most likely to be misread from the old screen. The admin
 * allocates the work he cares about and the sales incharge fills the remaining
 * dates himself, so a month that does not add up is the **normal** state and
 * publishing it is fine. The running total therefore reads as information —
 * "18 of 31 days allocated · 13 left to him" — rather than as a variance to
 * clear, and nothing here is coloured as an error for being short.
 *
 * ── Going OVER the month is the one thing that BLOCKS ──────────────────────
 * A month cannot be worked for more days than it has, so an allocation whose
 * counts add up past the calendar is refused: the running total turns red, the
 * banner names the excess, and both the allocation Save and the Publish are
 * disabled until it comes back inside the month. Nothing prevents *typing* it —
 * the field would be unusable mid-edit — it is stopped at the commit.
 *
 * ── Only a SEARCH takes a city ─────────────────────────────────────────────
 * The API accepts a city on any activity bucket, but only a distributor search
 * means anything by it: "go and find someone in Rajkot", where the city is the
 * whole instruction. A weekly off or a meeting has no such reading, so those
 * rows carry no picker at all rather than an optional field nothing would act
 * on. And the picker is the **whole city master**, not the cities his
 * distributors already sit in — a search is by definition somewhere he has
 * nobody yet.
 *
 * ── A distributor VISIT names its distributors ─────────────────────────────
 * Same shape of idea as the city, one axis over: a `distributor_visit` bucket
 * carries a **set** of distributors — "four days calling on these three" — as
 * chips plus an adder rather than a select. It is a set on ONE bucket, not an
 * identity axis: adding a distributor edits the bucket, it does not split it,
 * which is what separates it from the distributor panel on the right (one
 * bucket per distributor, each with its own count of field-selling days).
 *
 * Two rules are still enforced by construction rather than by a validator,
 * because a control that can't take a wrong answer beats an error message:
 *
 * - **One row per (activity, city), one per distributor.** A pair another row
 *   already holds is dropped from this row's options.
 * - **Only the activities and distributors `allocation-options` offers.** Those
 *   two lists are the whitelist the Save enforces — anything absent comes back a
 *   400 — so the pickers are built from them and from nothing else. The city is
 *   deliberately not policed that way, at either end.
 */
/**
 * Shared empty set for a bucket the sales incharge has not dated. One instance
 * so the picker's `useMemo` on it does not re-run on every render of the panel.
 */
const EMPTY_DATES: Set<string> = new Set()

export function AllocationEditor({
  options,
  month,
  lockedDates,
  activityBuckets,
  distributorBuckets,
  onChangeActivities,
  onChangeDistributors,
  /** The city master, for the search rows. */
  city,
  /** The saved distributor buckets, for `days_scheduled` and the beat counts. */
  savedDistributors,
  /** The saved activity buckets, for `days_scheduled` and the names. */
  savedActivities,
  /**
   * Days the calendar below currently spends per bucket, counted off the DRAFT.
   *
   * Preferred over the saved `days_scheduled` wherever it is present, because
   * both editors are on one screen: an admin who empties a bucket's dates in the
   * calendar must not be told the bucket still has five days against it.
   */
  scheduled,
  /**
   * Give a bucket a date on the CALENDAR, or take one off it.
   *
   * Present only while the calendar is editable. With it the date rows below are
   * a live view of the month rather than a second, pin-only list — see
   * `BucketDatePicker.onToggle`.
   */
  onToggleDate,
  /**
   * Activities the calendar holds that no bucket covers, and the gesture that
   * gives one a bucket. Rendered under the activity panel — see
   * `UnallocatedActivities`.
   */
  readOnly = false,
  busy = false,
  /** Why the allocation is locked, when it is — an approved plan refuses the PATCH. */
  lockedReason,
}: {
  options: AllocationOptions | undefined
  /** The plan's month, `yyyy-MM` — the only month a pinned date may fall in. */
  month: string
  /**
   * Dates a visit has already landed on. The server refuses a pin on one, so the
   * calendar disables them rather than letting the whole save come back a 400.
   */
  lockedDates?: Set<string>
  activityBuckets: BucketDraft[]
  distributorBuckets: BucketDraft[]
  onChangeActivities: (next: BucketDraft[]) => void
  onChangeDistributors: (next: BucketDraft[]) => void
  city: CitySelect
  savedDistributors: DistributorAllocation[]
  savedActivities: ActivityAllocation[]
  scheduled?: ScheduledDays
  onToggleDate?: (row: BucketDraft, date: string, on: boolean) => void
  readOnly?: boolean
  busy?: boolean
  lockedReason?: string
}) {
  /**
   * "N scheduled" for one bucket. The live count wins whenever the calendar is on
   * screen — INCLUDING when it is zero, which is the whole point: falling back to
   * the saved figure there would report days against a bucket the admin has just
   * emptied. Zero itself is not rendered, only counted as "nothing dated yet".
   */
  const scheduledOf = (key: string, side: 'activity' | 'distributor', saved?: number) => {
    if (!scheduled) return saved
    return scheduled[side].get(key) || undefined
  }

  /**
   * WHICH dates the sales incharge has this bucket on — the same live-over-saved
   * rule as the count above it, for the same reason: the calendar is on this
   * screen, so a date he has just been given must show here immediately.
   *
   * The saved `scheduledDates` is the fallback, not the source: it only moves
   * when the calendar is saved.
   */
  const scheduledDatesOf = (key: string, saved?: string[]) => {
    if (scheduled) return scheduled.activityDates.get(key) ?? EMPTY_DATES
    return saved?.length ? new Set(saved) : EMPTY_DATES
  }

  const totalDays = options?.totalDays ?? 0
  const activityDays = sum(activityBuckets)
  const distributorDays = sum(distributorBuckets)
  const allocated = activityDays + distributorDays
  // Days of the month nobody has spoken for. This is what the sales incharge
  // fills in himself, so it is a fact rather than a shortfall.
  const unallocated = Math.max(0, totalDays - allocated)
  const over = allocated > totalDays

  /**
   * Names for cities picked in THIS session.
   *
   * Needed because `cityId` is part of a bucket's identity: picking one changes
   * the row's React key, the row remounts, and the Combobox's own memory of what
   * was chosen goes with it. The name is captured at pick time — where the
   * option is certainly loaded — and kept here, above the row.
   */
  const [pickedCityNames, setPickedCityNames] = useState<Map<string, string>>(new Map())

  const rememberCity = (cityId: string | null) => {
    if (!cityId) return
    const label = city.options.find((option) => option.value === cityId)?.label
    if (!label) return
    setPickedCityNames((previous) => {
      if (previous.get(cityId) === label) return previous
      const next = new Map(previous)
      next.set(cityId, label)
      return next
    })
  }

  /**
   * Names for distributors picked in this session — the same insurance the
   * cities have. `allocation-options.distributors` is the whole reachable list
   * today, but it is a server list with a page size, and a chip that reads
   * `Distributor 42` is the failure mode when it stops being complete.
   */
  const [pickedDistributorNames, setPickedDistributorNames] = useState<
    Map<string, string>
  >(new Map())

  /**
   * A city's name, for the read-only rows and for the picker's fallback label.
   *
   * Four sources, in order of authority: the plan's own buckets (the only one an
   * approved month has, since `allocation-options` is not fetched then), what was
   * picked here this session, the master page currently loaded, and — when the
   * server sent an id with no name and the master has not reached it — the id.
   */
  const cityNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of city.options) map.set(option.value, option.label)
    for (const [cityId, name] of pickedCityNames) map.set(cityId, name)
    for (const bucket of savedActivities) {
      if (bucket.cityId && bucket.cityName) map.set(bucket.cityId, bucket.cityName)
    }
    return map
  }, [savedActivities, city.options, pickedCityNames])

  /**
   * Which activities take a city — read off the CODE, which comes from the
   * pickers for a live plan and from the saved buckets for a frozen one.
   */
  const codeOfActivity = useMemo(() => {
    const map = new Map<string, string>()
    for (const bucket of savedActivities) {
      if (bucket.activityCode) map.set(String(bucket.activityId), bucket.activityCode)
    }
    for (const activity of options?.activities ?? []) {
      map.set(String(activity.activityId), activity.code)
    }
    return map
  }, [savedActivities, options?.activities])

  const savedDistributorById = useMemo(
    () => new Map(savedDistributors.map((row) => [row.distributorId, row])),
    [savedDistributors],
  )

  const savedActivityByKey = useMemo(
    () =>
      new Map(
        savedActivities.map((row) => [`${row.activityId}|${row.cityId ?? ''}`, row]),
      ),
    [savedActivities],
  )

  /**
   * Activities that may still be ADDED.
   *
   * A new row always starts city-less, so an activity that already has a
   * city-less row is dropped — adding it again would build a duplicate the server
   * refuses. A second row for the same activity is reached by giving the first
   * one a city, which is exactly the order the model wants.
   */
  const addableActivities = useMemo<ComboboxOption[]>(() => {
    const cityless = new Set(
      activityBuckets.filter((row) => !row.cityId).map((row) => row.id),
    )
    return (options?.activities ?? [])
      .filter((activity) => !cityless.has(String(activity.activityId)))
      .map((activity) => ({
        label: activity.name,
        value: String(activity.activityId),
        // Most allocatable activities are the non-working ones, so flagging the
        // exceptions is what actually carries information here.
        hint: activity.isWorkingDay ? 'Working day' : undefined,
      }))
  }, [options?.activities, activityBuckets])

  const addableDistributors = useMemo<ComboboxOption[]>(() => {
    const taken = new Set(distributorBuckets.map((row) => row.id))
    return (options?.distributors ?? [])
      .filter((distributor) => !taken.has(distributor.distributorId))
      .map((distributor) => ({
        label: distributor.distributorName ?? `Distributor ${distributor.distributorId}`,
        value: distributor.distributorId,
        badge: `${distributor.beatCount} beat${distributor.beatCount === 1 ? '' : 's'}`,
        hint: distributor.cityName ?? undefined,
      }))
  }, [options?.distributors, distributorBuckets])

  const nameOfActivity = useMemo(() => {
    const map = new Map<string, string>()
    for (const activity of savedActivities) {
      if (activity.activityName)
        map.set(String(activity.activityId), activity.activityName)
    }
    for (const activity of options?.activities ?? []) {
      map.set(String(activity.activityId), activity.name)
    }
    return map
  }, [savedActivities, options?.activities])

  const nameOfDistributor = useMemo(() => {
    const map = new Map<string, string>()
    for (const [distributorId, name] of pickedDistributorNames) {
      map.set(distributorId, name)
    }
    for (const row of savedDistributors) {
      if (row.distributorName) map.set(row.distributorId, row.distributorName)
    }
    // The ones named on an ACTIVITY bucket need naming too, and an approved
    // month fetches no options at all — the saved buckets are the only source.
    for (const bucket of savedActivities) {
      for (const row of bucket.distributors) {
        if (row.distributorName) map.set(row.distributorId, row.distributorName)
      }
    }
    for (const row of options?.distributors ?? []) {
      if (row.distributorName) map.set(row.distributorId, row.distributorName)
    }
    return map
  }, [savedDistributors, savedActivities, options?.distributors, pickedDistributorNames])

  /**
   * Activities that must name at least one distributor.
   *
   * Off `requires_distributors`, **never off the code** — the flag is data and
   * the client may move it to another activity. An approved month fetches no
   * options at all; there the saved bucket's own `distributors` is the only
   * evidence, and it is enough, because nothing there is editable anyway.
   */
  const needsDistributors = useMemo(() => {
    const set = new Set<string>()
    for (const activity of options?.activities ?? []) {
      if (activity.requiresDistributors) set.add(String(activity.activityId))
    }
    for (const bucket of savedActivities) {
      if (bucket.distributors.length > 0) set.add(String(bucket.activityId))
    }
    return set
  }, [options?.activities, savedActivities])


  /** Every allocatable distributor, as the visit picker offers them. */
  const distributorOptions = useMemo<ComboboxOption[]>(
    () =>
      (options?.distributors ?? []).map((distributor) => ({
        label: distributor.distributorName ?? `Distributor ${distributor.distributorId}`,
        value: distributor.distributorId,
        badge: `${distributor.beatCount} beat${distributor.beatCount === 1 ? '' : 's'}`,
        hint: distributor.cityName ?? undefined,
      })),
    [options?.distributors],
  )

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          The allocation
        </h2>
        {/* Neutral by design: being short of the month is the ordinary case, so
            this is a running count and not a verdict. Only the over-allocation
            below is worth colouring. */}
        <Hint label="Activity days plus distributor days, against the calendar dates in the month. You are not expected to cover all of them — whatever you leave is the sales incharge's to fill in.">
          <span
            className={cn(
              'cursor-default rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              over
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {allocated} / {totalDays} days
            {over
              ? ` · ${allocated - totalDays} over`
              : unallocated > 0
                ? ` · ${unallocated} left to him`
                : ''}
          </span>
        </Hint>
        <span className="ml-auto text-xs text-muted-foreground">
          Counts only — he picks the dates, and the beats under each distributor.
        </span>
      </div>

      {lockedReason ? (
        <p className="border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          {lockedReason}
        </p>
      ) : null}

      {/* The one blocking state on this screen: a month cannot promise more days
          than it holds, so neither the Save nor the Publish will take it. Short of
          the month is still perfectly fine — that is the sales incharge's to fill. */}
      {over ? (
        <p
          role="alert"
          className="flex items-start gap-2 border-b border-destructive/25 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>
            You have promised {allocated} days of work in a {totalDays}-day month —{' '}
            {allocated - totalDays} more than it holds. Reduce the counts by{' '}
            {allocated - totalDays} day
            {allocated - totalDays === 1 ? '' : 's'} before saving or publishing.
          </span>
        </p>
      ) : null}

      <div className="grid gap-0 divide-border/60 md:grid-cols-2 md:divide-x">
        {/* Activities first: they are the company's fixed days, and what is left
            over is what there is to spread across the distributors. */}
        <BucketPanel
          title="Activity Days"
          icon={CalendarClock}
          blurb="Fixed days — meetings, weekly offs, training, distributor search. Field selling is never here: that is allocated by distributor."
          emptyCopy="No activity days. Nothing about the month is fixed for him."
          month={month}
          lockedDates={lockedDates}
          rows={activityBuckets}
          nameOf={(row) => nameOfActivity.get(row.id) ?? `Activity ${row.id}`}
          savedOf={(row) =>
            scheduledOf(
              bucketKey(row),
              'activity',
              savedActivityByKey.get(bucketKey(row))?.daysScheduled,
            )
          }
          scheduledDatesOf={(row) =>
            scheduledDatesOf(
              bucketKey(row),
              savedActivityByKey.get(bucketKey(row))?.scheduledDates,
            )
          }
          onToggleDate={onToggleDate}
          // Only a SEARCH takes a city — every other activity row returns
          // undefined and renders no picker at all.
          cityOf={(row) =>
            takesCity(codeOfActivity.get(row.id))
              ? {
                  value: row.cityId ?? null,
                  // No fabricated "City 173": the master is paged and cannot be
                  // asked for one id, so when the bucket came back with a
                  // `city_id` and no `city_name` there is genuinely no name to
                  // show. Say that, rather than printing the row's primary key.
                  name: row.cityId
                    ? (cityNameById.get(row.cityId) ?? 'Selected city')
                    : null,
                  remember: rememberCity,
                  select: {
                    ...city,
                    options: city.options.filter(
                      (option) =>
                        // A pair another row already holds would be refused on save.
                        option.value === row.cityId ||
                        !activityBuckets.some(
                          (other) => other.id === row.id && other.cityId === option.value,
                        ),
                    ),
                  },
                }
              : undefined
          }
          // Only an activity the master flags names distributors, and it names a
          // set of them on one bucket. Every other row renders no picker at all,
          // and sending ids on one is a 400.
          distributorsOf={(row) =>
            needsDistributors.has(row.id)
              ? {
                  ids: row.distributorIds ?? [],
                  nameOf: (id) => nameOfDistributor.get(id) ?? `Distributor ${id}`,
                  options: distributorOptions,
                  remember: (distributorId, label) =>
                    setPickedDistributorNames((previous) =>
                      previous.get(distributorId) === label
                        ? previous
                        : new Map(previous).set(distributorId, label),
                    ),
                }
              : undefined
          }
          addOptions={addableActivities}
          addPlaceholder="Add an activity"
          searchPlaceholder="Search activities…"
          withDates
          exhaustedHint="Every allocatable activity already has a count. Give one a city to add it a second time."
          subtotal={activityDays}
          totalDays={totalDays}
          readOnly={readOnly}
          busy={busy}
          onChange={onChangeActivities}
        />

        <BucketPanel
          title="Distributor Days"
          icon={Truck}
          blurb="Days per distributor — the unit field time comes in. He picks which of that distributor's beats to work, and on which dates."
          emptyCopy="No distributors allocated — nothing says where he is meant to sell this month."
          month={month}
          rows={distributorBuckets}
          nameOf={(row) => nameOfDistributor.get(row.id) ?? `Distributor ${row.id}`}
          savedOf={(row) =>
            scheduledOf(
              row.id,
              'distributor',
              savedDistributorById.get(row.id)?.daysScheduled,
            )
          }
          metaOf={(row) => {
            const saved = savedDistributorById.get(row.id)
            const option = options?.distributors.find(
              (distributor) => distributor.distributorId === row.id,
            )
            return {
              beats: saved?.beatCount ?? option?.beatCount,
              outlets: saved?.outletCount ?? option?.outletCount,
              city: saved?.cityName ?? option?.cityName ?? null,
            }
          }}
          addOptions={addableDistributors}
          addPlaceholder="Add a distributor"
          searchPlaceholder="Search distributors…"
          exhaustedHint="Every distributor his beats reach already has a count."
          subtotal={distributorDays}
          totalDays={totalDays}
          readOnly={readOnly}
          busy={busy}
          onChange={onChangeDistributors}
        />
      </div>
    </div>
  )
}

/** Facts a distributor row carries beside its count. Activity rows have none. */
interface RowMeta {
  beats?: number
  outlets?: number
  city?: string | null
}

/** The distributors named on a visit row: the set, their names, and the picker. */
interface RowDistributors {
  ids: string[]
  nameOf: (id: string) => string
  options: ComboboxOption[]
  /** Called with what was just picked, so its name outlives the option list. */
  remember: (distributorId: string, label: string) => void
}

/** The optional city on a search row: its value, its name, and the master picker. */
interface RowCity {
  value: string | null
  name: string | null
  select: CitySelect
  /** Called with the picked id, so its name survives the row's remount. */
  remember: (cityId: string | null) => void
}

/**
 * One side of the editor: a list of buckets and a picker to add another.
 *
 * Both panels are the same control because both allocate the same thing — a count
 * of days — and the only difference is what the count is *of*.
 */
function BucketPanel({
  title,
  icon: Icon,
  blurb,
  emptyCopy,
  month,
  lockedDates,
  rows,
  nameOf,
  savedOf,
  scheduledDatesOf,
  onToggleDate,
  metaOf,
  cityOf,
  distributorsOf,
  addOptions,
  addPlaceholder,
  searchPlaceholder,
  withDates = false,
  exhaustedHint,
  subtotal,
  totalDays,
  readOnly,
  busy,
  onChange,
}: {
  title: string
  icon: typeof Truck
  blurb: string
  emptyCopy: string
  month: string
  lockedDates?: Set<string>
  rows: BucketDraft[]
  nameOf: (row: BucketDraft) => string
  /** Days the sales incharge has already dated against this bucket, if any. */
  savedOf: (row: BucketDraft) => number | undefined
  /**
   * The dates behind that count. Rendered in the date picker as HELD — shown but
   * not pinnable — so a fully dated bucket stops reading as an empty one.
   */
  scheduledDatesOf?: (row: BucketDraft) => Set<string> | undefined
  /** Write a date straight onto the calendar — absent while it is frozen. */
  onToggleDate?: (row: BucketDraft, date: string, on: boolean) => void
  metaOf?: (row: BucketDraft) => RowMeta
  /** `undefined` for a row whose activity has no use for a city. */
  cityOf?: (row: BucketDraft) => RowCity | undefined
  /** `undefined` for a row whose activity names no distributors. */
  distributorsOf?: (row: BucketDraft) => RowDistributors | undefined
  addOptions: ComboboxOption[]
  addPlaceholder: string
  /** Placeholder in the adder's search box (e.g. "Search distributors…"). */
  searchPlaceholder: string
  /**
   * Offer the optional date pins on these rows.
   *
   * Activity days only. A distributor bucket is field selling — which of that
   * distributor's beats on which date is the sales incharge's whole job, and
   * pinning dates for him from here is the one thing the model does not do.
   */
  withDates?: boolean
  exhaustedHint: string
  subtotal: number
  /** Calendar days in the month — a single bucket never sensibly exceeds it. */
  totalDays: number
  readOnly: boolean
  busy: boolean
  onChange: (next: BucketDraft[]) => void
}) {
  // The picker is a transient control: it never holds a value, it just emits the
  // chosen id and resets. Keyed so the Combobox clears its own trigger text.
  const [addKey, setAddKey] = useState(0)

  const add = (id: string) => {
    if (!id || readOnly || busy) return
    // Deliberately no "the month is full" guard: over-allocating is legal, and
    // refusing to add a bucket would be a rule the server does not have.
    onChange([...rows, { id, cityId: null, daysCount: 1 }])
    setAddKey((k) => k + 1)
  }

  const patch = (row: BucketDraft, next: Partial<BucketDraft>) =>
    onChange(
      rows.map((candidate) => {
        if (bucketKey(candidate) !== bucketKey(row)) return candidate
        const merged = { ...candidate, ...next }
        // Pinned dates can never outnumber the days they are pinned on, so
        // lowering the count drops the ones that no longer fit — from the end,
        // which is the order they were added in.
        return merged.dates && merged.dates.length > merged.daysCount
          ? { ...merged, dates: merged.dates.slice(0, merged.daysCount) }
          : merged
      }),
    )

  /**
   * Which bucket has fixed which date — **one date carries one fixed activity.**
   *
   * A date is a day of his month: two activities pinned to it is two
   * instructions for the same day, and nothing downstream can act on both. The
   * calendar therefore disables a date another bucket already holds, which is
   * also what keeps `JOURNEY_PLAN_DUPLICATE_FIXED_DATE` unreachable.
   */
  const dateOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      for (const date of row.dates ?? []) map.set(date, bucketKey(row))
    }
    return map
  }, [rows])

  /** The same map from one row's point of view: dates it does NOT hold. */
  const datesTakenFrom = (row: BucketDraft): Map<string, string> => {
    const key = bucketKey(row)
    const taken = new Map<string, string>()
    for (const [date, owner] of dateOwner) {
      if (owner === key) continue
      const holder = rows.find((candidate) => bucketKey(candidate) === owner)
      taken.set(date, holder ? nameOf(holder) : 'another activity')
    }
    return taken
  }

  const remove = (row: BucketDraft) =>
    onChange(rows.filter((candidate) => bucketKey(candidate) !== bucketKey(row)))

  return (
    <div className="min-w-0 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0 text-primary" />
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
          {subtotal} {subtotal === 1 ? 'day' : 'days'}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyCopy}
        </p>
      ) : (
        // Grows with the buckets, then STOPS: a month can hold a dozen of them
        // and the two panels sit side by side, so an uncapped list pushes the
        // calendar below off the screen. Short lists stay short — a fixed height
        // would leave a wall of white under two rows. `pr-1.5` keeps the
        // scrollbar off the counts.
        <ul className="mt-3 max-h-[30rem] space-y-2 overflow-y-auto overscroll-contain pr-1.5">
          {rows.map((row) => {
            const scheduled = savedOf(row)
            const heldDates = scheduledDatesOf?.(row)
            const meta = metaOf?.(row)
            const rowCity = cityOf?.(row)
            const rowDistributors = distributorsOf?.(row)
            // A count below what the sales incharge has already dated is what
            // `schedule_mismatch` reports. It no longer blocks anything, but it is
            // still the kind of thing to notice before saving rather than after.
            const undercut = scheduled != null && scheduled > row.daysCount

            const beatsLine =
              meta && meta.beats != null && meta.beats > 0
                ? `${meta.beats} beat${meta.beats === 1 ? '' : 's'}${meta.outlets ? ` · ${meta.outlets} outlets` : ''}`
                : null
            const hasMeta = Boolean(beatsLine || meta?.city || scheduled != null)

            return (
              <li
                key={bucketKey(row)}
                className="rounded-lg border border-border/60 bg-muted/25 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm leading-5 text-foreground">
                      {/* The card is narrow and a distributor's registered name
                          is not, so the truncated title keeps the whole of it. */}
                      <Hint label={nameOf(row)}>
                        <span className="min-w-0 cursor-default truncate">
                          {nameOf(row)}
                        </span>
                      </Hint>
                      {/* 0 beats is `distributor_without_beats`: the allocation was
                          right when it was made and the beat master moved under it. */}
                      {meta && meta.beats === 0 ? (
                        <Hint label="He holds no beat serving this distributor, so he cannot work these days. Fix the beat allocation, or move the days elsewhere.">
                          <span className="inline-flex shrink-0 cursor-default items-center gap-0.5 rounded-full bg-warning/15 px-1.5 text-[10px] font-semibold text-warning">
                            <TriangleAlert className="size-2.5" />
                            no beats
                          </span>
                        </Hint>
                      ) : null}
                    </p>

                    {/* Rendered only when there is something to say — an empty
                        meta line is pure row height, and these rows sit in a
                        capped scroller beside a second panel. */}
                    {hasMeta ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] leading-4 tabular-nums text-muted-foreground">
                        {beatsLine ? (
                          <span className="inline-flex items-center gap-1">
                            <Store className="size-2.5" />
                            {beatsLine}
                          </span>
                        ) : null}
                        {meta?.city ? <span>{meta.city}</span> : null}
                        {scheduled != null ? (
                          <span className={cn(undercut && 'font-medium text-warning')}>
                            {scheduled} scheduled
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>

                  {/* The count and the bin sit on the NAME line and stay there
                      whether or not the row carries a city, so every row in the
                      list keeps one column of controls at one height. */}
                  <div className="flex shrink-0 items-end gap-1.5">
                    {/* Capped at the length of the month, and at nothing else: a
                        single bucket bigger than the calendar is certainly a typo,
                        but the TOTAL across buckets is free to exceed it, because a
                        date can carry two entries. */}
                    {/* Titled, because a bare number box beside a name reads as a
                        quantity of anything. The label is presentational only —
                        the input keeps its own `aria-label`, which names the
                        bucket as well as the unit. */}
                    <div className="flex flex-col items-center gap-1">
                      {/* Sized to the label, not to the input — "No. of days" is
                          wider than a 14-unit box, so the box centres under it. */}
                      <span
                        aria-hidden
                        className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground"
                      >
                        No. of days
                      </span>
                      <DayCountInput
                        value={row.daysCount}
                        max={totalDays || undefined}
                        disabled={readOnly || busy}
                        ariaLabel={`Days for ${nameOf(row)}`}
                        onChange={(daysCount) => patch(row, { daysCount })}
                        className="h-8 w-14 text-sm"
                      />
                    </div>
                    {!readOnly ? (
                      <Hint label="Remove this bucket">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(row)}
                          aria-label={`Remove ${nameOf(row)}`}
                          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </Hint>
                    ) : null}
                  </div>
                </div>

                {/* The fields the bucket carries, each in its own labelled row
                    under a rule: which are present differs by activity (only a
                    search takes a city, only a visit names distributors) and
                    without a label they read as one unexplained stack of
                    controls. Dates are always here; they are always optional. */}
                {rowCity || rowDistributors || withDates ? (
                  <dl className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5">
                    {rowCity ? (
                      <Field label="City">
                        {readOnly ? (
                          <span className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{rowCity.name ?? 'Anywhere'}</span>
                          </span>
                        ) : (
                          // The whole city master, paged and server-searched — a
                          // search is by definition somewhere he has no
                          // distributor yet, so his existing cities are the wrong
                          // list to narrow to.
                          <Combobox
                            value={rowCity.value ?? ''}
                            onChange={(cityId) => {
                              rowCity.remember(cityId || null)
                              patch(row, { cityId: cityId || null })
                            }}
                            options={rowCity.select.options}
                            loading={rowCity.select.loading}
                            onScrollEnd={rowCity.select.onScrollEnd}
                            onSearchChange={rowCity.select.onSearchChange}
                            icon={MapPin}
                            searchable
                            // A search with no city is a real answer — "find
                            // someone, anywhere" — so the field has to be able
                            // to go back to empty once it has a value.
                            clearable
                            placeholder="Anywhere"
                            searchPlaceholder="Search cities…"
                            // The master is paged: a city picked in an earlier
                            // session is very rarely on the first page, so
                            // without the plan's own name for it the trigger
                            // would read "Anywhere" over a bucket that has one.
                            fallbackLabel={rowCity.name ?? undefined}
                            disabled={busy}
                            className="h-8 w-full min-w-0 text-xs"
                          />
                        )}

                        {/* Required by this screen, not by the API: a search
                            with no city is "find someone, somewhere", which is
                            not a day anyone can be sent out on. */}
                        {!readOnly && !rowCity.value ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <TriangleAlert className="size-3 shrink-0" />
                            Pick a city
                          </span>
                        ) : null}
                      </Field>
                    ) : null}

                    {rowDistributors ? (
                      // A SET on one bucket, so it reads as chips plus an adder
                      // rather than a single select: "four days of visits, across
                      // these three". Removing the last one is legal — the bucket
                      // is then days of visiting nobody in particular yet.
                      <Field label="Distributors">
                        {/* `w-full min-w-0`: as a flex item of the field's `dd`
                            this box would otherwise take its width from the
                            chips inside it — the default `min-width: auto` — and
                            carry them straight past the card's edge. */}
                        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5">
                          {rowDistributors.ids.map((id) => (
                            <span
                              key={id}
                              // `min-w-0` + `overflow-hidden` is what makes the
                              // chip give way instead of pushing its own × past
                              // the card's edge: without it the name sets a
                              // floor the flex line cannot go under.
                              className="inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-border/60 bg-background pr-1.5 pl-2.5 text-xs text-foreground"
                            >
                              <Truck className="size-3 shrink-0 text-muted-foreground" />
                              {/* Truncation is the point of the chip; the hint
                                  is where the whole name still lives. */}
                              <Hint label={rowDistributors.nameOf(id)}>
                                <span className="min-w-0 cursor-default truncate">
                                  {rowDistributors.nameOf(id)}
                                </span>
                              </Hint>
                              {!readOnly ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    patch(row, {
                                      distributorIds: rowDistributors.ids.filter(
                                        (candidate) => candidate !== id,
                                      ),
                                    })
                                  }
                                  aria-label={`Remove ${rowDistributors.nameOf(id)}`}
                                  className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <X className="size-3" />
                                </button>
                              ) : null}
                            </span>
                          ))}

                          {readOnly && rowDistributors.ids.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              None named
                            </span>
                          ) : null}

                          {/* Required, not optional: a bucket the master flags
                              and that names nobody is refused for the whole
                              month with `ACTIVITY_DISTRIBUTORS_REQUIRED`, so the
                              row says so before the Save does. */}
                          {!readOnly && rowDistributors.ids.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                              <TriangleAlert className="size-3 shrink-0" />
                              Pick at least one
                            </span>
                          ) : null}

                          {!readOnly ? (
                            // The picker holds no value of its own — it adds one
                            // and resets, the same contract as the panel's adder.
                            <AddDistributor
                              options={rowDistributors.options.filter(
                                (option) => !rowDistributors.ids.includes(option.value),
                              )}
                              disabled={busy}
                              empty={rowDistributors.ids.length === 0}
                              onAdd={(id, label) => {
                                rowDistributors.remember(id, label)
                                patch(row, {
                                  distributorIds: [...rowDistributors.ids, id],
                                })
                              }}
                            />
                          ) : null}
                        </div>
                      </Field>
                    ) : null}

                    {/* Optional, and normally left alone: the dates are the sales
                      incharge's to pick. This is for the days that are already
                      fixed — the meeting that is on the 4th. Activity rows only;
                      a distributor's days are his to date. */}
                    {withDates &&
                    (!readOnly ||
                      (row.dates?.length ?? 0) > 0 ||
                      (heldDates?.size ?? 0) > 0) ? (
                      <Field label="Dates">
                        <BucketDatePicker
                          month={month}
                          lockedDates={lockedDates}
                          takenDates={datesTakenFrom(row)}
                          scheduledDates={heldDates}
                          dates={row.dates ?? []}
                          max={row.daysCount}
                          label={nameOf(row)}
                          readOnly={readOnly}
                          disabled={busy}
                          onChange={(dates) => patch(row, { dates })}
                          onToggle={
                            onToggleDate
                              ? (date, on) => onToggleDate(row, date, on)
                              : undefined
                          }
                        />
                      </Field>
                    ) : null}
                  </dl>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {!readOnly ? (
        <div className="mt-3">
          {addOptions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">{exhaustedHint}</p>
          ) : (
            <Combobox
              key={addKey}
              value=""
              onChange={add}
              options={addOptions}
              icon={Plus}
              placeholder={addPlaceholder}
              // Always searchable, both panels: a month's distributor list runs
              // long and an activity master is tenant-editable, so neither is
              // reliably short enough to scan.
              searchable
              searchPlaceholder={searchPlaceholder}
              disabled={busy}
              className="w-full"
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

/**
 * The "+ distributor" control on a visit row.
 *
 * Its own component only so it can keep the reset key that clears the trigger
 * text after each pick — the Combobox is a value-less adder here, not a select.
 */
function AddDistributor({
  options,
  disabled,
  empty,
  onAdd,
}: {
  options: ComboboxOption[]
  disabled: boolean
  /** Nothing picked yet, so the control carries the whole instruction. */
  empty: boolean
  onAdd: (id: string, label: string) => void
}) {
  const [key, setKey] = useState(0)

  if (options.length === 0) {
    return empty ? (
      <span className="text-xs text-muted-foreground">None available.</span>
    ) : null
  }

  return (
    <Combobox
      key={key}
      value=""
      onChange={(id) => {
        if (!id) return
        // The label comes from the list that is loaded right now — after the
        // add, the row re-renders against a list that may not hold it.
        onAdd(id, options.find((option) => option.value === id)?.label ?? id)
        setKey((k) => k + 1)
      }}
      options={options}
      icon={Plus}
      placeholder={empty ? 'Add a distributor' : 'Add another'}
      searchable
      searchPlaceholder="Search distributors…"
      disabled={disabled}
      className="inline-flex w-auto max-w-full shrink-0"
      // Shaped like the date chip beside it: both are optional adders sitting in
      // a row of chips, and a field-shaped control among them reads as a blank
      // someone forgot to fill in.
      triggerClassName="h-8 w-auto gap-1.5 rounded-full border-dashed px-3 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground [&_svg]:size-3.5"
    />
  )
}

/**
 * One labelled field inside a bucket card.
 *
 * A label column rather than a stack of bare controls: which fields a bucket
 * carries changes from row to row — a search has a city, a visit has
 * distributors, everything has dates — so an unlabelled control is a question
 * the admin has to answer by recognising the placeholder.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-20 shrink-0 pt-2 text-xs leading-4 font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</dd>
    </div>
  )
}
