import { Skeleton } from '@/components/ui/skeleton'

/** Twelve cards — enough to fill the first screen at every breakpoint, no more. */
const CARDS = Array.from({ length: 12 }, (_, i) => i)

/**
 * The live map's month while it loads.
 *
 * Shaped like the grid it precedes — stat rail, scope segments, then a page of day
 * cards — so nothing reflows when the response lands. A centred spinner said only
 * "wait", and the header's figures underneath it read as a real zero month until
 * the data replaced them.
 */
export function LiveMapSkeleton() {
  return (
    <div aria-busy aria-label="Loading the month">
      {/* Stat rail — five cells, same hairline grid as the real one. */}
      <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-0 space-y-2.5 px-4 py-3.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-3.5 w-48" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {CARDS.map((i) => (
          <DayCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * One day card's silhouette: date row, activity badge, the two fields, the 3 × 2
 * counter block, then the footer link. `index` only staggers the bar widths — a
 * grid of identical bars reads as a rendering artefact rather than as content.
 */
function DayCardSkeleton({ index }: { index: number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/60 bg-card p-3 shadow-[rgba(99,99,99,0.12)_0px_1px_4px_0px]">
      <Skeleton className="h-4 w-36" />

      <div className="mt-2 flex items-center gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>

      <div className="mt-2 space-y-1">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5" style={{ width: `${58 + ((index * 13) % 30)}%` }} />
        <Skeleton className="h-2.5 w-24" />
      </div>

      <div className="mt-2 space-y-1">
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-3.5" style={{ width: `${44 + ((index * 17) % 34)}%` }} />
      </div>

      {/* Counters — same 3 × 2 grid and hairlines the real block draws. */}
      <div className="mt-2.5 grid grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((cell) => (
          <div
            key={cell}
            className={
              cell % 3 !== 0
                ? 'flex flex-col items-center gap-1.5 border-l border-t border-border/40 px-1 py-1.5'
                : 'flex flex-col items-center gap-1.5 border-t border-border/40 px-1 py-1.5'
            }
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-2 w-7" />
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="size-3 rounded-sm" />
      </div>
    </div>
  )
}
