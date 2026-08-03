import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { PRODUCTIVITY_FAIR, PRODUCTIVITY_GOOD } from '../lib/live-day-metrics'
import type { LiveMonthTotals } from '../types'

/** Productivity colour — the only figure on the rail that carries a judgement. */
function productivityTone(value: number) {
  if (value >= PRODUCTIVITY_GOOD) return 'text-success'
  if (value >= PRODUCTIVITY_FAIR) return 'text-warning'
  return 'text-destructive'
}

/**
 * The range's headline numbers, as one hairline-divided strip.
 *
 * All five come straight from the response's `totals`, already computed over the
 * whole range. In particular `avgCallsPerDay` divides by days **on field**, not by
 * calendar days — recomputing it against `days` would quietly under-report it.
 */
export function LiveStatRail({ totals }: { totals: LiveMonthTotals }) {
  return (
    <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
      <Cell label="Total calls">{totals.totalCalls}</Cell>
      <Cell label="Productive calls">{totals.productiveCalls}</Cell>
      <Cell label="Productivity">
        <span className={cn('tabular-nums', productivityTone(totals.productivityPercentage))}>
          {totals.productivityPercentage}
          <span className="align-top text-sm font-medium text-muted-foreground">%</span>
        </span>
      </Cell>
      <Cell label="Days on field">{totals.daysOnField}</Cell>
      <Cell label="Avg calls / day">
        <Hint label="Averaged over days on field, not calendar days.">
          <span className="cursor-default">{totals.avgCallsPerDay}</span>
        </Hint>
      </Cell>
    </div>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-semibold leading-none tabular-nums">
        {children}
      </p>
    </div>
  )
}
