import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IssueCategory, PlanIssue } from '../types'

/** Category chip colour — the chip is a label, so tone follows the category. */
const CATEGORY_STYLE: Record<IssueCategory, string> = {
  allocation: 'bg-destructive/12 text-destructive',
  capacity: 'bg-warning/15 text-warning',
  calendar: 'bg-muted text-muted-foreground',
}

/**
 * "Worth a look" — the warnings the server put on this allocation, worst first.
 *
 * They **gate nothing**: there is nothing to approve, so a flagged month is as
 * live as a clean one. The header says "worth a look", not "blocking", on purpose.
 *
 * Rows that point at a date are clickable and scroll the month table to it.
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
          — no warnings on this month&rsquo;s allocation.
        </span>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">Worth a look</h2>
        <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive">
          {issues.length}
        </span>
        <span className="text-xs text-muted-foreground">
          warnings only — the month is live either way
        </span>
      </div>
      {/* Capped so a badly flagged month can't push the editor off-screen — the
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
                  {issue.category}
                </span>
                <span className="min-w-0 flex-1 text-foreground">{issue.label}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
