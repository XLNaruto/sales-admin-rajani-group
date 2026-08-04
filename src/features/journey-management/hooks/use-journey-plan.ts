/**
 * State for the Journey Plan (allocation) screen.
 *
 * The admin edits two things and saves them together, because the API is one
 * PATCH: the month's **beat list** and its **pinned days**. Both are full
 * replacements, so this hook keeps a local draft and sends it whole — there is no
 * per-beat POST and no per-day PATCH any more.
 *
 * The response is authoritative. A `pinned_days` replacement cannot move a locked
 * day or a date the **rep has already taken over**, so after a save the screen
 * re-reads what actually landed rather than assuming every pin took.
 *
 * The screen is addressed by `(incharge, month)` rather than by plan id alone, so
 * the month pager can find the *next* month's allocation for the same person.
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
  useJourneyPlanDetail,
  useJourneyPlanReps,
  useSaveJourneyPlan,
} from '../api/use-journey-plan-detail'
import { currentMonth, monthLabel, shiftMonth } from '../lib/journey-format'
import { isLocked, planIssues } from '../lib/plan-flags'
import type { JourneyPlanDetail, PinnedDay } from '../types'

/** Params the list hands over in the encrypted `?data=` token. */
interface PlanParams {
  /** Journey plan id, when the caller already knows it. */
  id?: string
  /** Sales incharge — survives a month step, unlike `id`. */
  inchargeId?: string
  /** `yyyy-MM`. */
  month?: string
}

/** The unsaved edit, scoped to the plan it was made against. */
interface Draft {
  planId: string
  beats: string[]
  /** `date` → activity id. */
  pins: Map<string, number>
}

/**
 * The pins as the server currently holds them: the day rows it marked `pinned`.
 *
 * A row the rep has taken over reads `rep` and is deliberately excluded — it is not
 * ours to replace, and including it would send his choice back as a pin.
 */
function serverPins(plan: JourneyPlanDetail): Map<string, number> {
  return new Map(
    plan.days
      .filter((day) => day.origin === 'pinned' && day.activityId > 0)
      .map((day) => [day.date, day.activityId] as const),
  )
}

/** Same set, ignoring order. */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(b)
  return a.every((value) => set.has(value))
}

/** Same date → activity mapping. */
function samePins(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false
  for (const [date, activityId] of a) {
    if (b.get(date) !== activityId) return false
  }
  return true
}

