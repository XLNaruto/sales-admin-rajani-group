/**
 * State for the Journey Plan screen.
 *
 * The admin has **two separate write surfaces**, and they are separate on purpose
 * because the server treats them as opposites:
 *
 * - The **allocation** — day-counts per activity (optionally in a city) and per
 *   distributor. Editable everywhere except `approved`. Full replacements.
 * - The **schedule** — the sales incharge's calendar. Editable only from `submitted` onward,
 *   including after approval. A full replacement, so every date is sent.
 *
 * They therefore get their own drafts and their own Save buttons. Merging them
 * would produce a screen where one button is always half-refused.
 *
 * ── A date holds a LIST of work ────────────────────────────────────────────
 * The schedule draft is `date → entries[]`, not `date → one activity`. Each entry
 * is one piece of work — an activity, plus a distributor and its beats when the
 * activity needs them — and each spends one day from its own bucket. An entry
 * whose activity is still unset (`activityId: 0`) is a picker the admin has
 * opened and not answered; it lives in the draft and is dropped on save.
 *
 * Both responses are authoritative — the allocation's per-bucket `daysScheduled`
 * moves with a save, and the correction pass silently keeps locked dates — so the
 * screen re-reads what landed rather than assuming.
 *
 * The screen is addressed by `(incharge, month)` rather than by plan id alone, so
 * the month pager can find the *next* month's plan for the same person.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { toasterrormsg, toastsuccessmsg } from '@/lib/toast'
import { toastApiError } from '@/lib/api-toast'
import { useCan } from '@/features/permissions'
import { useCitySelect } from '@/features/location'
import {
  useActivities,
  useAllocatedBeats,
  useAllocationOptions,
  useApproveJourneyPlan,
  useJourneyPlanDetail,
  useJourneyPlanReps,
  usePublishJourneyPlan,
  useSaveAllocation,
  useSaveSchedule,
} from '../api/use-journey-plan-detail'
import { currentMonth, monthLabel, shiftMonth } from '../lib/journey-format'
import { takesCity } from '../lib/activities'
import { isLocked, planIssues } from '../lib/plan-flags'
import {
  chargeResolver,
  scheduledDays,
  type ChargeableEntry,
} from '../lib/scheduled-days'
import { liveStrip } from '../lib/live-strip'
import { planErrorHint } from '../lib/plan-errors'
import {
  canEditAllocation,
  canEditSchedule,
  isApprovable,
  isPublishable,
} from '../lib/plan-status'
import {
  bucketKey,
  sameIdSet,
  type BucketDraft,
} from '../lib/allocation-buckets'
import type { ScheduleDraftDay, ScheduleDraftEntry } from '../components/schedule-table'
import type { JourneyPlanDetail, ScheduleDayInput } from '../types'

/** Params the list hands over in the encrypted `?data=` token. */
interface PlanParams {
  /** Journey plan id, when the caller already knows it. */
  id?: string
  /** Sales incharge — survives a month step, unlike `id`. */
  inchargeId?: string
  /** `yyyy-MM`. */
  month?: string
}

/** The unsaved allocation edit, scoped to the plan it was made against. */
interface AllocationDraft {
  planId: string
  activities: BucketDraft[]
  distributors: BucketDraft[]
}

/** The unsaved calendar edit, scoped to the plan it was made against. */
interface ScheduleDraft {
  planId: string
  /** `date` → the day, or absent for a date carrying no row. */
  days: Map<string, ScheduleDraftDay>
}

/** The allocation as the server currently holds it. */
function serverActivityBuckets(plan: JourneyPlanDetail): BucketDraft[] {
  return plan.activityAllocations.map((bucket) => ({
    id: String(bucket.activityId),
    // Part of the bucket's identity, not a decoration — see `bucketKey`.
    cityId: bucket.cityId,
    // A set the bucket carries, unlike the city — see `BucketDraft`.
    distributorIds: bucket.distributors.map((row) => row.distributorId),
    dates: bucket.dates,
    daysCount: bucket.daysCount,
  }))
}

function serverDistributorBuckets(plan: JourneyPlanDetail): BucketDraft[] {
  return plan.distributorAllocations.map((bucket) => ({
    id: bucket.distributorId,
    daysCount: bucket.daysCount,
  }))
}

/**
 * The calendar as the server currently holds it.
 *
 * Entry and beat order are both preserved off `sequence` — the API mapper has
 * already sorted them — because the order IS the sales incharge's intended
 * walking order, and re-reading it any other way would quietly reshuffle his day
 * on the next save.
 */
function serverSchedule(plan: JourneyPlanDetail): Map<string, ScheduleDraftDay> {
  return new Map(
    plan.days.map((day) => [
      day.date,
      {
        entries: day.activities
          // Pinned work is deliberately NOT in the draft. The admin fixed it
          // from an allocation bucket's dates, the server keeps it whatever the
          // body says, and sending it back is a 400 `JOURNEY_PLAN_ENTRY_PINNED`.
          // Keeping it out of the draft is what makes both true by construction.
          .filter((entry) => !entry.pinned)
          .map((entry) => ({
            activityId: entry.activityId,
            distributorId: entry.distributorId,
            cityId: entry.cityId,
            beatIds: entry.beats.map((beat) => beat.beatId),
            // Order is the instruction here, so it is read off the entry as-is.
            distributorIds: entry.distributors.map((row) => row.distributorId),
          })),
      },
    ]),
  )
}

/** Same buckets, ignoring order. Keyed on the PAIR — see `bucketKey`. */
function sameBuckets(a: BucketDraft[], b: BucketDraft[]): boolean {
  if (a.length !== b.length) return false
  const map = new Map(b.map((bucket) => [bucketKey(bucket), bucket]))
  return a.every((bucket) => {
    const other = map.get(bucketKey(bucket))
    return (
      other != null &&
      other.daysCount === bucket.daysCount &&
      sameIdSet(other.distributorIds, bucket.distributorIds) &&
      sameIdSet(other.dates, bucket.dates)
    )
  })
}

