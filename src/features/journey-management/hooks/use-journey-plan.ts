/**
 * State for the Journey Plan detail screen.
 *
 * Edits go straight to the server — there is no local overlay. Each PATCH/POST/
 * DELETE returns the whole plan with coverage and flags already recomputed, so the
 * mutation writes that into the cache and the screen re-renders from it. The one
 * thing kept locally is which days the reviewer touched, so the day table can mark
 * them for the rest of the visit.
 *
 * The screen is addressed by `(incharge, month)` rather than by plan id alone: a
 * re-solve supersedes the plan and mints a new id, and the month pager has to
 * find the *next* month's plan for the same person.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { toastsuccessmsg } from '@/lib/toast'
import { toastApiError } from '@/lib/api-toast'
import { useCan } from '@/features/permissions'
import {
  useActivities,
  useAddPlanDayBeat,
  useAllocatedBeats,
  useJourneyPlanDetail,
  useJourneyPlanReps,
  useRemovePlanDayBeat,
  useUpdatePlanDay,
} from '../api/use-journey-plan-detail'
import { useApproveJourneyPlan } from '../api/use-journey-plans'
import { currentMonth, monthLabel, shiftMonth } from '../lib/journey-format'
import { isEditable, isLocked, planIssues } from '../lib/plan-flags'
import type { PlanDay } from '../types'

/** Params the queue hands over in the encrypted `?data=` token. */
interface PlanParams {
  /** Journey plan id, when the caller already knows it. */
  id?: string
  /** Sales incharge — survives a month step and a re-solve, unlike `id`. */
  inchargeId?: string
  /** `yyyy-MM`. */
  month?: string
}

