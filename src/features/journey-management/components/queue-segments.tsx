import { cn } from '@/lib/utils'
import type { QueueSegment } from '../types'

const SEGMENTS: { value: QueueSegment; label: string }[] = [
  { value: 'all', label: 'All plans' },
  { value: 'pending', label: 'Pending' },
  { value: 'needs-look', label: 'Needs a look' },
  { value: 'clean', label: 'Clean' },
  { value: 'approved', label: 'Approved' },
]

/**
 * Slice selector for the queue. A count rides on each pill so a reviewer can
 * see where the work is before clicking — "Needs a look" leads because that is
 * the only slice that costs time.
 *
 * The active slice is filled in place: switching swaps the fill immediately
 * rather than sliding a shared pill between tabs.
 */
export function QueueSegments({
  value,
  onChange,
  counts,
}: {
  value: QueueSegment
  onChange: (segment: QueueSegment) => void
  counts: Record<QueueSegment, number>
}) {
  return (
    <div
      role="tablist"
      aria-label="Queue slice"
      className="inline-flex flex-wrap items-center gap-2"
    >
      {SEGMENTS.map((segment) => {
        const active = segment.value === value
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium',
              active
                ? 'bg-primary text-primary-foreground shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:border-white/15 dark:bg-primary/10 dark:text-primary'
                : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:border-white/15',
            )}
          >
            {segment.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-px font-mono text-[11px] tabular-nums',
                active
                  ? 'bg-white/20 text-white dark:bg-primary/15 dark:text-primary'
                  : 'bg-muted/70 text-muted-foreground',
              )}
            >
              {counts[segment.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