export function useJourneyPlan(data?: string) {
  const navigate = useNavigate()
  const { can } = useCan()
  /** Editing and the assistant are separate grants. There is nothing to approve. */
  const canUpdate = can('journey-plan:update')
  const canUseAgent = can('journey-plan-agent:use')

  const params = useMemo<PlanParams>(
    () => (data ? (decryptParams<PlanParams>(data) ?? {}) : {}),
    [data],
  )
  const month = params.month ?? currentMonth()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reps = useJourneyPlanReps(month)

  /**
   * Which allocation the screen is on. The rep list already carries each plan id,
   * so resolving from `(incharge, month)` costs no extra request — and it is the
   * only way a month step can land on the right one.
   */
  const rep = useMemo(() => {
    const list = reps.data ?? []
    if (params.inchargeId) return list.find((r) => r.inchargeId === params.inchargeId)
    if (params.id) return list.find((r) => r.journeyPlanId === params.id)
    return list[0]
  }, [reps.data, params.inchargeId, params.id])

  const inchargeId = params.inchargeId ?? rep?.inchargeId
  // An id in the token wins: it is the list's deep link, and newer than a cached
  // rep list. A month step drops the id precisely so this falls through.
  const planId = params.id ?? rep?.journeyPlanId ?? undefined

  const detail = useJourneyPlanDetail(planId)
  const plan = detail.data

  // Both masters feed the editor, so neither is fetched for a reviewer who cannot
  // edit — and each needs its own read grant.
  const activities = useActivities({ enabled: canUpdate && can('activity:list') })
  const beatPool = useAllocatedBeats(inchargeId ?? plan?.inchargeId, {
    enabled: canUpdate && can('beat:list'),
  })

  const save = useSaveJourneyPlan()

  /** The server's state, and the draft laid over it when one belongs to this plan. */
  const baseBeats = useMemo(
    () => (plan ? plan.allocatedBeats.map((beat) => beat.beatId) : []),
    [plan],
  )
  const basePins = useMemo(() => (plan ? serverPins(plan) : new Map<string, number>()), [plan])

  const live = plan && draft?.planId === plan.id ? draft : null
  const beats = live ? live.beats : baseBeats
  const pins = live ? live.pins : basePins

  const dirty = Boolean(live) && (!sameSet(beats, baseBeats) || !samePins(pins, basePins))

  /** Start (or continue) a draft against the plan on screen. */
  const edit = useCallback(
    (next: { beats?: string[]; pins?: Map<string, number> }) => {
      if (!plan || !canUpdate) return
      setDraft((prev) => {
        const from = prev?.planId === plan.id ? prev : null
        return {
          planId: plan.id,
          beats: next.beats ?? from?.beats ?? plan.allocatedBeats.map((b) => b.beatId),
          pins: next.pins ?? from?.pins ?? serverPins(plan),
        }
      })
    },
    [plan, canUpdate],
  )

  const setBeats = useCallback((beatIds: string[]) => edit({ beats: beatIds }), [edit])

  const pin = useCallback(
    (date: string, activityId: number) => {
      if (!activityId) return
      const next = new Map(pins)
      next.set(date, activityId)
      edit({ pins: next })
    },
    [pins, edit],
  )

  const unpin = useCallback(
    (date: string) => {
      const next = new Map(pins)
      next.delete(date)
      edit({ pins: next })
    },
    [pins, edit],
  )

  /** Throw the draft away and fall back to what the server holds. */
  const discard = useCallback(() => {
    setDraft(null)
    setNotice(null)
  }, [])

  /** Point the screen at another (incharge, month). Any draft is abandoned. */
  const open = useCallback(
    (next: { id?: string; inchargeId?: string; month: string }) => {
      setDraft(null)
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
   * Save the allocation — one PATCH carrying both full replacements.
   *
   * The response tells us what landed. A pin aimed at a locked day, or at a date
   * the rep has already taken over, is dropped by the server on purpose; saying so
   * beats leaving the admin to notice a row that didn't change.
   */
  const submit = useCallback(() => {
    if (!plan || !planId || !canUpdate || !dirty) return
    const requested: PinnedDay[] = [...pins].map(([date, activityId]) => ({
      date,
      activityId,
    }))

    save.mutate(
      { planId, beats, pinnedDays: requested },
      {
        onSuccess: (saved) => {
          setDraft(null)
          const landed = serverPins(saved)
          const dropped = requested.filter(
            (day) => landed.get(day.date) !== day.activityId,
          )
          setNotice(
            dropped.length
              ? `Saved. ${dropped.length} pin${dropped.length === 1 ? '' : 's'} did not take (${dropped
                  .map((day) => day.date)
                  .join(', ')}) — those dates are already locked or the rep has taken them.`
              : null,
          )
          toastsuccessmsg('Allocation saved.')
        },
        // Every 400 here carries a message written to be shown verbatim — a beat
        // not allocated to the rep, an unknown activity, a date outside the month.
        onError: (error) => toastApiError(error, 'Failed to save the allocation.'),
      },
    )
  }, [plan, planId, canUpdate, dirty, pins, beats, save])

  const issues = useMemo(() => (plan ? planIssues(plan) : []), [plan])

  /** Dates the admin can no longer pin — history, or the rep's own. */
  const lockedDates = useMemo(
    () => new Set((plan?.days ?? []).filter(isLocked).map((day) => day.date)),
    [plan],
  )

  return {
    plan,
    planId,
    isLoading: detail.isLoading || reps.isLoading,
    /**
     * The rep list is still in flight, so the header's picker and month pager have
     * nothing to render yet. Split from `isLoading` on purpose: those two controls
     * are driven by the rep list, not by the allocation, so once this is false they
     * can go live while the month behind them is still loading.
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
     * No allocation exists for this (incharge, month) — the screen shows an empty
     * state. Never claimed while a read is failing: a broken rep list also yields
     * no `planId`, and "nothing was generated" would be a lie about a 500.
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
    /** The draft (or the server's state when nothing has been touched). */
    beats,
    pins,
    setBeats,
    pin,
    unpin,
    dirty,
    discard,
    submit,
    isSaving: save.isPending,
    lockedDates,
    activities: activities.data ?? [],
    /** Every beat the rep holds — the pool the month's list is chosen from. */
    beatPool: beatPool.data ?? [],
    issues,
    notice,
    dismissNotice: () => setNotice(null),
    /** Permission gates for the editor and the assistant. */
    canUpdate,
    canUseAgent,
  }
}