export function useJourneyPlan(data?: string) {
  const navigate = useNavigate()
  const { can } = useCan()
  /** Editing, approving and the assistant are three separate grants. */
  const canUpdate = can('journey-plan:update')
  const canApprove = can('journey-plan:approve')
  const canUseAgent = can('journey-plan-agent:use')
  const params = useMemo<PlanParams>(
    () => (data ? (decryptParams<PlanParams>(data) ?? {}) : {}),
    [data],
  )
  const month = params.month ?? currentMonth()

  /** Days the reviewer edited by hand — the day table tints them. */
  const [pinnedDates, setPinnedDates] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const reps = useJourneyPlanReps(month)

  /**
   * Which plan the screen is on. The rep list already carries each plan id, so
   * resolving from `(incharge, month)` costs no extra request — and it is the only
   * way a month step can land on the right plan.
   */
  const rep = useMemo(() => {
    const list = reps.data ?? []
    if (params.inchargeId) return list.find((r) => r.inchargeId === params.inchargeId)
    if (params.id) return list.find((r) => r.journeyPlanId === params.id)
    return list.find((r) => r.journeyPlanId != null)
  }, [reps.data, params.inchargeId, params.id])

  const inchargeId = params.inchargeId ?? rep?.inchargeId
  // An id in the token wins: it is either the queue's deep link or the successor a
  // re-solve just handed us, and both are newer than a cached rep list. A month step
  // drops the id precisely so this falls through to the lookup above.
  const planId = params.id ?? rep?.journeyPlanId ?? undefined

  const detail = useJourneyPlanDetail(planId)
  const plan = detail.data
  // Both masters exist only to feed the editor's two dropdowns, so neither is
  // fetched for a reviewer who cannot edit — and each needs its own read grant.
  const activities = useActivities({ enabled: canUpdate && can('activity:list') })
  const beats = useAllocatedBeats(inchargeId ?? plan?.inchargeId, {
    enabled: canUpdate && can('beat:list'),
  })

  const updateDay = useUpdatePlanDay()
  const addBeat = useAddPlanDayBeat()
  const removeBeatMutation = useRemovePlanDayBeat()
  const approveMutation = useApproveJourneyPlan()

  /** Point the screen at another (incharge, month) — a fresh review each time. */
  const open = useCallback(
    (next: { id?: string; inchargeId?: string; month: string }) => {
      setPinnedDates([])
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
      // No plan id: the next month's is unknown until its rep list arrives, and
      // that lookup is exactly what `rep` above does.
      open({ inchargeId: inchargeId ?? undefined, month: next })
    },
    [month, inchargeId, open],
  )

  /**
   * Follow the plan to another id, keeping the person and the month. Used when a
   * re-solve — ours or the agent's — supersedes the plan on screen.
   */
  const openPlanId = useCallback(
    (nextId: string) => {
      if (!nextId || nextId === planId) return
      navigate({
        to: '/journey/plan',
        search: { data: encryptParams({ id: nextId, inchargeId, month }) },
        replace: true,
      })
    },
    [navigate, planId, inchargeId, month],
  )

  const inchargeOptions = useMemo(
    () =>
      (reps.data ?? []).map((r) => ({
        value: r.inchargeId,
        label: r.inchargeName,
        badge: r.employeeCode ? `#${r.employeeCode}` : undefined,
        hint: r.journeyPlanId ? undefined : 'No plan this month',
      })),
    [reps.data],
  )

  const days = plan?.days ?? []
  const issues = useMemo(() => (plan ? planIssues(plan) : []), [plan])
  /** Editable means both "the plan allows it" and "this admin may do it". */
  const editable = isEditable(plan) && canUpdate

  /** Remember a hand-edited day so the table can mark it as touched. */
  const pin = useCallback((date: string) => {
    setPinnedDates((prev) => (prev.includes(date) ? prev : [...prev, date]))
  }, [])

  /** Refuse a locked day up front — the server answers 409, and this says why. */
  const guard = useCallback(
    (day: PlanDay): boolean => {
      if (isLocked(day)) {
        setNotice(
          `${day.date} has already started — it is history now, so it can't be changed.`,
        )
        return false
      }
      if (!canUpdate) {
        setNotice('You do not have permission to change this plan.')
        return false
      }
      if (!editable) {
        setNotice('This plan is approved. Re-open it with the planner to change anything.')
        return false
      }
      return true
    },
    [editable, canUpdate],
  )

  const setActivity = useCallback(
    (day: PlanDay, activityId: number) => {
      if (!planId || !guard(day)) return
      updateDay.mutate(
        { planId, dayId: day.id, activityId },
        {
          onSuccess: (next) => {
            pin(day.date)
            const updated = next.days.find((d) => d.id === day.id)
            // The server clears a beatless activity's beats for us, so this is a
            // report of what happened rather than a local reconciliation.
            if (day.beats.length && updated && updated.beats.length === 0) {
              setNotice(
                `${day.date} switched to ${updated.activityName} — its beats were cleared.`,
              )
            }
          },
          onError: (error) => toastApiError(error, 'Failed to change the day.'),
        },
      )
    },
    [planId, guard, updateDay, pin],
  )

  const addDayBeat = useCallback(
    (day: PlanDay, beatId: string) => {
      if (!planId || !guard(day)) return
      addBeat.mutate(
        { planId, dayId: day.id, beatId },
        {
          onSuccess: () => pin(day.date),
          // 409 here is a plan invariant refusing the edit (a second full-day
          // beat, a duplicate, the per-day cap) and its message is written to be
          // shown to the admin verbatim.
          onError: (error) => toastApiError(error, 'Failed to add the beat.'),
        },
      )
    },
    [planId, guard, addBeat, pin],
  )

  const removeDayBeat = useCallback(
    (day: PlanDay, beatId: string) => {
      if (!planId || !guard(day)) return
      removeBeatMutation.mutate(
        { planId, dayId: day.id, beatId },
        {
          onSuccess: () => {
            pin(day.date)
            setNotice('Beat removed. Coverage and flags were recomputed.')
          },
          onError: (error) => toastApiError(error, 'Failed to remove the beat.'),
        },
      )
    },
    [planId, guard, removeBeatMutation, pin],
  )

  const approve = useCallback(() => {
    if (!planId || !canApprove) return
    approveMutation.mutate(planId, {
      onSuccess: () => toastsuccessmsg('Journey plan approved.'),
      onError: (error) => toastApiError(error, 'Failed to approve the plan.'),
    })
  }, [planId, approveMutation, canApprove])

  return {
    plan,
    planId,
    isLoading: detail.isLoading || reps.isLoading,
    /**
     * Either read failing is fatal for the screen, and the page MUST render it:
     * a failed detail leaves `plan` undefined forever, so a page that only checks
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
     * Never claimed while a read is failing: a broken rep list also yields no
     * `planId`, and "nothing was generated" would be a lie about a 500.
     */
    missing:
      !detail.isLoading &&
      !reps.isLoading &&
      !detail.error &&
      !reps.error &&
      !planId,
    /** Combobox props for the header's incharge picker, plus its current value. */
    incharge: {
      options: inchargeOptions,
      loading: reps.isFetching,
      value: inchargeId ?? '',
      onChange: selectIncharge,
    },
    /** Jump to a superseding plan id (the agent re-solved). */
    openPlanId,
    month,
    monthLabel: monthLabel(month),
    prevMonth: () => selectMonth(shiftMonth(month, -1)),
    nextMonth: () => selectMonth(shiftMonth(month, 1)),
    selectMonth,
    days,
    activities: activities.data ?? [],
    beats: beats.data ?? [],
    issues,
    editable,
    notice,
    dismissNotice: () => setNotice(null),
    isEdited: (date: string) => pinnedDates.includes(date),
    setActivity,
    addDayBeat,
    removeDayBeat,
    isSaving:
      updateDay.isPending || addBeat.isPending || removeBeatMutation.isPending,
    approve,
    isApproving: approveMutation.isPending,
    /** Permission gates for the day table, the footer buttons and the assistant. */
    canUpdate,
    canApprove,
    canUseAgent,
  }
}
