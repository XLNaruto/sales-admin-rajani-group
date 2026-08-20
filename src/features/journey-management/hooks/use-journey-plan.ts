/**
 * State for the Journey Plan screen.
 *
 * The admin has **two separate write surfaces**, and they are separate on purpose
 * because the server treats them as opposites:
 *
 * - The **allocation** — day-counts per activity and per city. Editable everywhere
 *   except `approved`. Full replacements.
 * - The **schedule** — the sales incharge's calendar. Editable only from `submitted` onward,
 *   including after approval. A full replacement, so every date is sent.
 *
 * They therefore get their own drafts and their own Save buttons. Merging them
 * would produce a screen where one button is always half-refused.
 *
 * Both responses are authoritative — the allocation's per-bucket `daysScheduled`
 * and the variance move with a save, and the correction pass silently keeps locked
 * dates — so the screen re-reads what landed rather than assuming.
 *
 * The screen is addressed by `(incharge, month)` rather than by plan id alone, so
 * the month pager can find the *next* month's plan for the same person.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { toastsuccessmsg } from '@/lib/toast'
import { toastApiError } from '@/lib/api-toast'
import { useCan } from '@/features/permissions'
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
import { isLocked, planIssues } from '../lib/plan-flags'
import {
  canEditAllocation,
  canEditSchedule,
  isApprovable,
  isPublishable,
} from '../lib/plan-status'
import type { BucketDraft } from '../components/allocation-editor'
import type { ScheduleDraftDay } from '../components/schedule-table'
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
  cities: BucketDraft[]
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
    daysCount: bucket.daysCount,
  }))
}

function serverCityBuckets(plan: JourneyPlanDetail): BucketDraft[] {
  return plan.cityAllocations.map((bucket) => ({
    id: bucket.cityId,
    daysCount: bucket.daysCount,
  }))
}

/**
 * The calendar as the server currently holds it.
 *
 * Beat order is preserved off `sequence`: `beat_ids` order **is** the intended
 * order, so re-reading them in array order would quietly reshuffle the sales incharge's day
 * on the next save.
 */
function serverSchedule(plan: JourneyPlanDetail): Map<string, ScheduleDraftDay> {
  return new Map(
    plan.days.map((day) => [
      day.date,
      {
        activityId: day.activityId,
        cityId: day.cityId,
        beatIds: [...day.beats]
          .sort((a, b) => a.sequence - b.sequence)
          .map((beat) => beat.beatId),
      },
    ]),
  )
}

/** Same buckets, ignoring order. */
function sameBuckets(a: BucketDraft[], b: BucketDraft[]): boolean {
  if (a.length !== b.length) return false
  const map = new Map(b.map((bucket) => [bucket.id, bucket.daysCount]))
  return a.every((bucket) => map.get(bucket.id) === bucket.daysCount)
}

