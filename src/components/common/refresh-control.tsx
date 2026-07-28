import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'

/**
 * Everything a list screen must hand over to render the refresh control.
 * Feature list hooks build this from their list query so pages stay dumb.
 */
export interface RefreshState {
  /** Refetch the list from the server (usually the query's `refetch`). */
  onRefresh: () => void
  /** Epoch ms of the last successful fetch (TanStack's `dataUpdatedAt`). */
  updatedAt?: number
  /** A fetch is in flight — spins the icon and disables the button. */
  isFetching?: boolean
}

interface RefreshControlProps extends RefreshState {
  /** Hide the "Fetched …" label and render the icon button only. */
  compact?: boolean
  /** `sm` matches a 32px control cluster (e.g. the hierarchy zoom pill). */
  size?: 'default' | 'sm'
  className?: string
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * AWS-console-style age label: "just now", "a few seconds ago", "2 minutes
 * ago", "1 hour ago", "3 days ago".
 */
export function formatAge(updatedAt: number, now: number): string {
  const diff = Math.max(0, now - updatedAt)

  if (diff < 5 * SECOND) return 'just now'
  if (diff < MINUTE) return 'a few seconds ago'
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return m === 1 ? '1 minute ago' : `${m} minutes ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return h === 1 ? '1 hour ago' : `${h} hours ago`
  }
  const d = Math.floor(diff / DAY)
  return d === 1 ? '1 day ago' : `${d} days ago`
}

/**
 * How often to re-render the label. Fine-grained while the data is fresh,
 * lazier as it ages — a 3-hour-old timestamp doesn't need a 5s timer.
 */
function tickInterval(diff: number): number {
  if (diff < MINUTE) return 5 * SECOND
  if (diff < HOUR) return 30 * SECOND
  return 5 * MINUTE
}

/** Exact timestamp for the tooltip — "28 Jul 2026, 12:28 PM". */
function formatExact(updatedAt: number): string {
  return new Date(updatedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Live-updating "x ago" text for a timestamp. */
function useAge(updatedAt: number | undefined): string | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!updatedAt) return
    // Re-arm after every tick so the cadence follows the age of the data.
    const delay = tickInterval(Date.now() - updatedAt)
    const id = setTimeout(() => setNow(Date.now()), delay)
    return () => clearTimeout(id)
  }, [updatedAt, now])

  if (!updatedAt) return null
  return formatAge(updatedAt, now)
}

/**
 * Refresh button + "Fetched x ago" for a list screen. Sits in the filter card
 * above the table (see `FilterBar`) so every list refreshes the same way.
 */
export function RefreshControl({
  onRefresh,
  updatedAt,
  isFetching = false,
  compact = false,
  size = 'default',
  className,
}: RefreshControlProps) {
  const age = useAge(updatedAt)
  const exact = updatedAt ? formatExact(updatedAt) : null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!compact && age ? (
        // Shown at every breakpoint — on mobile the icon alone read as an
        // unlabelled, half-rendered control.
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Fetched {isFetching ? 'now…' : age}
        </span>
      ) : null}

      <Hint label={exact ? `Refresh · last fetched ${exact}` : 'Refresh'}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label="Refresh list"
          className={cn(
            'inline-flex cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors',
            size === 'sm' ? 'size-8' : 'size-10',
            'hover:text-primary',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
        </button>
      </Hint>
    </div>
  )
}
