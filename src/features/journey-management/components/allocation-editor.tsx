import { useMemo, useState } from 'react'
import {
  CalendarClock,
  MapPin,
  Plus,
  Sparkles,
  Store,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { dayLabel } from '../lib/journey-format'
import { DayCountInput } from './day-count-input'
import type { AllocationOptions, CityAllocation } from '../types'

/** A bucket in the draft: which thing, and how many days of the month it takes. */
export interface BucketDraft {
  /** Activity id, or city id — the panel decides which. */
  id: string
  daysCount: number
}

/**
 * Journey Management → Journey Plan → the allocation.
 *
 * **The admin allocates COUNTS. He never picks a date or a beat.** Two sets of
 * buckets: activity days ("one meeting day, four weekly offs") and city days
 * ("twenty in Rajkot, seven in Morbi"). Which date, and which beats inside the
 * city, are the sales incharge's to decide a month later.
 *
 * The counts **must add up to the whole month**, and that is enforced twice by the
 * server — publish is refused otherwise. So the running total is the loudest thing
 * in this control: an admin who cannot see the variance cannot tell why publish is
 * greyed out.
 *
 * Two rules are enforced by construction rather than by a validator, because a
 * control that can't take a wrong answer beats an error message:
 *
 * - **One row per activity, one per city.** Whatever another row holds is dropped
 *   from this row's options.
 * - **Only what `allocation-options` offers.** That endpoint is the whitelist the
 *   Save enforces — anything absent from it comes back a 400 — so the pickers are
 *   built from it and from nothing else.
 */
export function AllocationEditor({
  options,
  activityBuckets,
  cityBuckets,
  onChangeActivities,
  onChangeCities,
  /** The saved city buckets, for `days_scheduled`, provenance and beat counts. */
  savedCities,
  /** Saved activity buckets, keyed by activity id, for `days_scheduled`. */
  savedActivityScheduled,
  readOnly = false,
  busy = false,
  /** Why the allocation is locked, when it is — an approved plan refuses the PATCH. */
  lockedReason,
}: {
  options: AllocationOptions | undefined
  activityBuckets: BucketDraft[]
  cityBuckets: BucketDraft[]
  onChangeActivities: (next: BucketDraft[]) => void
  onChangeCities: (next: BucketDraft[]) => void
  savedCities: CityAllocation[]
  savedActivityScheduled: Map<number, number>
  readOnly?: boolean
  busy?: boolean
  lockedReason?: string
}) {
  const totalDays = options?.totalDays ?? 0
  const activityDays = activityBuckets.reduce((sum, b) => sum + b.daysCount, 0)
  const cityDays = cityBuckets.reduce((sum, b) => sum + b.daysCount, 0)
  const allocated = activityDays + cityDays
  const variance = allocated - totalDays
  // What a bucket may still take on top of what it already holds. Negative means
  // the draft is already over the month — the pickers and the ceilings both read
  // it as zero, so nothing can push it further out.
  const remaining = Math.max(0, totalDays - allocated)
  const over = variance > 0

  const savedCityById = useMemo(
    () => new Map(savedCities.map((city) => [city.cityId, city])),
    [savedCities],
  )

  const activityOptions = useMemo<ComboboxOption[]>(() => {
    const taken = new Set(activityBuckets.map((b) => b.id))
    return (options?.activities ?? [])
      .filter((activity) => !taken.has(String(activity.activityId)))
      .map((activity) => ({
        label: activity.name,
        value: String(activity.activityId),
        // Most allocatable activities are the non-working ones, so flagging the
        // exceptions is what actually carries information here.
        hint: activity.isWorkingDay ? 'Working day' : undefined,
      }))
  }, [options?.activities, activityBuckets])

  const cityOptions = useMemo<ComboboxOption[]>(() => {
    const taken = new Set(cityBuckets.map((b) => b.id))
    return (options?.cities ?? [])
      .filter((city) => !taken.has(city.cityId))
      .map((city) => ({
        label: city.cityName ?? `City ${city.cityId}`,
        value: city.cityId,
        badge: `${city.beatCount} beat${city.beatCount === 1 ? '' : 's'}`,
        // `null` means NEVER worked — the thing the solver weighs heaviest. It must
        // not render as a date, and it must not render as "long ago" either.
        hint: city.lastWorkedDate
          ? `Last worked ${dayLabel(city.lastWorkedDate)}`
          : 'Never worked',
      }))
  }, [options?.cities, cityBuckets])

  const nameOfActivity = useMemo(() => {
    const map = new Map<string, string>()
    for (const activity of options?.activities ?? []) {
      map.set(String(activity.activityId), activity.name)
    }
    return map
  }, [options?.activities])

  const nameOfCity = useMemo(() => {
    const map = new Map<string, string>()
    for (const city of options?.cities ?? []) {
      map.set(city.cityId, city.cityName ?? `City ${city.cityId}`)
    }
    return map
  }, [options?.cities])

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          The allocation
        </h2>
        <Hint label="Activity days plus beat visit days, against the calendar dates in the month. Publish is refused unless they are equal.">
          <span
            className={cn(
              'cursor-default rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              variance === 0
                ? 'bg-success/15 text-success'
                : 'bg-destructive/12 text-destructive',
            )}
          >
            {allocated} / {totalDays} days
            {variance === 0
              ? ''
              : variance < 0
                ? ` · ${Math.abs(variance)} short`
                : ` · ${variance} day${variance === 1 ? '' : 's'} exceeded`}
          </span>
        </Hint>
        <span className="ml-auto text-xs text-muted-foreground">
          Counts only — the sales incharge picks the dates and the beats.
        </span>
      </div>

      {lockedReason ? (
        <p className="border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          {lockedReason}
        </p>
      ) : null}

      {/* The ceilings below stop anyone typing past the month, so this only shows
          for a draft that arrived over — a solver run, or a month whose length
          changed under a saved allocation. It has to be fixed by hand. */}
      {over ? (
        <p
          role="alert"
          className="flex items-start gap-2 border-b border-destructive/25 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>
            The counts exceed {totalDays} calendar days by {variance}{' '}
            {variance === 1 ? 'day' : 'days'}. Lower a bucket — publish is refused
            until they add up.
          </span>
        </p>
      ) : null}

      <div className="grid gap-0 divide-border/60 md:grid-cols-2 md:divide-x">
        {/* Activities first: they are the company's fixed days, and what is left
            over is what there is to spread across the cities. */}
        <BucketPanel
          title="Activity Days"
          icon={CalendarClock}
          blurb="Fixed days — meetings, weekly offs, training. Field selling is never allocatable: which day he sells is his."
          emptyCopy="No activity days. Every date will have to be a city day."
          rows={activityBuckets}
          nameOf={(id) => nameOfActivity.get(id) ?? `Activity ${id}`}
          scheduledOf={(id) => savedActivityScheduled.get(Number(id))}
          addOptions={activityOptions}
          addPlaceholder="Add an activity"
          exhaustedHint="Every allocatable activity already has a count."
          subtotal={activityDays}
          remaining={remaining}
          over={over}
          readOnly={readOnly}
          busy={busy}
          onChange={onChangeActivities}
        />

        <BucketPanel
          title="Beat Visit Days"
          icon={MapPin}
          blurb="Days per city, covering the beats allocated to him there. He chooses which beats inside each city, and on which dates."
          emptyCopy="No cities allocated — he has nowhere to work, and publish will be refused."
          rows={cityBuckets}
          nameOf={(id) => nameOfCity.get(id) ?? `City ${id}`}
          scheduledOf={(id) => savedCityById.get(id)?.daysScheduled}
          metaOf={(id) => {
            const saved = savedCityById.get(id)
            const option = options?.cities.find((city) => city.cityId === id)
            const beats = saved?.beatCount ?? option?.beatCount
            const outlets = saved?.outletCount ?? option?.outletCount
            return { beats, outlets, source: saved?.source }
          }}
          addOptions={cityOptions}
          addPlaceholder="Add a city"
          exhaustedHint="Every city his beats sit in already has a count."
          subtotal={cityDays}
          remaining={remaining}
          over={over}
          readOnly={readOnly}
          busy={busy}
          onChange={onChangeCities}
        />
      </div>
    </div>
  )
}

