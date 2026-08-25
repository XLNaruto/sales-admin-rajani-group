import { useMemo, useState } from 'react'
import { CalendarClock, Plus, Store, Trash2, TriangleAlert, Truck } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { bucketKey, type BucketDraft } from '../lib/allocation-buckets'
import { takesCity } from '../lib/activities'
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
 * ── Going OVER the month is legal too ──────────────────────────────────────
 * A date can carry two entries, so 40 days of work fits in a 31-day month by
 * doubling dates up. It is worth saying, because it is rarely intended, so it
 * gets a warning — but nothing stops it, and no ceiling prevents typing it.
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
export function AllocationEditor({
  options,
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
  readOnly = false,
  busy = false,
  /** Why the allocation is locked, when it is — an approved plan refuses the PATCH. */
  lockedReason,
}: {
  options: AllocationOptions | undefined
  activityBuckets: BucketDraft[]
  distributorBuckets: BucketDraft[]
  onChangeActivities: (next: BucketDraft[]) => void
  onChangeDistributors: (next: BucketDraft[]) => void
  city: CitySelect
  savedDistributors: DistributorAllocation[]
  savedActivities: ActivityAllocation[]
  readOnly?: boolean
  busy?: boolean
  lockedReason?: string
}) {
  const totalDays = options?.totalDays ?? 0
  const activityDays = sum(activityBuckets)
  const distributorDays = sum(distributorBuckets)
  const allocated = activityDays + distributorDays
  // Days of the month nobody has spoken for. This is what the sales incharge
  // fills in himself, so it is a fact rather than a shortfall.
  const unallocated = Math.max(0, totalDays - allocated)
  const over = allocated > totalDays

  /**
   * City names for the read-only rows.
   *
   * The plan's own buckets are the source, because `allocation-options` is not
   * fetched at all once the allocation is frozen and the master picker is paged —
   * an approved month would otherwise render every city as a raw id.
   */
  const cityNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const bucket of savedActivities) {
      if (bucket.cityId && bucket.cityName) map.set(bucket.cityId, bucket.cityName)
    }
    return map
  }, [savedActivities])

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
      if (activity.activityName) map.set(String(activity.activityId), activity.activityName)
    }
    for (const activity of options?.activities ?? []) {
      map.set(String(activity.activityId), activity.name)
    }
    return map
  }, [savedActivities, options?.activities])

  const nameOfDistributor = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of savedDistributors) {
      if (row.distributorName) map.set(row.distributorId, row.distributorName)
    }
    for (const row of options?.distributors ?? []) {
      if (row.distributorName) map.set(row.distributorId, row.distributorName)
    }
    return map
  }, [savedDistributors, options?.distributors])

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
              over ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
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

      {/* Reachable, and occasionally deliberate — a date carrying two entries
          spends two allocated days — so this states the consequence rather than
          demanding a fix. Publishing is not affected. */}
      {over ? (
        <p
          role="alert"
          className="flex items-start gap-2 border-b border-warning/25 bg-warning/10 px-4 py-2.5 text-xs font-medium text-warning"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>
            You have promised {allocated} days of work in a {totalDays}-day month.
            He can only fit that by putting two activities on the same date — fine
            if you meant it, worth a second look if you did not.
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
          rows={activityBuckets}
          nameOf={(row) => nameOfActivity.get(row.id) ?? `Activity ${row.id}`}
          savedOf={(row) => savedActivityByKey.get(bucketKey(row))?.daysScheduled}
          // Only a SEARCH takes a city — every other activity row returns
          // undefined and renders no picker at all.
          cityOf={(row) =>
            takesCity(codeOfActivity.get(row.id))
              ? {
                  value: row.cityId ?? null,
                  name: row.cityId
                    ? (cityNameById.get(row.cityId) ?? `City ${row.cityId}`)
                    : null,
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
          addOptions={addableActivities}
          addPlaceholder="Add an activity"
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
          rows={distributorBuckets}
          nameOf={(row) => nameOfDistributor.get(row.id) ?? `Distributor ${row.id}`}
          savedOf={(row) => savedDistributorById.get(row.id)?.daysScheduled}
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

/** The optional city on a search row: its value, its name, and the master picker. */
interface RowCity {
  value: string | null
  name: string | null
  select: CitySelect
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
  rows,
  nameOf,
  savedOf,
  metaOf,
  cityOf,
  addOptions,
  addPlaceholder,
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
  rows: BucketDraft[]
  nameOf: (row: BucketDraft) => string
  /** Days the sales incharge has already dated against this bucket, if any. */
  savedOf: (row: BucketDraft) => number | undefined
  metaOf?: (row: BucketDraft) => RowMeta
  /** `undefined` for a row whose activity has no use for a city. */
  cityOf?: (row: BucketDraft) => RowCity | undefined
  addOptions: ComboboxOption[]
  addPlaceholder: string
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
      rows.map((candidate) =>
        bucketKey(candidate) === bucketKey(row) ? { ...candidate, ...next } : candidate,
      ),
    )

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
        // Capped rather than grown: a month can hold a dozen distributor buckets,
        // and the two panels sit side by side — an uncapped list pushes the
        // calendar below off the screen and leaves the shorter panel with a wall
        // of white beside it. `pr-1` keeps the scrollbar off the counts.
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {rows.map((row) => {
            const scheduled = savedOf(row)
            const meta = metaOf?.(row)
            const rowCity = cityOf?.(row)
            // A count below what the sales incharge has already dated is what
            // `schedule_mismatch` reports. It no longer blocks anything, but it is
            // still the kind of thing to notice before saving rather than after.
            const undercut = scheduled != null && scheduled > row.daysCount

            return (
              <li key={bucketKey(row)} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
                    <span className="truncate">{nameOf(row)}</span>
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

                  {rowCity ? (
                    <div className="mt-1">
                      {readOnly ? (
                        <span className="text-[11px] text-muted-foreground">
                          {rowCity.name ?? 'Anywhere'}
                        </span>
                      ) : (
                        // The whole city master, paged and server-searched — a
                        // search is by definition somewhere he has no
                        // distributor yet, so his existing cities are the wrong
                        // list to narrow to.
                        <Combobox
                          value={rowCity.value ?? ''}
                          onChange={(cityId) => patch(row, { cityId: cityId || null })}
                          options={rowCity.select.options}
                          loading={rowCity.select.loading}
                          onScrollEnd={rowCity.select.onScrollEnd}
                          onSearchChange={rowCity.select.onSearchChange}
                          searchable
                          placeholder="Anywhere"
                          searchPlaceholder="Search cities…"
                          disabled={busy}
                          className="h-8 w-full min-w-0 text-xs"
                        />
                      )}
                    </div>
                  ) : null}

                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums text-muted-foreground">
                    {meta && meta.beats != null && meta.beats > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Store className="size-2.5" />
                        {meta.beats} beat{meta.beats === 1 ? '' : 's'}
                        {meta.outlets ? ` · ${meta.outlets} outlets` : ''}
                      </span>
                    ) : null}
                    {meta?.city ? <span>{meta.city}</span> : null}
                    {scheduled != null ? (
                      <span className={cn(undercut && 'font-medium text-warning')}>
                        {scheduled} scheduled
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Capped at the length of the month, and at nothing else: a
                      single bucket bigger than the calendar is certainly a typo,
                      but the TOTAL across buckets is free to exceed it, because a
                      date can carry two entries. */}
                  <DayCountInput
                    value={row.daysCount}
                    max={totalDays || undefined}
                    disabled={readOnly || busy}
                    ariaLabel={`Days for ${nameOf(row)}`}
                    onChange={(daysCount) => patch(row, { daysCount })}
                  />
                  {!readOnly ? (
                    <Hint label="Remove this bucket">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(row)}
                        aria-label={`Remove ${nameOf(row)}`}
                        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </Hint>
                  ) : null}
                </div>
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
              searchable={addOptions.length > 8}
              disabled={busy}
              className="w-full"
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
