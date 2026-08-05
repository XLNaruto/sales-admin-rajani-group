/**
 * The plan lifecycle, in one place: the chain, its copy, and who may write what
 * in each state.
 *
 * Four states, **one direction only** — `draft → published → submitted →
 * approved`. There is no reject, no send-back, no unpublish and no unsubmit. An
 * admin who dislikes a schedule corrects it and approves.
 *
 * Every predicate here is about what the *server* will accept, so a control that
 * consults them can never offer a write that comes back a 409. The two
 * *sufficiency* checks — is the allocation complete, does the schedule consume
 * every bucket — are the server's own `canPublish` / `canApprove` booleans and are
 * deliberately NOT recomputed here: approve is checked bucket by bucket, and the
 * totals can balance while the buckets do not.
 */
import type { PlanStatus } from '../types'

/** Chain order. The list's `sort_by=status` uses this, not alphabetical order. */
export const PLAN_STATUS_CHAIN: PlanStatus[] = [
  'draft',
  'published',
  'submitted',
  'approved',
]

/** Narrow the wire's `status`. An unrecognised value reads as the safest state. */
export function toPlanStatus(value: string | null | undefined): PlanStatus {
  return PLAN_STATUS_CHAIN.includes(value as PlanStatus) ? (value as PlanStatus) : 'draft'
}

/** How far along the chain a status sits — for sorting and for progress marks. */
export function statusRank(status: PlanStatus): number {
  return PLAN_STATUS_CHAIN.indexOf(status)
}

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  submitted: 'Submitted',
  approved: 'Approved',
}

/**
 * What each state means, written for an admin. The `draft` line is the one that
 * matters most: it is the only state the sales incharge cannot see at all.
 */
export const PLAN_STATUS_HINT: Record<PlanStatus, string> = {
  draft:
    'Your allocation, not yet released — the sales incharge cannot see this month at all. Publish it to hand it over.',
  published:
    'Released. The sales incharge is dating every allocated day and picking his beats. You can still change the counts.',
  submitted:
    'He has dated the whole month and handed it back. He is read-only from here — correct the calendar yourself if it needs it.',
  approved:
    'Signed off and live. You can still correct the calendar; the sales incharge never writes again.',
}

/**
 * Chip tone per state. `draft` is deliberately the quiet one — it is unreleased
 * work in progress, not a problem — and `submitted` is the loud one, because it is
 * the only state waiting on the admin.
 */
export const PLAN_STATUS_TONE: Record<PlanStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-info/12 text-info',
  submitted: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
}

/** Who the schedule belongs to while the plan is in this state. */
export function scheduleOwner(status: PlanStatus): 'admin' | 'rep' | 'nobody' {
  if (status === 'draft') return 'nobody'
  if (status === 'published') return 'rep'
  return 'admin'
}

/**
 * May the **allocation** (the day-counts) still be edited?
 *
 * Everywhere except `approved`, where the PATCH is refused with a 409 — correct
 * the schedule instead. Re-allocating under a `published` or `submitted` schedule
 * that no longer fits is allowed on purpose: it raises `schedule_mismatch` rather
 * than deleting the sales incharge's work.
 */
export function canEditAllocation(status: PlanStatus): boolean {
  return status !== 'approved'
}

/**
 * May the **schedule** be corrected?
 *
 * From `submitted` onward, including after approval — a live month has to be
 * fixable and the sales incharge can no longer do it. Refused (409) on a `draft` or
 * `published` plan, where the calendar is his.
 */
export function canEditSchedule(status: PlanStatus): boolean {
  return status === 'submitted' || status === 'approved'
}

/** Is `publish` the transition on offer? (Whether it will *succeed* is `canPublish`.) */
export function isPublishable(status: PlanStatus): boolean {
  return status === 'draft'
}

/** Is `approve` the transition on offer? (Whether it will *succeed* is `canApprove`.) */
export function isApprovable(status: PlanStatus): boolean {
  return status === 'submitted'
}

/**
 * Whether an `unscheduled` date is a problem — which cannot be read off the strip.
 *
 * On a draft nothing is scheduled yet by definition, and a freshly published month
 * is the sales incharge's to fill in. Only from submission onward does a blank date mean the
 * month is incomplete.
 */
export function unscheduledIsAProblem(status: PlanStatus): boolean {
  return status === 'submitted' || status === 'approved'
}
