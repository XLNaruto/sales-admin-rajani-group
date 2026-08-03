import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Compact page list with ellipses, e.g. [1, 2, 3, 4, 5, '…', 16] — always shows
 * the first and last page plus a window around the current one.
 */
function pageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('ellipsis')
  pages.push(total)
  return pages
}

/**
 * Pagination footer for a card grid.
 *
 * Deliberately mirrors `DataTablePagination` down to the button sizes — a card
 * grid and a table are two renderings of the same idea, and a second pager
 * dialect on the same portal would read as a different product. It stays
 * standalone rather than reusing that component because it pages a plain array,
 * not a TanStack Table instance, and there is no page-size choice to make.
 */
export function CardPagination({
  page,
  pageCount,
  from,
  to,
  total,
  /** Noun used in the "Showing 1 to 6 of 31 days" summary. */
  itemName = 'results',
  onPageChange,
}: {
  page: number
  pageCount: number
  from: number
  to: number
  total: number
  itemName?: string
  onPageChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium tabular-nums text-foreground">{from}</span> to{' '}
        <span className="font-medium tabular-nums text-foreground">{to}</span> of{' '}
        <span className="font-medium tabular-nums text-foreground">{total}</span> {itemName}
      </p>

      <div className="flex items-center gap-1">
        <Hint label="Previous page">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer rounded-sm border-border/50"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </Hint>

        {pageList(page, pageCount).map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`e-${i}`}
              className="px-1.5 text-sm text-muted-foreground"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'size-8 cursor-pointer rounded-sm border-border/50 text-xs tabular-nums',
                p !== page && 'font-normal',
              )}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Hint label="Next page">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer rounded-sm border-border/50"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </Hint>
      </div>
    </div>
  )
}
