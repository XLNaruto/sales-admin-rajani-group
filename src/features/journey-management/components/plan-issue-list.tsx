import { Ban, CheckCircle2 } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import type { IssueCategory, PlanIssue } from '../types'

/** Category chip colour — the chip is a label, so tone follows the category. */
const CATEGORY_STYLE: Record<IssueCategory, string> = {
  blocking: 'bg-destructive/12 text-destructive',
  allocation: 'bg-warning/15 text-warning',
  schedule: 'bg-info/12 text-info',
  'master-data': 'bg-muted text-muted-foreground',
}

/** Shortened for the chip — "master-data" is too wide beside a sentence. */
const CATEGORY_LABEL: Record<IssueCategory, string> = {
  blocking: 'blocking',
  allocation: 'allocation',
  schedule: 'schedule',
  'master-data': 'masters',
}

/**
 * The warnings the server put on this plan, worst first.
 *
 * Unlike the old allocation model, **some of these genuinely gate the month**:
 * `allocation_incomplete` is exactly why publish refuses, and the two schedule
 * flags are exactly why approve refuses. Those carry the `blocking` chip and a
 * slash marker, and the header counts them separately — an admin needs to know
 * which rows he must clear and which merely want a look.
 *
 * Rows that point at a date are clickable and scroll the schedule table to it.
 */
export function PlanIssueList({
  issues,
  onSelectDay,
  maxHeight = '15rem',
}: {
  issues: PlanIssue[]
  /** Called with a day of month when an issue row pointing at one is clicked. */
  onSelectDay?: (day: number) => void
  /** Height cap on the scrolling list — roughly five rows by default. */
  maxHeight?: string | number
}) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-3.5 text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-success" />
        <span className="font-medium text-foreground">Nothing to look at</span>
        <span className="text-muted-foreground">
          — no warnings on this month&rsquo;s plan.
        </span>
      </div>
    )
  }

  const blocking = issues.filter((issue) => issue.blocks).length

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Worth a look
        </h2>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            blocking > 0
              ? 'bg-destructive/12 text-destructive'
              : 'bg-warning/15 text-warning',
          )}
        >
          {issues.length}
        </span>
        <span className="text-xs text-muted-foreground">
          {blocking > 0
            ? `${blocking} of these must be cleared before the month can move on`
            : 'advisory only — none of these stops the month'}
        </span>
      </div>
      {/* Capped so a badly flagged month can't push the editors off-screen — the
          header stays put and the warnings scroll under it. */}
      <ul className="divide-y divide-border/60 overflow-y-auto" style={{ maxHeight }}>
        {issues.map((issue, i) => {
          const clickable = issue.day != null && onSelectDay
          return (
            <li key={`${issue.code}-${issue.day ?? 'x'}-${i}`}>
              <div
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onSelectDay?.(issue.day!) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelectDay?.(issue.day!)
                        }
                      }
                    : undefined
                }
                className={cn(
                  'flex items-start gap-3 px-4 py-2.5 text-sm',
                  clickable && 'cursor-pointer transition-colors hover:bg-accent/50',
                )}
              >
                <span
                  className={cn(
                    'mt-px shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]',
                    CATEGORY_STYLE[issue.category],
                  )}
                >
                  {CATEGORY_LABEL[issue.category]}
                </span>
                <span className="min-w-0 flex-1 text-foreground">{issue.label}</span>
                {issue.blocks ? (
                  <Hint label={`This is why ${issue.blocks} is refused.`}>
                    <span className="mt-0.5 inline-flex shrink-0 cursor-default items-center gap-1 text-[11px] font-medium text-destructive">
                      <Ban className="size-3" />
                      {issue.blocks}
                    </span>
                  </Hint>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
