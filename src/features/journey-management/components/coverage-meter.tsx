import { cn } from '@/lib/utils'
import { coverageBand, type CoverageBand } from '../lib/journey-metrics'

/** Band → fill colour. Low coverage is the thing reviewers hunt for, so it
 *  reads as a warning rather than a neutral bar. */
const FILL: Record<CoverageBand, string> = {
  low: 'bg-destructive',
  fair: 'bg-warning',
  good: 'bg-success',
}

const TEXT: Record<CoverageBand, string> = {
  low: 'text-destructive',
  fair: 'text-warning',
  good: 'text-success',
}

/**
 * Coverage as a slim track + mono percentage. Used in the table rows and, in
 * `lg` size, in the summary rail.
 */
export function CoverageMeter({
  value,
  size = 'sm',
  className,
}: {
  value: number
  size?: 'sm' | 'lg'
  className?: string
}) {
  const band = coverageBand(value)
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Beat coverage"
        className={cn(
          'relative block flex-1 overflow-hidden rounded-full bg-muted',
          size === 'lg' ? 'h-2' : 'h-1.5 max-w-24',
        )}
      >
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full', FILL[band])}
          // Floor the fill so a single-digit coverage is still a visible sliver.
          style={{ width: clamped > 0 ? `max(0.375rem, ${clamped}%)` : 0 }}
        />
      </span>
      <span
        className={cn(
          'font-mono tabular-nums',
          size === 'lg' ? 'text-sm font-medium' : 'text-xs',
          TEXT[band],
        )}
      >
        {clamped}%
      </span>
    </div>
  )
}