/** Same calendar — same dates, same activity, same city, same beats in order. */
function sameSchedule(
  a: Map<string, ScheduleDraftDay>,
  b: Map<string, ScheduleDraftDay>,
): boolean {
  if (a.size !== b.size) return false
  for (const [date, day] of a) {
    const other = b.get(date)
    if (!other) return false
    if (day.activityId !== other.activityId) return false
    if ((day.cityId ?? null) !== (other.cityId ?? null)) return false
    if (day.beatIds.length !== other.beatIds.length) return false
    if (day.beatIds.some((id, i) => id !== other.beatIds[i])) return false
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
  /** Which date's beat dialog is open, if any. */
  const [beatDate, setBeatDate] = useState<string | null>(null)

  const reps = useJourneyPlanReps(month)

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
    enabled: allocationEditable,
  })

  /**
   * The activity master — needed by the correction pass, which has to know whether
   * a day takes a city and beats. Distinct from `options.activities`, which is
   * narrowed to the allocatable rows and carries no `requires_beat`.
   */
  const activities = useActivities({
    enabled: scheduleEditable && can('activity:list'),
  })

  /** The beat pool for the correction pass, each beat with the city it sits in. */
  const beatPool = useAllocatedBeats(inchargeId ?? plan?.inchargeId, {
    enabled: scheduleEditable && can('beat:list'),
  })

  const saveAllocation = useSaveAllocation()
  const saveSchedule = useSaveSchedule()
  const publish = usePublishJourneyPlan()
  const approve = useApproveJourneyPlan()

  /* ── the allocation draft ────────────────────────────────────────────────── */

  const baseActivities = useMemo(() => (plan ? serverActivityBuckets(plan) : []), [plan])
  const baseCities = useMemo(() => (plan ? serverCityBuckets(plan) : []), [plan])

  const liveAllocation =
    plan && allocationDraft?.planId === plan.id ? allocationDraft : null
  const activityBuckets = liveAllocation ? liveAllocation.activities : baseActivities
  const cityBuckets = liveAllocation ? liveAllocation.cities : baseCities

  const allocationDirty =
    Boolean(liveAllocation) &&
    (!sameBuckets(activityBuckets, baseActivities) ||
      !sameBuckets(cityBuckets, baseCities))

  const editAllocation = useCallback(
    (next: { activities?: BucketDraft[]; cities?: BucketDraft[] }) => {
      if (!plan || !allocationEditable) return
      setAllocationDraft((prev) => {
        const from = prev?.planId === plan.id ? prev : null
        return {
          planId: plan.id,
          activities: next.activities ?? from?.activities ?? serverActivityBuckets(plan),
          cities: next.cities ?? from?.cities ?? serverCityBuckets(plan),
        }
      })
    },
    [plan, allocationEditable],
  )

  const setActivityBuckets = useCallback(
    (activities: BucketDraft[]) => editAllocation({ activities }),
    [editAllocation],
  )
  const setCityBuckets = useCallback(
    (cities: BucketDraft[]) => editAllocation({ cities }),
    [editAllocation],
  )

  /** Days the draft allocates, against the month — the variance publish gates on. */
  const draftAllocatedDays = useMemo(
    () =>
      activityBuckets.reduce((sum, b) => sum + b.daysCount, 0) +
      cityBuckets.reduce((sum, b) => sum + b.daysCount, 0),
    [activityBuckets, cityBuckets],
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
   * Set a date's activity.
   *
   * An activity **without** `requires_beat` must carry neither a city nor a beat —
   * the server refuses that pairing — so switching to one drops both rather than
   * leaving a body that will be rejected. Switching *to* a beat-taking activity
   * keeps whatever city was there, since it is usually still the right one.
   */
  const setDayActivity = useCallback(
    (date: string, activityId: number) => {
      editSchedule((days) => {
        if (!activityId) {
          days.delete(date)
          return
        }
        const activity = activityById.get(activityId)
        const previous = days.get(date)
        const takesBeats = activity?.requiresBeat ?? true
        days.set(date, {
          activityId,
          cityId: takesBeats ? (previous?.cityId ?? null) : null,
          beatIds: takesBeats ? (previous?.beatIds ?? []) : [],
        })
      })
    },
    [editSchedule, activityById],
  )

  /**
   * Move a date to another city.
   *
   * Every beat on it is dropped: a beat must sit in its day's city, so keeping them
   * would build a body the server refuses beat by beat.
   */
  const setDayCity = useCallback(
    (date: string, cityId: string | null) => {
      editSchedule((days) => {
        const previous = days.get(date)
        if (!previous) return
        if (previous.cityId === cityId) return
        days.set(date, { ...previous, cityId, beatIds: [] })
      })
    },
    [editSchedule],
  )

  const setDayBeats = useCallback(
    (date: string, beatIds: string[]) => {
      editSchedule((days) => {
        const previous = days.get(date)
        if (!previous) return
        days.set(date, { ...previous, beatIds })
      })
    },
    [editSchedule],
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

    saveAllocation.mutate(
      {
        planId,
        activityAllocations: activityBuckets.map((bucket) => ({
          activityId: Number(bucket.id),
          daysCount: bucket.daysCount,
        })),
        cityAllocations: cityBuckets.map((bucket) => ({
          cityId: bucket.id,
          daysCount: bucket.daysCount,
        })),
      },
      {
        onSuccess: (saved) => {
          setAllocationDraft(null)
          const mismatch = saved.flags.some((flag) => flag.code === 'schedule_mismatch')
          setNotice(
            mismatch
              ? 'Saved. The sales incharge’s schedule no longer matches these counts, so approve is blocked until one of the two is corrected — his work was kept rather than discarded.'
              : saved.progress.allocationVariance !== 0
                ? `Saved. The counts are ${Math.abs(
                    saved.progress.allocationVariance,
                  )} day${
                    Math.abs(saved.progress.allocationVariance) === 1 ? '' : 's'
                  } ${saved.progress.allocationVariance < 0 ? 'short of' : 'over'} the month, so publish is still refused.`
                : null,
          )
          toastsuccessmsg('Allocation saved.')
        },
        // Every 400 here carries a message written to be shown verbatim — a city
        // outside the whitelist, an activity that is not allocatable.
        onError: (error) => toastApiError(error, 'Failed to save the allocation.'),
      },
    )
  }, [
    plan,
    planId,
    allocationEditable,
    allocationDirty,
    activityBuckets,
    cityBuckets,
    saveAllocation,
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
        activityId: day.activityId,
        cityId: day.cityId,
        beatIds: day.beatIds,
      }))

    saveSchedule.mutate(
      { planId, days },
      {
        onSuccess: (saved) => {
          setScheduleDraft(null)
          const landed = serverSchedule(saved)
          const held = days.filter((day) => {
            const after = landed.get(day.date)
            return !after || after.activityId !== day.activityId
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
        onError: (error) => toastApiError(error, 'Failed to save the schedule.'),
      },
    )
  }, [plan, planId, scheduleEditable, scheduleDirty, schedule, saveSchedule])

  /**
   * Publish — `draft` → `published`, releasing the month to the sales incharge.
   *
   * Gated on the server's own `canPublish` rather than a recomputed variance, and
   * one-way: there is no unpublish.
   */
  const submitPublish = useCallback(() => {
    if (!planId || !canTransition) return
    publish.mutate(planId, {
      onSuccess: (result) => {
        setNotice(null)
        toastsuccessmsg(
          `Published — the sales incharge can now see ${monthLabel(month)} and start dating his ${
            result.daysAllocated
          } allocated days.`,
        )
      },
      // The 400 names the shortfall, and the 409 says it is not a draft.
      onError: (error) => toastApiError(error, 'Failed to publish the plan.'),
    })
  }, [planId, canTransition, publish, month])

  /**
   * Approve — `submitted` → `approved`.
   *
   * Refused unless the schedule consumes every bucket exactly, checked bucket by
   * bucket. There is **no reject**: an admin who dislikes the schedule corrects it
   * above and approves.
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
   * Cities a date may be moved to: **the ones this plan allocates**, not every city
   * the sales incharge has beats in. Scheduling into an unallocated city is exactly what
   * `schedule_unallocated` reports, and it blocks approve.
   */
  const cityOptions = useMemo(
    () =>
      (plan?.cityAllocations ?? []).map((bucket) => ({
        value: bucket.cityId,
        label: bucket.cityName ?? `City ${bucket.cityId}`,
        hint: `${bucket.daysScheduled} of ${bucket.daysCount} days used`,
      })),
    [plan?.cityAllocations],
  )

  /** The beat pool for the open date, narrowed to that date's city. */
  const beatsForOpenDate = useMemo(() => {
    if (!beatDate) return []
    const cityId = schedule.get(beatDate)?.cityId
    if (!cityId) return []
    // A beat with no city of its own is offered too: that is a gap in the beat
    // master, which the server explicitly allows, not a scheduling error.
    return (beatPool.data ?? []).filter(
      (beat) => beat.cityId === cityId || beat.cityId == null,
    )
  }, [beatDate, schedule, beatPool.data])

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
      for (const beat of day.beats) map.set(beat.beatId, beat.beatName)
    }
    for (const beat of beatPool.data ?? []) map.set(beat.id, beat.name)
    return map
  }, [plan?.days, beatPool.data])

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
    /** Combobox props for the header's incharge picker, plus its current value. */
    incharge: {
      options: (reps.data ?? []).map((r) => ({
        value: r.inchargeId,
        label: r.inchargeName,
        badge: r.employeeCode ? `#${r.employeeCode}` : undefined,
      })),
      loading: reps.isFetching,
      value: inchargeId ?? '',
      onChange: selectIncharge,
    },
    month,
    monthLabel: monthLabel(month),
    prevMonth: () => selectMonth(shiftMonth(month, -1)),
    nextMonth: () => selectMonth(shiftMonth(month, 1)),
    selectMonth,

    /* the allocation */
    allocationOptions: options.data,
    isLoadingOptions: options.isLoading,
    activityBuckets,
    cityBuckets,
    setActivityBuckets,
    setCityBuckets,
    draftAllocatedDays,
    allocationDirty,
    allocationEditable,
    discardAllocation,
    submitAllocation,
    isSavingAllocation: saveAllocation.isPending,

    /* the schedule */
    schedule,
    beatNames,
    activities: activities.data ?? [],
    cityOptions,
    setDayActivity,
    setDayCity,
    setDayBeats,
    clearDay,
    scheduleDirty,
    scheduleEditable,
    discardSchedule,
    submitSchedule,
    isSavingSchedule: saveSchedule.isPending,
    lockedDates,
    /** The per-date beat dialog. */
    beatDate,
    openBeatDialog: setBeatDate,
    beatsForOpenDate,

    /* the transitions — one permission, both ends */
    canTransition,
    showPublish: Boolean(status && isPublishable(status)),
    showApprove: Boolean(status && isApprovable(status)),
    /** The server's verdicts, never re-derived from the flags. */
    canPublish: Boolean(plan?.canPublish),
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
