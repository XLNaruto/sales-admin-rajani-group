import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { COMPLETION_FAIR, COMPLETION_GOOD } from '../lib/plan-flags'
import { unscheduledIsAProblem } from '../lib/plan-status'
import type { PlanProgress, PlanStatus } from '../types'

/** Percentage colour — the two figures on the rail that carry a judgement. */
function percentTone(value: number) {
  if (value >= COMPLETION_GOOD) return 'text-success'
  if (value >= COMPLETION_FAIR) return 'text-warning'
  return 'text-destructive'
}

/**
 * The month's numbers, as one hairline-divided strip. Every figure is the
 * server's — nothing here is recomputed.
 *
 * **Three day-counts, not one**, because the interesting question changes as the
 * month progresses: `allocated` is what the admin promised, `scheduled` is what
 * the sales incharge dated, `worked` is what a visit landed on. So the rail leads with
 * *scheduling* before approval and with *completion* after it, rather than showing
 * one percentage that means different things on different days.
 *
 * The variance cell is the actionable one on a draft: publish is refused until it
 * reads zero.
 *
 * Deliberately flat: it sits directly under the header, where a row of cards would
 * compete with the editors below it.
 */
export function PlanStatRail({
  progress,
  status,
}: {
  progress: PlanProgress
  status: PlanStatus
}) {
  const nothingAllocated = progress.daysAllocated === 0
  const variance = progress.allocationVariance
  // After submission the month is meant to be fully dated, so `scheduled` is the
  // settled figure and `worked` is the live one. Before that it is the reverse.
  const leadWithCompletion = unscheduledIsAProblem(status)

  return (
    <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-4 sm:divide-x">
      {leadWithCompletion ? (
        <Cell
          label="Completion"
          hint="Scheduled dates a visit has landed on. A past scheduled date with no visit is missed, not worked."
        >
          {progress.daysScheduled === 0 ? (
            <span className="text-lg text-muted-foreground">Nothing scheduled</span>
          ) : (
            <span
              className={cn('tabular-nums', percentTone(progress.completionPercentage))}
            >
              {progress.completionPercentage}
              <span className="align-top text-sm font-medium text-muted-foreground">
                %
              </span>
            </span>
          )}
        </Cell>
      ) : (
        <Cell
          label="Scheduling"
          hint="Allocated days the sales incharge has actually put a date against. The figure that matters before approval."
        >
          {/* 0% with nothing allocated is a flag, not a slow start — the sales incharge was
              never given a month. Saying so beats a red zero. */}
          {nothingAllocated ? (
            <span className="text-lg text-destructive">Nothing allocated</span>
          ) : (
            <span
              className={cn('tabular-nums', percentTone(progress.schedulingPercentage))}
            >
              {progress.schedulingPercentage}
              <span className="align-top text-sm font-medium text-muted-foreground">
                %
              </span>
            </span>
          )}
        </Cell>
      )}

      <Cell
        label="Days scheduled"
        hint="Dates the sales incharge has dated, against the days the admin allocated."
      >
        {progress.daysScheduled}
        <span className="text-sm font-medium text-muted-foreground">
          {' '}
          / {progress.daysAllocated}
        </span>
      </Cell>

      <Cell
        label="Days worked"
        hint="Scheduled dates a visit has landed on — never derived from “the date has passed”."
      >
        {progress.daysWorked}
      </Cell>

      {/* The gate on publish. Zero is the only value that lets a draft move on, so
          it is stated as a verdict rather than as a signed number to interpret. */}
      <Cell
        label="Allocation"
        hint={
          variance === 0
            ? 'The counts account for every calendar date — this is what publish requires.'
            : 'Publish is refused until the activity and city counts add up to the whole month.'
        }
      >
        {variance === 0 ? (
          <span className="text-success">Balanced</span>
        ) : (
          <span className="tabular-nums text-destructive">
            {variance > 0 ? '+' : ''}
            {variance}
            <span className="ml-1 align-top text-sm font-medium text-muted-foreground">
              {Math.abs(variance) === 1 ? 'day' : 'days'}
            </span>
          </span>
        )}
      </Cell>
    </div>
  )
}

function Cell({
  label,
  hint,
  children,
}: {
  label: string
  /** The cell's own explanation — every figure here needs one. */
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <Hint label={hint}>
        <p className="inline-block cursor-default text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
      </Hint>
      <p className="mt-1 font-heading text-2xl font-semibold leading-none tabular-nums">
        {children}
      </p>
    </div>
  )
}
