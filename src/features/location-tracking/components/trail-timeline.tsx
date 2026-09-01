import { useEffect, useRef } from 'react'
import { MapPin, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fixTime } from '../lib/location-format'
import type { TrailPoint } from '../types'

/**
 * Every recorded fix of the day, in the order it was recorded.
 *
 * The list holds **all** the points even when the map's line has been thinned
 * for drawing — the whole day stays inspectable, which is the point of keeping a
 * timeline next to the map at all. Rows and markers share one selection, so
 * clicking either side moves the other.
 */
export function TrailTimeline({
  points,
  selectedId,
  onSelect,
  className,
}: {
  points: TrailPoint[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  className?: string
}) {
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the selected row in view when the selection came from the map.
  useEffect(() => {
    if (!selectedId) return
    const row = listRef.current?.querySelector(`[data-point-id="${selectedId}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  if (!points.length) {
    return (
      <div
        className={cn(
          'grid place-items-center rounded-xl border border-dashed bg-card/50 px-4 py-10 text-center',
          className,
        )}
      >
        <p className="text-sm font-medium text-foreground">No positions recorded</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing to walk through for this date.
        </p>
      </div>
    )
  }

  return (
    <ol
      ref={listRef}
      className={cn(
        'divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/60 bg-card',
        className,
      )}
    >
      {points.map((point, index) => {
        const selected = point.id === selectedId
        return (
          <li key={point.id} data-point-id={point.id}>
            <button
              type="button"
              onClick={() => onSelect(selected ? null : point.id)}
              aria-current={selected || undefined}
              className={cn(
                'flex w-full cursor-pointer items-start gap-3 px-3.5 py-2.5 text-left transition-colors',
                selected ? 'bg-primary/5' : 'hover:bg-accent',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold tabular-nums',
                  point.isFakeLocation
                    ? 'bg-destructive/10 text-destructive'
                    : selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {point.isFakeLocation ? <ShieldAlert className="size-3.5" /> : index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {fixTime(point.recordedAt) ?? '—'}
                  </span>
                  {point.beatName ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" />
                      {point.beatName}
                    </span>
                  ) : (
                    // Travelling, or simply outside any beat. Normal, so it is
                    // stated plainly rather than flagged.
                    <span className="text-[11px] text-muted-foreground">
                      Outside any beat
                    </span>
                  )}
                </span>
                {/* The coordinate exactly as the ledger holds it — the strings
                    are never rounded through a float for display. */}
                <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                  {point.latitude}, {point.longitude}
                </span>
                {point.isFakeLocation && (
                  <span className="mt-1 block text-[11px] font-medium text-destructive">
                    Fake location reported by device
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
