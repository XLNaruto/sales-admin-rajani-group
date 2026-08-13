import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Period-over-period change. Growth against a zero base is shown as "New"
 * rather than an infinite percentage — a first-ever sale isn't a 100% lift.
 */
export function GrowthPill({
  current,
  previous,
  className,
}: {
  current: number
  previous: number
  className?: string
}) {
  if (previous === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {current > 0 ? 'New' : '—'}
      </span>
    )
  }

  const change = ((current - previous) / previous) * 100
  const flat = Math.abs(change) < 0.05
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        flat
          ? 'text-muted-foreground'
          : change > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400',
        className,
      )}
    >
      <Icon className="size-3" />
      {Math.abs(change).toFixed(1)}%
    </span>
  )
}

/** Thin inline bar showing a row's share of the report total. */
export function ShareBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}
