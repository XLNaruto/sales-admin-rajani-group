import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { COMPLETION_FAIR, COMPLETION_GOOD } from '../lib/plan-flags'
import type { PlanProgress } from '../types'

/** Completion colour — the only figure on the rail that carries a judgement. */
function completionTone(value: number) {
  if (value >= COMPLETION_GOOD) return 'text-success'
  if (value >= COMPLETION_FAIR) return 'text-warning'
  return 'text-destructive'
}

/**
 * The month's progress, as one hairline-divided strip. Every figure is the
 * server's — nothing here is recomputed.
 *
 * Two numbers replaced the old coverage/travel figures: **`beatsAllocated`** (the
 * plan) and **`beatsWorked`** (the actual, counting distinct *listed* beats only —
 * a beat worked off-list is a deviation, not progress).
 *
 * Deliberately flat: it sits directly under the header, where a row of cards would
 * compete with the editor below it.
 */
export function PlanStatRail({ progress }: { progress: PlanProgress }) {
  const nothingAllocated = progress.beatsAllocated === 0

  return (
    <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-4 sm:divide-x">
      <Cell label="Completion">
        {/* 0% with nothing allocated is a flag, not a slow start — the rep was
            never given a month. Saying so beats a red zero. */}
        {nothingAllocated ? (
          <Hint label="No beats are on this month’s list, so there is nothing to work through.">
            <span className="cursor-default text-lg text-destructive">Nothing allocated</span>
          </Hint>
        ) : (
          <span className={cn('tabular-nums', completionTone(progress.completion))}>
            {progress.completion}
            <span className="align-top text-sm font-medium text-muted-foreground">%</span>
          </span>
        )}
      </Cell>

      <Cell label="Beats worked">
        {progress.beatsWorked}
        <span className="text-sm font-medium text-muted-foreground">
          {' '}
          / {progress.beatsAllocated}
        </span>
      </Cell>

      <Cell label="Beats left">
        <Hint label="Listed beats not yet worked once this month.">
          <span className="cursor-default tabular-nums">{progress.beatsRemaining}</span>
        </Hint>
      </Cell>

      <Cell label="Working days">
        {progress.workingDays}
        <span className="text-sm font-medium text-muted-foreground">
          {' '}
          / {progress.totalDays}
        </span>
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
