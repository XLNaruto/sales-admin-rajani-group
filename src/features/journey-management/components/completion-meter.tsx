import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { completionBand, type CompletionBand } from '../lib/journey-metrics'

/** Band → fill colour. A low figure is what an admin hunts for, so it reads as
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
 * One of the month's two percentages, as a slim track plus a mono figure.
 *
 * The screens use it twice, for the two questions that matter at different points
 * in the month: **scheduling** (`daysScheduled / daysAllocated`) is the figure
 * that matters before approval, **completion** (`daysWorked / daysScheduled`)
 * after it.
 *
 * Both read **0% when their denominator is zero**, never 100% — so a zero
 * denominator replaces the meter with wording rather than showing a 0% bar that
 * looks like a slow start. What that zero *means* differs per figure, which is why
 * the caller supplies the copy.
 */
export function CompletionMeter({
  value,
  done,
  total,
  emptyLabel = 'Nothing to measure',
  emptyHint,
  size = 'sm',
  ariaLabel = 'Progress',
  className,
}: {
  /** The server's percentage — never recomputed from `done / total`. */
  value: number
  /** Numerator, for the `3/31` suffix. */
  done?: number
  /** Denominator. **Zero replaces the whole meter with `emptyLabel`.** */
  total?: number
  /** What to say when the denominator is zero. */
  emptyLabel?: string
  emptyHint?: string
  size?: 'sm' | 'lg'
  ariaLabel?: string
  className?: string
}) {
  if (total === 0) {
    const chip = (
      <span
        className={cn(
          'inline-flex cursor-default items-center gap-1.5 font-medium text-muted-foreground',
          size === 'lg' ? 'text-sm' : 'text-xs',
          className,
        )}
      >
        {emptyLabel}
      </span>
    )
    return emptyHint ? <Hint label={emptyHint}>{chip}</Hint> : chip
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
        aria-label={ariaLabel}
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
      {done != null && total != null ? (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      ) : null}
    </div>
  )
}
