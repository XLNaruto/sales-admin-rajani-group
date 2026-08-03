import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { COVERAGE_FAIR, COVERAGE_GOOD } from '../lib/plan-flags'
import type { PlanMetrics } from '../types'

/** Coverage colour — the only figure on the rail that carries a judgement. */
function coverageTone(value: number) {
  if (value >= COVERAGE_GOOD) return 'text-success'
  if (value >= COVERAGE_FAIR) return 'text-warning'
  return 'text-destructive'
}

/**
 * The month's headline numbers, as one hairline-divided strip. Every figure is the
 * server's — coverage is measured against the rep's *allocated* beats and capped at
 * 100, so nothing here recomputes it.
 *
 * Deliberately flat: it sits directly under the plan title, where a row of cards
 * would compete with the day table below for attention.
 */
export function PlanStatRail({ metrics }: { metrics: PlanMetrics }) {
  return (
    <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-4 sm:divide-x">
      <Cell label="Beat coverage">
        <span className={cn('tabular-nums', coverageTone(metrics.coverage))}>
          {metrics.coverage}
          <span className="align-top text-sm font-medium text-muted-foreground">%</span>
        </span>
      </Cell>
      <Cell label="Beats scheduled">{metrics.beatsScheduled}</Cell>
      <Cell label="Working days">
        {metrics.workingDays}
        <span className="text-sm font-medium text-muted-foreground"> / {metrics.totalDays}</span>
      </Cell>
      <Cell label="Avg km / day">
        {/* Null is not zero: it means the rep's beats carry no coordinates, so the
            travel load is unmeasurable. A "0" here would read as a superb plan. */}
        {metrics.avgKmPerDay == null ? (
          <Hint label="The beats on this plan have no coordinates, so travel can't be measured.">
            {/* "N/A" rather than a dash: at this type size a dash reads as a minus
                sign or a rendering glitch, not as "no figure". */}
            <span className="cursor-default text-lg text-muted-foreground">N/A</span>
          </Hint>
        ) : (
          metrics.avgKmPerDay
        )}
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