/** Facts a city row carries beside its count. Activity rows have none. */
interface RowMeta {
  beats?: number
  outlets?: number
  source?: 'solver' | 'manual'
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
  scheduledOf,
  metaOf,
  addOptions,
  addPlaceholder,
  exhaustedHint,
  subtotal,
  remaining,
  over,
  readOnly,
  busy,
  onChange,
}: {
  title: string
  icon: typeof MapPin
  blurb: string
  emptyCopy: string
  rows: BucketDraft[]
  nameOf: (id: string) => string
  /** Days the sales incharge has already dated against this bucket, when the plan has any. */
  scheduledOf: (id: string) => number | undefined
  metaOf?: (id: string) => RowMeta
  addOptions: ComboboxOption[]
  addPlaceholder: string
  exhaustedHint: string
  subtotal: number
  /** Days of the month still unallocated across *both* panels. Never negative. */
  remaining: number
  /** Whether the draft as a whole is already past the month. */
  over: boolean
  readOnly: boolean
  busy: boolean
  onChange: (next: BucketDraft[]) => void
}) {
  // The picker is a transient control: it never holds a value, it just emits the
  // chosen id and resets. Keyed so the Combobox clears its own trigger text.
  const [addKey, setAddKey] = useState(0)

  // A new bucket costs a day, so a full month has nowhere to put one. Blocked
  // rather than clamped to 0: a zero-day bucket is not a thing the server takes.
  const full = remaining < 1

  const add = (id: string) => {
    if (!id || readOnly || busy || full) return
    onChange([...rows, { id, daysCount: 1 }])
    setAddKey((k) => k + 1)
  }

  const patch = (id: string, daysCount: number) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, daysCount } : row)))

  const remove = (id: string) => onChange(rows.filter((row) => row.id !== id))

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
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const scheduled = scheduledOf(row.id)
            const meta = metaOf?.(row.id)
            // A count below what the sales incharge has already dated is the very thing
            // `schedule_mismatch` reports, and it blocks approve — so say it here
            // rather than letting him discover it after a save.
            const undercut = scheduled != null && scheduled > row.daysCount

            return (
              <li key={row.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
                    <span className="truncate">{nameOf(row.id)}</span>
                    {meta?.source === 'solver' ? (
                      <Hint label="Proposed by the solver when the month was generated.">
                        <span className="inline-flex shrink-0 cursor-default items-center gap-0.5 rounded-full bg-info/10 px-1.5 text-[10px] font-semibold text-info">
                          <Sparkles className="size-2.5" />
                          auto
                        </span>
                      </Hint>
                    ) : null}
                    {/* 0 beats is `city_without_beats`: the allocation was right
                        when it was made and the beat master moved under it. */}
                    {meta && meta.beats === 0 ? (
                      <Hint label="He no longer holds any beats in this city, so he cannot work these days. Fix the beat master, or move the days elsewhere.">
                        <span className="inline-flex shrink-0 cursor-default items-center gap-0.5 rounded-full bg-warning/15 px-1.5 text-[10px] font-semibold text-warning">
                          <TriangleAlert className="size-2.5" />
                          no beats
                        </span>
                      </Hint>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums text-muted-foreground">
                    {meta && meta.beats != null && meta.beats > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Store className="size-2.5" />
                        {meta.beats} beat{meta.beats === 1 ? '' : 's'}
                        {meta.outlets ? ` · ${meta.outlets} outlets` : ''}
                      </span>
                    ) : null}
                    {scheduled != null ? (
                      <span className={cn(undercut && 'font-medium text-warning')}>
                        {scheduled} scheduled
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* The ceiling is this row's own count plus whatever the month
                      has left, so no keystroke can carry the total past it — the
                      field snaps to the ceiling as you type. Over-allocating is
                      therefore unreachable from here; the header alert covers the
                      one case that isn't typed, a draft that arrived over.
                      Swapping two buckets' counts still works: lower one first,
                      which is what frees the days for the other. */}
                  <DayCountInput
                    value={row.daysCount}
                    max={row.daysCount + remaining}
                    invalid={over}
                    disabled={readOnly || busy}
                    ariaLabel={`Days for ${nameOf(row.id)}`}
                    onChange={(daysCount) => patch(row.id, daysCount)}
                  />
                  {!readOnly ? (
                    <Hint label="Remove this bucket">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(row.id)}
                        aria-label={`Remove ${nameOf(row.id)}`}
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
          ) : full ? (
            <p className="text-[11px] text-muted-foreground">
              {over
                ? 'The month is over-allocated — lower a count before adding anything.'
                : 'Every day of the month is allocated. Lower a count to free one up.'}
            </p>
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
