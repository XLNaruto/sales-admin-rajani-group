import { Skeleton } from '@/components/ui/skeleton'

/** Timeline rows — a screenful of the scroll box, no more. */
const ROWS = Array.from({ length: 6 }, (_, i) => i)

/**
 * One day's trail while it loads.
 *
 * Shaped like the two panels it precedes — sidebar (counter tiles, fact list,
 * timeline) beside the map — so the screen doesn't jump when the response lands. A
 * centred spinner gave the page no height at all, and the header above it sat on a
 * collapsed body until the day arrived.
 */
export function DaySkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[21rem_1fr]" aria-busy aria-label="Loading the day">
      <aside className="min-w-0 rounded-xl border border-border/60 bg-card p-4">
        {/* Counter tiles — the real 3 × 2 grid of six. */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((tile) => (
            <div
              key={tile}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2 py-2.5"
            >
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-2 w-7" />
            </div>
          ))}
        </div>

        {/* Fact list — label left, value right, same as the real rows. */}
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center justify-between gap-3">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-3" style={{ width: `${34 + ((row * 19) % 26)}%` }} />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-1.5 border-t border-border/50 pt-3">
          <Skeleton className="mt-0.5 size-3 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </div>

        {/* Timeline — section heading, then numbered rows. */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
        <ul className="mt-2 space-y-2.5">
          {ROWS.map((row) => (
            <li key={row} className="flex items-start gap-2.5">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3" style={{ width: `${56 + ((row * 23) % 32)}%` }} />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-2.5 w-9 shrink-0" />
            </li>
          ))}
        </ul>
      </aside>

      {/* Map panel — same height as the real one, with the km overlay's silhouette
          so that corner isn't empty while the tiles are still coming. */}
      <section className="relative min-h-104 min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card sm:min-h-136">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute right-3 top-3 space-y-2 rounded-lg border border-border/60 bg-card/95 px-3 py-2 shadow-sm">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-5 w-16" />
        </div>
      </section>
    </div>
  )
}