/** Same piece of work — same activity, same distributor, same city, same beats in order. */
function sameEntry(a: ScheduleDraftEntry, b: ScheduleDraftEntry): boolean {
  if (a.activityId !== b.activityId) return false
  if ((a.distributorId ?? null) !== (b.distributorId ?? null)) return false
  if ((a.cityId ?? null) !== (b.cityId ?? null)) return false
  if (a.beatIds.length !== b.beatIds.length) return false
  if (!a.beatIds.every((id, i) => id === b.beatIds[i])) return false
  // Ordered, unlike the allocation's set: on an entry the order IS the
  // instruction, so a reshuffle is a real edit.
  if (a.distributorIds.length !== b.distributorIds.length) return false
  return a.distributorIds.every((id, i) => id === b.distributorIds[i])
}

/** Same calendar — same dates, each carrying the same work in the same order. */
function sameSchedule(
  a: Map<string, ScheduleDraftDay>,
  b: Map<string, ScheduleDraftDay>,
): boolean {
  if (a.size !== b.size) return false
  for (const [date, day] of a) {
    const other = b.get(date)
    if (!other) return false
    if (day.entries.length !== other.entries.length) return false
    // Order matters: it is the order he means to work the day in.
    if (day.entries.some((entry, i) => !sameEntry(entry, other.entries[i]!))) return false
  }
  return true
}

