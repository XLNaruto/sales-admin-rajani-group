import type { HqType, TadaMaster } from '../types'

/**
 * Pure TA/DA calculation rules — framework-free and unit-testable. All money
 * math for the module lives here; components/hooks only call these functions.
 */

export interface TadaCalcInput {
  grade: string
  hqType: HqType
  /** ISO date (YYYY-MM-DD) the claim is for — used for effective-date resolution. */
  onDate: string
  distanceKm: number
  days: number
  additional?: number
}

export interface TadaBreakdown {
  da: number
  ta: number
  additional: number
  total: number
}

/**
 * Picks the applicable rate for a grade + HQ-type: the entry whose
 * `effectiveFrom` is the latest date on or before `onDate`. Returns undefined
 * when no rate is effective yet for that date.
 */
export function resolveRate(
  master: TadaMaster[],
  grade: string,
  hqType: HqType,
  onDate: string,
): TadaMaster | undefined {
  return master
    .filter(
      (m) =>
        m.grade === grade &&
        m.hqType === hqType &&
        m.effectiveFrom <= onDate,
    )
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]
}

/**
 * Computes the TA/DA breakdown for a claim.
 * - DA = dailyAllowance × days
 * - TA = perKmRate × distanceKm
 * - additional expenses pass through unchanged
 * Returns all-zero breakdown when no rate resolves for the given date.
 */
export function calculateTada(
  input: TadaCalcInput,
  master: TadaMaster[],
): TadaBreakdown {
  const additional = Math.max(0, input.additional ?? 0)
  const rate = resolveRate(master, input.grade, input.hqType, input.onDate)

  if (!rate) {
    return { da: 0, ta: 0, additional, total: additional }
  }

  const days = Math.max(0, input.days)
  const distanceKm = Math.max(0, input.distanceKm)
  const da = rate.dailyAllowance * days
  const ta = rate.perKmRate * distanceKm

  return { da, ta, additional, total: da + ta + additional }
}
