import { Skeleton } from '@/components/ui/skeleton'

/**
 * The allocation screen while it loads.
 *
 * Shaped like the screen it precedes — header card, progress rail, warnings bar,
 * beat list, month table — so the layout doesn't jump when the data lands. A
 * centred spinner told the admin nothing about what was coming and reflowed the
 * whole page the moment it did.
 *
 * `withHeader` is false once the rep list has arrived: the picker and the month
 * pager are driven by that list, not by the allocation, so they render live and
 * stay usable while the month behind them is still in flight.
 */
export function PlanSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div aria-busy aria-label="Loading the month">
      {withHeader ? (
        <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-2.5 w-28" />
                <Skeleton className="h-6 w-48" />
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-9 w-44 rounded-lg" />
          </div>
        </div>
      ) : null}

      {/* Progress rail — four cells, same hairline grid as the real one. */}
      <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-4 sm:divide-x">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-w-0 space-y-2.5 px-4 py-3.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {/* Warnings bar — one line tall, like the "nothing to look at" state. */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-4 py-3.5">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Beat list — header, search row, then a few rows of checkbox + name. */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <div className="border-b border-border/60 px-4 py-2.5">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="divide-y divide-border/40">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton className="size-5 shrink-0 rounded" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Staggered widths: a column of identical bars reads as a
                      rendering artefact rather than as a list of names. */}
                  <Skeleton className="h-4" style={{ width: `${38 + ((i * 13) % 26)}%` }} />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Month table — header row plus a handful of day rows. */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="bg-muted/40 px-4 py-2.5">
            <Skeleton className="h-2.5 w-full max-w-md" />
          </div>
          <div className="divide-y divide-border/40">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-12 shrink-0" />
                <Skeleton className="h-4 w-24 shrink-0" />
                <Skeleton className="h-8 w-56 shrink-0 rounded-lg" />
                <Skeleton className="h-4" style={{ width: `${18 + ((i * 11) % 22)}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