export function useJourneyPlan(data?: string) {
  const navigate = useNavigate()
  const { can } = useCan()
  /**
   * Three separate grants. **`journey-plan:approve` covers both transitions** —
   * publish and approve are one permission, at both ends of the chain.
   */
  const canUpdate = can('journey-plan:update')
  const canTransition = can('journey-plan:approve')
  const canUseAgent = can('journey-plan-agent:use')

  const params = useMemo<PlanParams>(
    () => (data ? (decryptParams<PlanParams>(data) ?? {}) : {}),
    [data],
  )
  const month = params.month ?? currentMonth()

  const [allocationDraft, setAllocationDraft] = useState<AllocationDraft | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /**
   * Which ENTRY's beat dialog is open, if any — a date can hold several, so the
   * date alone no longer identifies one.
   */
  const [beatTarget, setBeatTarget] = useState<{ date: string; index: number } | null>(
    null,
  )

  const reps = useJourneyPlanReps(month)

  /**
   * The sales incharge the screen was last actually ON — id, name and code.
   *
   * The sales incharge list is keyed by MONTH, so stepping to a month nobody has
   * a plan in returns an empty list: `rep` goes undefined and the header loses
   * the name of the person the admin is looking at, on the one screen where he is
   * stepping months to find that person's next plan. Remembered here so the
   * header keeps its identity across the gap, and merged back into the picker's
   * options below so its trigger still reads as a name rather than blank.
   */
  const [lastIncharge, setLastIncharge] = useState<{
    id: string
    name: string
    code: string | null
  } | null>(null)

  /**
   * Which plan the screen is on. The sales incharge list already carries each plan id, so
   * resolving from `(incharge, month)` costs no extra request — and it is the only
   * way a month step can land on the right one.
   */
  const rep = useMemo(() => {
    const list = reps.data ?? []
    if (params.inchargeId) return list.find((r) => r.inchargeId === params.inchargeId)
    if (params.id) return list.find((r) => r.journeyPlanId === params.id)
    return list[0]
  }, [reps.data, params.inchargeId, params.id])

  useEffect(() => {
    if (!rep) return
    setLastIncharge((previous) =>
      previous?.id === rep.inchargeId && previous.name === rep.inchargeName
        ? previous
        : {
            id: rep.inchargeId,
            name: rep.inchargeName,
            code: rep.employeeCode ?? null,
          },
    )
  }, [rep])

  const inchargeId = params.inchargeId ?? rep?.inchargeId
  // An id in the token wins: it is the list's deep link, and newer than a cached
  // sales incharge list. A month step drops the id precisely so this falls through.
  const planId = params.id ?? rep?.journeyPlanId ?? undefined

  const detail = useJourneyPlanDetail(planId)
  const plan = detail.data
  const status = plan?.status

  /** What each surface is allowed to write, from the status and the permission. */
  const allocationEditable = Boolean(canUpdate && status && canEditAllocation(status))
  const scheduleEditable = Boolean(canUpdate && status && canEditSchedule(status))

  /**
   * The allocation pickers — and the whitelist the Save enforces.
   *
   * Fetched for the sales incharge and period, not the plan, because that is how the endpoint
   * is keyed; skipped entirely once the allocation is frozen, since the only thing
   * it feeds is the editor.
   */
  const options = useAllocationOptions(inchargeId ?? plan?.inchargeId, month, {
    // Also while only the SCHEDULE is editable: a visit entry may name any
    // distributor his beats reach — not just the ones the admin allocated — and
    // this is the only list that carries those with their names.
    enabled: allocationEditable || scheduleEditable,
  })

  /**
   * The activity master — needed by the correction pass, which has to know whether
   * a day takes a city and beats. Distinct from `options.activities`, which is
   * narrowed to the allocatable rows and carries no `requires_beat`.
   */
  const activities = useActivities({
    enabled: scheduleEditable && can('activity:list'),
  })

  /** The beat pool for the correction pass, each beat with the distributors it serves. */
  const beatPool = useAllocatedBeats(inchargeId ?? plan?.inchargeId, {
    enabled: scheduleEditable && can('beat:list'),
  })

  /**
   * The city master, lazily paged and server-searched — the picker behind a
   * distributor-search bucket, and behind a search entry on the calendar.
   *
   * **The whole master, not the plan's own cities.** `allocation-options.cities`
   * suggests the ones his distributors already sit in, and that is exactly the
   * wrong list for this activity: a search is sending him somewhere he has
   * nobody YET. It also comes back empty wherever the distributor master carries
   * no city, which left the field unusable. The save accepts any real city.
   *
   * One instance shared by both editors: only one dropdown is open at a time, so
   * a second would just be a second copy of the same paged query.
   */
  const citySelect = useCitySelect(undefined, { alwaysEnabled: true })

  const saveAllocation = useSaveAllocation()
  const saveSchedule = useSaveSchedule()
  const publish = usePublishJourneyPlan()
  const approve = useApproveJourneyPlan()

  /* ── the allocation draft ────────────────────────────────────────────────── */

  const baseActivities = useMemo(() => (plan ? serverActivityBuckets(plan) : []), [plan])
  const baseDistributors = useMemo(
    () => (plan ? serverDistributorBuckets(plan) : []),
    [plan],
  )

  const liveAllocation =
    plan && allocationDraft?.planId === plan.id ? allocationDraft : null
  const activityBuckets = liveAllocation ? liveAllocation.activities : baseActivities
  const distributorBuckets = liveAllocation
    ? liveAllocation.distributors
    : baseDistributors

  const allocationDirty =
    Boolean(liveAllocation) &&
    (!sameBuckets(activityBuckets, baseActivities) ||
      !sameBuckets(distributorBuckets, baseDistributors))

  const editAllocation = useCallback(
    (next: { activities?: BucketDraft[]; distributors?: BucketDraft[] }) => {
      if (!plan || !allocationEditable) return
      setAllocationDraft((prev) => {
        const from = prev?.planId === plan.id ? prev : null
        return {
          planId: plan.id,
          activities: next.activities ?? from?.activities ?? serverActivityBuckets(plan),
          distributors:
            next.distributors ?? from?.distributors ?? serverDistributorBuckets(plan),
        }
      })
    },
    [plan, allocationEditable],
  )

  const setActivityBuckets = useCallback(
    (activities: BucketDraft[]) => editAllocation({ activities }),
    [editAllocation],
  )
  const setDistributorBuckets = useCallback(
    (distributors: BucketDraft[]) => editAllocation({ distributors }),
    [editAllocation],
  )

  /** Days the draft allocates, across both bucket sets. */
  const draftAllocatedDays = useMemo(
    () =>
      activityBuckets.reduce((sum, b) => sum + b.daysCount, 0) +
      distributorBuckets.reduce((sum, b) => sum + b.daysCount, 0),
    [activityBuckets, distributorBuckets],
  )

  /**
   * Calendar days in the month. `allocation-options` is the source while the
   * counts are editable; the plan's own progress covers the frozen months and the
   * window before the options land.
   */
  const totalDays = options.data?.totalDays ?? plan?.progress.totalDays ?? 0

  /**
   * Days promised beyond the month — **the one hard stop on this screen.**
   *
   * Everything else here is advisory (a short month is normal, a mismatched
   * schedule is a flag), but a month that promises more days than it holds cannot
   * be worked as written, so neither the Save nor the Publish will take it.
   */
  const draftOverBy = totalDays > 0 ? Math.max(0, draftAllocatedDays - totalDays) : 0

  /**
   * The same excess on what the SERVER holds. Publish reads the saved plan, not
   * the draft on screen, so it has to be gated on the saved figures.
   */
  const savedOverBy = Math.max(0, plan?.progress.allocationVariance ?? 0)

  /**
   * Which activities must name at least one distributor.
   *
   * Read off `requires_distributors`, **never off the code**: today only
   * `distributor_visit` sets it, and the flag is the client's to move per
   * activity. An id missing from the map is an activity the options never
   * offered, and nothing requires distributors of it.
   */
  const requiresDistributors = useMemo(
    () =>
      new Set(
        (options.data?.activities ?? [])
          .filter((activity) => activity.requiresDistributors)
          .map((activity) => String(activity.activityId)),
      ),
    [options.data?.activities],
  )

  /**
   * Search buckets with no city.
   *
   * **A client-side rule, not the API's** — the server takes a city-less search
   * happily. It is required here because "go and find a distributor, anywhere"
   * is not an instruction anyone can act on: the city IS the search.
   */
  const bucketsMissingCity = useMemo(() => {
    const codeOf = new Map<string, string>()
    for (const activity of options.data?.activities ?? []) {
      codeOf.set(String(activity.activityId), activity.code)
    }
    for (const bucket of plan?.activityAllocations ?? []) {
      if (bucket.activityCode) codeOf.set(String(bucket.activityId), bucket.activityCode)
    }
    return activityBuckets.filter(
      (bucket) => takesCity(codeOf.get(bucket.id)) && !bucket.cityId,
    ).length
  }, [activityBuckets, options.data?.activities, plan?.activityAllocations])

  /**
   * Visit buckets naming nobody — `JOURNEY_PLAN_ACTIVITY_DISTRIBUTORS_REQUIRED`.
   * A hard stop like the over-allocation: the server refuses the whole save.
   */
  const bucketsMissingDistributors = useMemo(
    () =>
      activityBuckets.filter(
        (bucket) =>
          requiresDistributors.has(bucket.id) && !(bucket.distributorIds?.length ?? 0),
      ).length,
    [activityBuckets, requiresDistributors],
  )

  /* ── the schedule draft ──────────────────────────────────────────────────── */

  const baseSchedule = useMemo(
    () => (plan ? serverSchedule(plan) : new Map<string, ScheduleDraftDay>()),
    [plan],
  )

  const liveSchedule = plan && scheduleDraft?.planId === plan.id ? scheduleDraft : null
  const schedule = liveSchedule ? liveSchedule.days : baseSchedule

  const scheduleDirty = Boolean(liveSchedule) && !sameSchedule(schedule, baseSchedule)

  const editSchedule = useCallback(
    (mutate: (days: Map<string, ScheduleDraftDay>) => void) => {
      if (!plan || !scheduleEditable) return
      setScheduleDraft((prev) => {
        const from = prev?.planId === plan.id ? prev : null
        const days = new Map(from?.days ?? serverSchedule(plan))
        mutate(days)
        return { planId: plan.id, days }
      })
    },
    [plan, scheduleEditable],
  )

  const activityById = useMemo(
    () => new Map((activities.data ?? []).map((activity) => [activity.id, activity])),
    [activities.data],
  )

  /**
   * What the calendar on screen currently spends, per bucket.
   *
   * Live, and it has to be: both editors are on one screen, so the allocation's
   * "N scheduled" line and its mismatch warning would otherwise report the last
   * SAVED calendar while the admin is busy changing it above them.
   *
   * Pinned work is counted from the plan: it is deliberately absent from the
   * draft (see `serverSchedule`), but it is real dated work spending real days.
   */
  const scheduledByBucket = useMemo(() => {
    const entries: ChargeableEntry[] = []
    for (const [date, day] of schedule) {
      for (const entry of day.entries) entries.push({ ...entry, date })
    }
    for (const day of plan?.days ?? []) {
      for (const entry of day.activities) {
        if (entry.pinned) entries.push({ ...entry, date: day.date })
      }
    }
    return scheduledDays(entries, activityBuckets)
  }, [schedule, plan, activityBuckets])

  /**
   * Edit one ENTRY of a date, in place. A date with nothing left on it is deleted
   * outright, because an empty `entries` list is refused by the server and an
   * omitted date is how you clear one.
   */
  const editEntry = useCallback(
    (
      date: string,
      index: number,
      mutate: (entries: ScheduleDraftEntry[]) => void,
    ) => {
      editSchedule((days) => {
        const entries = [...(days.get(date)?.entries ?? [])]
        if (index > entries.length) return
        mutate(entries)
        if (entries.length === 0) days.delete(date)
        else days.set(date, { entries })
      })
    },
    [editSchedule],
  )

  /**
   * Set an entry's activity — and, at `index === entries.length`, create it.
   *
   * The shape follows the activity master, because the server refuses the wrong
   * pairing outright: an activity that **requires a beat** carries a distributor
   * and beats and has its city derived from them, and one that does not carries
   * neither and may carry a city of its own. Switching between the two kinds
   * therefore drops what no longer applies rather than leaving a body that will
   * be rejected.
   *
   * Clearing the activity (`0`) removes the entry.
   */
  const setEntryActivity = useCallback(
    (date: string, index: number, activityId: number) => {
      editEntry(date, index, (entries) => {
        if (!activityId) {
          entries.splice(index, 1)
          return
        }
        const activity = activityById.get(activityId)
        const takesBeats = activity?.requiresBeat ?? true
        const takesVisits = Boolean(activity?.requiresDistributors)
        const previous = entries[index]
        entries[index] = {
          activityId,
          distributorId: takesBeats ? (previous?.distributorId ?? null) : null,
          // Derived server-side on a field entry, so there is nothing to keep.
          cityId: takesBeats ? null : (previous?.cityId ?? null),
          beatIds: takesBeats ? (previous?.beatIds ?? []) : [],
          // Dropped the moment the work stops being a visit: the API refuses
          // targets on an activity that takes none.
          distributorIds: takesVisits ? (previous?.distributorIds ?? []) : [],
        }
      })
    },
    [editEntry, activityById],
  )

  /**
   * Move an entry to another distributor.
   *
   * Every beat on it is dropped: a beat must serve its entry's distributor, so
   * keeping them would build a body the server refuses beat by beat.
   */
  const setEntryDistributor = useCallback(
    (date: string, index: number, distributorId: string | null) => {
      editEntry(date, index, (entries) => {
        const previous = entries[index]
        if (!previous || previous.distributorId === distributorId) return
        entries[index] = { ...previous, distributorId, beatIds: [] }
      })
    },
    [editEntry],
  )

  /**
   * Who a visit entry calls on, in the order he means to.
   *
   * Order is stored, so this replaces the whole list rather than merging into a
   * set the way the allocation bucket does.
   */
  const setEntryDistributors = useCallback(
    (date: string, index: number, distributorIds: string[]) => {
      editEntry(date, index, (entries) => {
        const previous = entries[index]
        if (!previous) return
        entries[index] = { ...previous, distributorIds }
      })
    },
    [editEntry],
  )

  /** The optional WHERE on a beatless entry. Never read on a field entry. */
  const setEntryCity = useCallback(
    (date: string, index: number, cityId: string | null) => {
      editEntry(date, index, (entries) => {
        const previous = entries[index]
        if (!previous) return
        entries[index] = { ...previous, cityId }
      })
    },
    [editEntry],
  )

  const setEntryBeats = useCallback(
    (date: string, index: number, beatIds: string[]) => {
      editEntry(date, index, (entries) => {
        const previous = entries[index]
        if (!previous) return
        entries[index] = { ...previous, beatIds }
      })
    },
    [editEntry],
  )

  const removeEntry = useCallback(
    (date: string, index: number) =>
      editEntry(date, index, (entries) => void entries.splice(index, 1)),
    [editEntry],
  )

  /**
   * Give an allocation bucket a date, or take one off it — **writing the
   * calendar**, from the allocation editor above it.
   *
   * This is what makes the two panels one story rather than two. The bucket's
   * date picker shows the dates the bucket actually holds, so the gesture that
   * removes one there has to remove the day itself; pinning instead would leave
   * the day on the calendar and add a second, stronger promise beside it.
   *
   * A date is either held or not, so removing takes off EVERY entry on the date
   * charged to the bucket — and the charging rule is the shared resolver, never a
   * second copy of it, or a doubled-up date would be counted here and missed
   * there. A date left with nothing on it is deleted outright: an empty entry
   * list is refused by the server, and an omitted date is how one is cleared.
   *
   * Pins are NOT touched. They are the admin's own promise and the allocation's
   * Save owns them — the picker removes those through `setActivityBuckets`.
   */
  const toggleBucketDate = useCallback(
    (bucket: BucketDraft, date: string, on: boolean) => {
      editSchedule((days) => {
        const entries = [...(days.get(date)?.entries ?? [])]

        if (on) {
          entries.push({
            activityId: Number(bucket.id),
            // An allocatable activity is never field selling, so there is no
            // distributor to charge and no beat to walk. The city is the bucket's
            // own — it is part of its identity, and the entry has to carry it or
            // the day comes back charged to a different bucket.
            distributorId: null,
            cityId: bucket.cityId ?? null,
            beatIds: [],
            // A visit calls on the bucket's own distributors. Required on one,
            // refused on anything else — which is exactly what the bucket holds.
            distributorIds: bucket.distributorIds ?? [],
          })
        } else {
          const chargedTo = chargeResolver(activityBuckets)
          const key = bucketKey(bucket)
          const kept = entries.filter((entry) => {
            const charge = chargedTo(entry)
            return !(charge?.side === 'activity' && charge.key === key)
          })
          if (kept.length === entries.length) return
          entries.splice(0, entries.length, ...kept)
        }

        if (entries.length === 0) days.delete(date)
        else days.set(date, { entries })
      })
    },
    [editSchedule, activityBuckets],
  )

  const clearDay = useCallback(
    (date: string) => editSchedule((days) => void days.delete(date)),
    [editSchedule],
  )

  /* ── navigation ──────────────────────────────────────────────────────────── */

  /** Throw both drafts away and fall back to what the server holds. */
  const discardAllocation = useCallback(() => {
    setAllocationDraft(null)
    setNotice(null)
  }, [])

  const discardSchedule = useCallback(() => {
    setScheduleDraft(null)
    setNotice(null)
  }, [])

  /** Point the screen at another (incharge, month). Any draft is abandoned. */
  const open = useCallback(
    (next: { id?: string; inchargeId?: string; month: string }) => {
      setAllocationDraft(null)
      setScheduleDraft(null)
      setNotice(null)
      // The dialog is addressed by (date, index) into a schedule that is about to
      // be replaced — leaving it set would reopen it over another man's month.
      setBeatTarget(null)
      navigate({
        to: '/journey/plan',
        search: { data: encryptParams(next) },
        replace: true,
      })
    },
    [navigate],
  )

  const selectIncharge = useCallback(
    (id: string) => {
      if (!id || id === inchargeId) return
      const target = (reps.data ?? []).find((r) => r.inchargeId === id)
      open({ inchargeId: id, id: target?.journeyPlanId ?? undefined, month })
    },
    [inchargeId, reps.data, month, open],
  )

  const selectMonth = useCallback(
    (next: string) => {
      if (!next || next === month) return
      // No plan id: the next month's is unknown until its sales incharge list arrives, and
      // that lookup is exactly what `rep` above does.
      open({ inchargeId: inchargeId ?? undefined, month: next })
    },
    [month, inchargeId, open],
  )

  /**
   * An activity id as the admin sees it, for the refusal hints — the options
   * first, the plan's own buckets second, and the master last.
   */
  const activityNameOf = useCallback(
    (activityId: number): string | undefined =>
      options.data?.activities.find((activity) => activity.activityId === activityId)
        ?.name ??
      plan?.activityAllocations.find((bucket) => bucket.activityId === activityId)
        ?.activityName ??
      activities.data?.find((activity) => activity.id === activityId)?.name,
    [options.data?.activities, plan?.activityAllocations, activities.data],
  )

  /* ── the writes ──────────────────────────────────────────────────────────── */

  /**
   * Save the allocation. Both bucket sets go together, since one screen edits both
   * and each is a full replacement of what it covers.
   *
   * A save under a schedule that no longer fits is allowed and leaves a
   * `schedule_mismatch` flag rather than deleting the sales incharge's work — so the notice
   * says so when the plan already has a schedule to mismatch.
   */
  const submitAllocation = useCallback(() => {
    if (!plan || !planId || !allocationEditable || !allocationDirty) return

    // Refused rather than warned: the counts cannot be worked as written, and a
    // saved over-allocation is what would then block the publish.
    if (draftOverBy > 0) {
      toasterrormsg(
        `The counts promise ${draftAllocatedDays} days in a ${totalDays}-day month. Remove ${draftOverBy} day${
          draftOverBy === 1 ? '' : 's'
        } before saving.`,
      )
      return
    }

    if (bucketsMissingCity > 0) {
      toasterrormsg(
        bucketsMissingCity === 1
          ? 'One distributor search names no city. A search is a city — pick one, or remove the row.'
          : `${bucketsMissingCity} distributor searches name no city. A search is a city — pick one on each, or remove the rows.`,
      )
      return
    }

    // The other hard stop: an activity flagged `requires_distributors` has to
    // name at least one, or the save comes back a 400 for the whole month.
    if (bucketsMissingDistributors > 0) {
      toasterrormsg(
        bucketsMissingDistributors === 1
          ? 'One activity still names no distributor. Pick at least one, or remove the row.'
          : `${bucketsMissingDistributors} activities still name no distributor. Pick at least one on each, or remove the rows.`,
      )
      return
    }

    saveAllocation.mutate(
      {
        planId,
        activityAllocations: activityBuckets.map((bucket) => ({
          activityId: Number(bucket.id),
          cityId: bucket.cityId ?? null,
          distributorIds: bucket.distributorIds ?? [],
          dates: bucket.dates ?? [],
          daysCount: bucket.daysCount,
        })),
        distributorAllocations: distributorBuckets.map((bucket) => ({
          distributorId: bucket.id,
          daysCount: bucket.daysCount,
        })),
      },
      {
        onSuccess: (saved) => {
          setAllocationDraft(null)
          const mismatch = saved.flags.some((flag) => flag.code === 'schedule_mismatch')
          const over = saved.progress.allocationVariance
          setNotice(
            mismatch
              ? 'Saved. The sales incharge’s schedule no longer matches these counts — his work was kept rather than discarded, and the difference is flagged for you to judge. Nothing is blocked.'
              : // Only an OVER-allocation is worth a word. Being short of the
                // month is the ordinary case: the rest of it is his to fill.
                over > 0
                ? `Saved. The counts promise ${over} day${
                    over === 1 ? '' : 's'
                  } more than the month holds — he can only fit that by doubling dates up.`
                : null,
          )
          toastsuccessmsg('Allocation saved.')
        },
        // The server's message states the rule; the hint names the row it is
        // about, which is what a screen with thirty buckets on it actually needs.
        onError: (error) => {
          const hint = planErrorHint(error, activityNameOf)
          if (hint) toasterrormsg(hint)
          else toastApiError(error, 'Failed to save the allocation.')
        },
      },
    )
  }, [
    plan,
    planId,
    allocationEditable,
    allocationDirty,
    activityBuckets,
    distributorBuckets,
    saveAllocation,
    draftOverBy,
    draftAllocatedDays,
    totalDays,
    bucketsMissingDistributors,
    bucketsMissingCity,
    activityNameOf,
  ])

  /**
   * Save the corrected calendar.
   *
   * A **full replacement**: every date in the draft goes, including the locked ones
   * — the server skips those rather than rejecting them, and omitting a date is how
   * you delete it. So the response is re-read to report the dates that did not move.
   */
  const submitSchedule = useCallback(() => {
    if (!plan || !planId || !scheduleEditable || !scheduleDirty) return

    const days: ScheduleDayInput[] = [...schedule.entries()]
      // Sorted by date: `yyyy-MM-dd` sorts lexicographically, and a chronological
      // body is what makes a failed request's `details` readable.
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, day]) => ({
        date,
        entries: day.entries
          // Belt and braces: the table's trailing picker is render-only and never
          // reaches the draft, so nothing here should be activity-less. The server
          // has no shape for one, and a stray would fail the whole month's save
          // rather than the row that caused it.
          .filter((entry) => entry.activityId > 0)
          .map((entry) => ({
            activityId: entry.activityId,
            distributorId: entry.distributorId,
            cityId: entry.cityId,
            beatIds: entry.beatIds,
            distributorIds: entry.distributorIds,
          })),
      }))
      // A date left with nothing on it is a cleared date, and a cleared date is
      // one that is simply absent from the body.
      .filter((day) => day.entries.length > 0)

    saveSchedule.mutate(
      { planId, days },
      {
        onSuccess: (saved) => {
          setScheduleDraft(null)
          const landed = serverSchedule(saved)
          // A date whose entries did not change is one the server skipped — it is
          // locked, and kept as history.
          const held = days.filter((day) => {
            const after = landed.get(day.date)
            if (!after || after.entries.length !== day.entries.length) return true
            return after.entries.some(
              (entry, i) => entry.activityId !== day.entries[i]!.activityId,
            )
          })
          setNotice(
            held.length
              ? `Saved. ${held.length} date${held.length === 1 ? '' : 's'} did not change (${held
                  .map((day) => day.date)
                  .join(', ')}) — a visit has already landed on ${
                  held.length === 1 ? 'it' : 'them'
                }, so the server keeps ${held.length === 1 ? 'it' : 'them'} as history.`
              : null,
          )
          toastsuccessmsg('Schedule saved.')
        },
        onError: (error) => {
          const hint = planErrorHint(error, activityNameOf)
          if (hint) toasterrormsg(hint)
          else toastApiError(error, 'Failed to save the schedule.')
        },
      },
    )
  }, [
    plan,
    planId,
    scheduleEditable,
    scheduleDirty,
    schedule,
    saveSchedule,
    activityNameOf,
  ])

  /**
   * Publish — `draft` → `published`, releasing the month to the sales incharge.
   *
   * Gated on the server's own `canPublish` — which asks only that the draft has a
   * bucket on it — and never on a recomputed variance: a partial month is the
   * normal thing to publish. One-way; there is no unpublish.
   */
  const submitPublish = useCallback(() => {
    if (!planId || !canTransition) return
    if (savedOverBy > 0) {
      toasterrormsg(
        `This month allocates ${savedOverBy} day${
          savedOverBy === 1 ? '' : 's'
        } more than it holds. Bring the counts within the month before publishing.`,
      )
      return
    }
    publish.mutate(planId, {
      onSuccess: (result) => {
        setNotice(null)
        toastsuccessmsg(
          `Published — the sales incharge can now see ${monthLabel(month)}, date his ${
            result.daysAllocated
          } allocated days and fill the rest of the month himself.`,
        )
      },
      // The 400 names the shortfall, and the 409 says it is not a draft.
      onError: (error) => toastApiError(error, 'Failed to publish the plan.'),
    })
  }, [planId, canTransition, publish, month, savedOverBy])

  /**
   * Approve — `submitted` → `approved`.
   *
   * The counts are not re-checked: whatever he built is what he submits, and any
   * variance is a flag above rather than a refusal. There is **no reject** — an
   * admin who dislikes the schedule corrects it and approves.
   */
  const submitApprove = useCallback(() => {
    if (!planId || !canTransition) return
    approve.mutate(planId, {
      onSuccess: () => {
        setNotice(null)
        toastsuccessmsg(
          'Approved. You can still correct the calendar — that does not reopen the cycle.',
        )
      },
      onError: (error) => toastApiError(error, 'Failed to approve the plan.'),
    })
  }, [planId, canTransition, approve])

  /* ── derived ─────────────────────────────────────────────────────────────── */

  const issues = useMemo(() => (plan ? planIssues(plan) : []), [plan])

  /**
   * Distributors an entry may be assigned to: **the ones this plan allocates**,
   * plus any the schedule already uses.
   *
   * Scheduling onto an unallocated distributor is legal — it is the sales
   * incharge's own work, reported as `schedule_unallocated` and blocking nothing —
   * but the picker leads with the allocation, because that is what the admin
   * promised and what the counts are measured against.
   */
  const distributorOptions = useMemo(
    () =>
      (plan?.distributorAllocations ?? []).map((bucket) => ({
        value: bucket.distributorId,
        label: bucket.distributorName ?? `Distributor ${bucket.distributorId}`,
        hint: `${bucket.daysScheduled} of ${bucket.daysCount} days used`,
        badge: bucket.beatCount ? `${bucket.beatCount} beats` : undefined,
      })),
    [plan?.distributorAllocations],
  )

  /**
   * Who a VISIT entry may call on — every distributor his beats reach.
   *
   * Deliberately a different list from `distributorOptions` above: that one is
   * the distributor BUCKETS, which is what a field day is charged to. A visit is
   * an office call on anyone he can reach, allocated or not (see the schedule
   * save's rules), so narrowing it to the buckets would hide most of them.
   * Falls back to the buckets while the options are in flight.
   */
  const visitDistributorOptions = useMemo(() => {
    const reachable = options.data?.distributors ?? []
    if (reachable.length === 0) return distributorOptions
    return reachable.map((distributor) => ({
      value: distributor.distributorId,
      label: distributor.distributorName ?? `Distributor ${distributor.distributorId}`,
      badge: distributor.beatCount ? `${distributor.beatCount} beats` : undefined,
      hint: distributor.cityName ?? undefined,
    }))
  }, [options.data?.distributors, distributorOptions])

  /**
   * Every city id this plan already names, with the name the SERVER gave it.
   *
   * The picker below is paged and search-filtered, so a city already on the plan
   * is very often absent from the loaded page — and a Combobox whose value
   * matches no option renders an empty trigger. These are merged in as options so
   * a saved city always reads as its name.
   */
  const knownCityNames = useMemo(() => {
    const map = new Map<string, string>()
    // Only where the server actually NAMED it. A `City 173` stand-in built from
    // the id used to be merged in here, and being a real option it won every
    // lookup — so a bucket whose `city_name` came back null rendered its primary
    // key at the admin, in a field he had picked "Junagadh" in.
    for (const bucket of plan?.activityAllocations ?? []) {
      if (bucket.cityId && bucket.cityName) map.set(bucket.cityId, bucket.cityName)
    }
    for (const day of plan?.days ?? []) {
      for (const entry of day.activities) {
        if (entry.cityId && entry.cityName) map.set(entry.cityId, entry.cityName)
      }
    }
    return map
  }, [plan?.activityAllocations, plan?.days])

  /** The city picker, ready to spread onto a `<Combobox>`. */
  const city = useMemo(() => {
    const loaded = new Set(citySelect.options.map((option) => option.value))
    return {
      ...citySelect,
      options: [
        ...citySelect.options,
        ...[...knownCityNames]
          .filter(([id]) => !loaded.has(id))
          .map(([value, label]) => ({ value, label })),
      ],
    }
  }, [citySelect, knownCityNames])

  /**
   * The beat pool for the open entry, narrowed to **the beats serving its
   * distributor**.
   *
   * This is the rule that replaced beat-sits-in-the-day's-city, and it is
   * stricter: a beat mapped to no distributor at all is offered by neither, since
   * there would be no bucket to charge the day to. Fixing that is a beat-master
   * job, not a scheduling one.
   */
  const beatsForOpenEntry = useMemo(() => {
    if (!beatTarget) return []
    const entry = schedule.get(beatTarget.date)?.entries[beatTarget.index]
    const distributorId = entry?.distributorId
    if (!distributorId) return []
    return (beatPool.data ?? []).filter((beat) =>
      beat.distributorIds.includes(distributorId),
    )
  }, [beatTarget, schedule, beatPool.data])

  /**
   * Beat id → name, for the schedule's chips.
   *
   * The saved day names its own beats, but a beat just added in the dialog is not
   * on it yet — and after a fresh page load the plan is the only source for beats
   * the pool no longer carries. Both go in, the pool last, since it is the master.
   */
  const beatNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const day of plan?.days ?? []) {
      for (const entry of day.activities) {
        for (const beat of entry.beats) map.set(beat.beatId, beat.beatName)
      }
    }
    for (const beat of beatPool.data ?? []) map.set(beat.id, beat.name)
    return map
  }, [plan?.days, beatPool.data])

  /**
   * Distributor id → name, for the schedule's read-only rows.
   *
   * The plan's allocations seed it and the saved entries fill the gaps: an entry
   * on a distributor the admin has since removed from the allocation still has to
   * render as a name rather than an id.
   */
  const distributorNames = useMemo(() => {
    const map = new Map<string, string>()
    // The reachable master first, so a name exists for anyone pickable — the
    // visit pickers offer far more than the plan itself ever names.
    for (const distributor of options.data?.distributors ?? []) {
      if (distributor.distributorName) {
        map.set(distributor.distributorId, distributor.distributorName)
      }
    }
    for (const bucket of plan?.distributorAllocations ?? []) {
      if (bucket.distributorName) map.set(bucket.distributorId, bucket.distributorName)
    }
    // Visit targets, on the buckets and on the dated entries. These are the ones
    // the master can lose — a distributor that has left his beats since.
    for (const bucket of plan?.activityAllocations ?? []) {
      for (const row of bucket.distributors) {
        if (row.distributorName) map.set(row.distributorId, row.distributorName)
      }
    }
    for (const day of plan?.days ?? []) {
      for (const entry of day.activities) {
        if (entry.distributorId && entry.distributorName) {
          map.set(entry.distributorId, entry.distributorName)
        }
        for (const row of entry.distributors) {
          if (row.distributorName) map.set(row.distributorId, row.distributorName)
        }
      }
    }
    return map
  }, [
    options.data?.distributors,
    plan?.distributorAllocations,
    plan?.activityAllocations,
    plan?.days,
  ])

  /**
   * The header's sales incharge picker.
   *
   * The month's own list, plus the person the screen is on when that list does
   * not carry him — which is exactly the empty month: a Combobox whose value
   * matches no option renders an empty trigger, and the admin would be looking
   * at a screen that no longer says whose month it is.
   */
  const inchargePicker = useMemo(() => {
    const options = (reps.data ?? []).map((r) => ({
      value: r.inchargeId,
      label: r.inchargeName,
      badge: r.employeeCode ? `#${r.employeeCode}` : undefined,
    }))
    const current = inchargeId ?? lastIncharge?.id ?? ''
    if (current && !options.some((option) => option.value === current)) {
      const known = lastIncharge?.id === current ? lastIncharge : null
      options.unshift({
        value: current,
        label: known?.name ?? 'This sales incharge',
        badge: known?.code ? `#${known.code}` : undefined,
      })
    }
    return {
      options,
      loading: reps.isFetching,
      value: current,
      onChange: selectIncharge,
    }
  }, [reps.data, reps.isFetching, inchargeId, lastIncharge, selectIncharge])

  /**
   * The calendar's labels, recomputed from what is on screen — see `liveStrip`.
   *
   * The strip is what the table draws its rows from, so this is what keeps the
   * two editors telling the admin the same story between saves.
   */
  const strip = useMemo(() => {
    if (!plan) return []
    const pinnedDates = new Set(
      plan.days
        .filter((day) => day.activities.some((entry) => entry.pinned))
        .map((day) => day.date),
    )
    const allocationDates = new Set(
      activityBuckets.flatMap((bucket) => bucket.dates ?? []),
    )
    return liveStrip(plan.monthStrip, schedule, pinnedDates, allocationDates)
  }, [plan, schedule, activityBuckets])

  /** Dates that survive the correction pass whatever is sent. */
  const lockedDates = useMemo(
    () => new Set((plan?.days ?? []).filter(isLocked).map((day) => day.date)),
    [plan],
  )

  return {
    plan,
    planId,
    status,
    isLoading: detail.isLoading || reps.isLoading,
    /**
     * The sales incharge list is still in flight, so the header's picker and month pager have
     * nothing to render yet. Split from `isLoading` on purpose: those two controls
     * are driven by the sales incharge list, not by the plan, so once this is false they can go
     * live while the month behind them is still loading.
     */
    isLoadingReps: reps.isLoading,
    /**
     * Either read failing is fatal for the screen, and the page MUST render it: a
     * failed detail leaves `plan` undefined forever, so a page that only checks
     * `isLoading || !plan` spins on a dead query instead of saying what broke.
     */
    error: detail.error ?? reps.error,
    /** Re-run both reads — what the error screen's "Try again" is wired to. */
    retry: () => {
      void reps.refetch()
      void detail.refetch()
    },
    /**
     * No plan exists for this (incharge, month) — the screen shows an empty state.
     * Never claimed while a read is failing: a broken sales incharge list also yields no
     * `planId`, and "nothing was generated" would be a lie about a 500.
     */
    missing:
      !detail.isLoading && !reps.isLoading && !detail.error && !reps.error && !planId,
    /** The sales incharge the screen is on, when it knows — the create dialog's seed. */
    inchargeId,
    /** Combobox props for the header's incharge picker, plus its current value. */
    incharge: inchargePicker,
    month,
    monthLabel: monthLabel(month),
    prevMonth: () => selectMonth(shiftMonth(month, -1)),
    nextMonth: () => selectMonth(shiftMonth(month, 1)),
    selectMonth,

    /* the allocation */
    allocationOptions: options.data,
    isLoadingOptions: options.isLoading,
    activityBuckets,
    distributorBuckets,
    setActivityBuckets,
    setDistributorBuckets,
    draftAllocatedDays,
    totalDays,
    /** Days the DRAFT promises beyond the month — blocks the allocation Save. */
    draftOverBy,
    /** The same excess on the SAVED plan — blocks the publish. */
    savedOverBy,
    /** Visit buckets naming nobody — also blocks the allocation Save. */
    bucketsMissingDistributors,
    /** Search buckets with no city — a client-side rule, also blocking. */
    bucketsMissingCity,
    /** Activity ids that must name a distributor, off the master's own flag. */
    requiresDistributors,
    allocationDirty,
    allocationEditable,
    discardAllocation,
    submitAllocation,
    isSavingAllocation: saveAllocation.isPending,

    /* the schedule */
    schedule,
    /**
     * The month's dates with LIVE labels — draw the calendar from this, never
     * from `plan.monthStrip`, which only moves when a save lands.
     */
    strip,
    scheduledByBucket,
    beatNames,
    distributorNames,
    activities: activities.data ?? [],
    distributorOptions,
    /** Who a visit may call on — every distributor his beats reach, named. */
    visitDistributorOptions,
    /** The city picker — shared by both editors, and only offered on a search. */
    city,
    setEntryActivity,
    setEntryDistributor,
    setEntryDistributors,
    setEntryCity,
    setEntryBeats,
    /**
     * The allocation editor's own write into the calendar — see
     * `toggleBucketDate`. Only offered while the calendar is editable; before
     * that the picker can only pin.
     */
    toggleBucketDate: scheduleEditable ? toggleBucketDate : undefined,
    removeEntry,
    clearDay,
    scheduleDirty,
    scheduleEditable,
    discardSchedule,
    submitSchedule,
    isSavingSchedule: saveSchedule.isPending,
    lockedDates,
    /** The per-ENTRY beat dialog — a date can hold several. */
    beatTarget,
    openBeatDialog: setBeatTarget,
    beatsForOpenEntry,

    /* the transitions — one permission, both ends */
    canTransition,
    showPublish: Boolean(status && isPublishable(status)),
    showApprove: Boolean(status && isApprovable(status)),
    /** The server's verdicts, never re-derived from the flags. */
    canPublish: Boolean(plan?.canPublish) && savedOverBy === 0,
    canApprove: Boolean(plan?.canApprove),
    submitPublish,
    submitApprove,
    isPublishing: publish.isPending,
    isApproving: approve.isPending,

    issues,
    notice,
    dismissNotice: () => setNotice(null),
    /** Permission gates for the editors and the assistant. */
    canUpdate,
    canUseAgent,
  }
}
