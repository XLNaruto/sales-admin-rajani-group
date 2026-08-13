import type { RetailerTag } from '../types'

/**
 * Retailer tagging rules — pure functions, no UI or API imports, so the
 * business definition can be unit-tested and stays identical wherever a tag is
 * shown (analytics, the field app, exports).
 *
 * The agreed definitions:
 *   New Call       — within 1 month of activation
 *   Active Call    — productive visit (an order) inside the last month
 *   No Order       — never ordered since activation
 *   To Be Dormant  — no order for 2 months
 *   Dormant        — no order for 3 months
 *   Never Visited  — no visit at all in the last 3 months
 */

/** Whole months between two dates (calendar months, not 30-day blocks). */
export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  // Not a full month yet if the day-of-month hasn't come round.
  return to.getDate() < from.getDate() ? months - 1 : months
}

export interface RetailerTagInput {
  /** When the outlet went live (ISO date). */
  activationDate: string
  /** Last visit of any kind; omit when the outlet has never been visited. */
  lastVisitDate?: string
  /** Last productive visit (one that produced an order); omit when never ordered. */
  lastOrderDate?: string
  /** Evaluation date — defaults to now, passed explicitly in tests. */
  asOf?: Date
}

/**
 * The single source of truth for a retailer's tag.
 *
 * Order matters: the rules overlap (a shop activated last week has no order
 * yet, and a shop that stopped being visited also stopped ordering), so they
 * are evaluated most-specific first — the newest outlets are excused from the
 * order rules, then coverage (was it even visited) outranks ordering.
 */
export function resolveRetailerTag({
  activationDate,
  lastVisitDate,
  lastOrderDate,
  asOf = new Date(),
}: RetailerTagInput): RetailerTag {
  const monthsSinceActivation = monthsBetween(new Date(activationDate), asOf)

  // Inside the first month the outlet is still being introduced — it is not
  // judged on orders yet.
  if (monthsSinceActivation < 1) return 'new-call'

  const monthsSinceVisit = lastVisitDate
    ? monthsBetween(new Date(lastVisitDate), asOf)
    : Infinity
  // No coverage at all for a quarter — a beat/route problem, not an order
  // problem, so it outranks the dormancy tags.
  if (monthsSinceVisit >= 3) return 'never-visited'

  // Visited (recently enough) but has never once bought since going live.
  if (!lastOrderDate) return 'no-order'

  const monthsSinceOrder = monthsBetween(new Date(lastOrderDate), asOf)
  if (monthsSinceOrder >= 3) return 'dormant'
  if (monthsSinceOrder >= 2) return 'to-be-dormant'
  return 'active-call'
}

/** Display order used by the tag cards, the donut and the tag filter. */
export const TAG_ORDER: RetailerTag[] = [
  'new-call',
  'active-call',
  'to-be-dormant',
  'dormant',
  'no-order',
  'never-visited',
]

interface TagMeta {
  label: string
  /** Rule text shown under the count — keeps the definition next to the number. */
  rule: string
  /** Badge / card tint. Healthy → emerald, at-risk → amber, lost → rose. */
  className: string
  /** Solid swatch used for the donut legend and the card accent. */
  dotClassName: string
}

export const TAG_META: Record<RetailerTag, TagMeta> = {
  'new-call': {
    label: 'New Call',
    rule: 'Within 1 month of activation',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dotClassName: 'bg-blue-500',
  },
  'active-call': {
    label: 'Active Call',
    rule: 'Productive visit in the last month',
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dotClassName: 'bg-emerald-500',
  },
  'to-be-dormant': {
    label: 'To Be Dormant',
    rule: 'No order for 2 months',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dotClassName: 'bg-amber-500',
  },
  dormant: {
    label: 'Dormant',
    rule: 'No order for 3 months',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
    dotClassName: 'bg-rose-500',
  },
  'no-order': {
    label: 'No Order',
    rule: 'No order since activation',
    className:
      'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
    dotClassName: 'bg-orange-500',
  },
  'never-visited': {
    label: 'Never Visited',
    rule: 'No visit in the last 3 months',
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300',
    dotClassName: 'bg-slate-500',
  },
}
