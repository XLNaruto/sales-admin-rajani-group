import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { completionBand, type CompletionBand } from '../lib/journey-metrics'

/** Band → fill colour. Low completion is what an admin hunts for, so it reads as
 *  a warning rather than a neutral bar. */
const FILL: Record<CompletionBand, string> = {
  low: 'bg-destructive',
  fair: 'bg-warning',
  good: 'bg-success',
}

const TEXT: Record<CompletionBand, string> = {
  low: 'text-destructive',
  fair: 'text-warning',
  good: 'text-success',
}

/**
 * Progress through the month's beat list — `beatsWorked / beatsAllocated`, as a
 * slim track plus a mono percentage.
 *
 * **Zero with nothing allocated is not "not started", it is a flag**: a rep with
 * no beats has not finished his month, he was never given one. So that case gets
 * its own reading rather than a 0% bar that looks like a slow start.
 */
export function CompletionMeter({
  value,
  worked,
  allocated,
  size = 'sm',
  className,
}: {
  /** `completion_percentage`, the server's figure. */
  value: number
  /** Distinct listed beats worked at least once. */
  worked?: number
  /** Beats on the month's list. */
  allocated?: number
  size?: 'sm' | 'lg'
  className?: string
}) {
  if (allocated === 0) {
    return (
      <Hint label="No beats are on this month’s list, so there is nothing to work through.">
        <span
          className={cn(
            'inline-flex cursor-default items-center gap-1.5 font-medium text-destructive',
            size === 'lg' ? 'text-sm' : 'text-xs',
            className,
          )}
        >
          Nothing allocated
        </span>
      </Hint>
    )
  }

  const band = completionBand(value)
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Beats worked of beats allocated"
        className={cn(
          'relative block flex-1 overflow-hidden rounded-full bg-muted',
          size === 'lg' ? 'h-2' : 'h-1.5 max-w-24',
        )}
      >
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full', FILL[band])}
          // Floor the fill so a single-digit figure is still a visible sliver.
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
      {worked != null && allocated != null ? (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {worked}/{allocated}
        </span>
      ) : null}
    </div>
  )
}
