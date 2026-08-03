import { cn } from '@/lib/utils'
import type { DayScope } from '../types'

const SCOPES: { value: DayScope; label: string }[] = [
  { value: 'all', label: 'All days' },
  { value: 'on-field', label: 'On field' },
  { value: 'off', label: 'Off days' },
]

/**
 * Slice selector for the day grid. A count rides on each pill, so a manager can
 * see whether a slice is worth opening before clicking it — a month with nothing
 * in it should say so without a round trip through an empty grid.
 */
export function DayScopeSegments({
  value,
  onChange,
  counts,
}: {
  value: DayScope
  onChange: (scope: DayScope) => void
  counts: Record<DayScope, number>
}) {
  return (
    <div role="tablist" aria-label="Day slice" className="inline-flex flex-wrap items-center gap-2">
      {SCOPES.map((scope) => {
        const active = scope.value === value
        return (
          <button
            key={scope.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(scope.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium',
              active
                ? 'bg-primary text-primary-foreground shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:border-white/15 dark:bg-primary/10 dark:text-primary'
                : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:border-white/15',
            )}
          >
            {scope.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-px font-mono text-[11px] tabular-nums',
                active
                  ? 'bg-white/20 text-white dark:bg-primary/15 dark:text-primary'
                  : 'bg-muted/70 text-muted-foreground',
              )}
            >
              {counts[scope.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
