import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

/**
 * Sentinel page size meaning "load everything, lazily". When the footer's page-
 * size selector is set to "All", the pagination state carries this value; the
 * feature hook detects it and switches to an infinite (append-on-scroll) query
 * instead of fetching every row in a single request.
 */
export const ALL_PAGE_SIZE = -1

/** Default rows fetched per infinite-scroll batch when "All" is selected. */
export const INFINITE_BATCH_SIZE = 100

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  /** Noun used in the "Showing 1 to 10 of 42 vehicles" summary. */
  itemName?: string
  /** Page-size choices; omit to hide the selector. */
  pageSizeOptions?: number[]
  /** Infinite ("All") mode — hides the numeric pager and shows a loaded/total summary. */
  infinite?: boolean
  /** Rows loaded so far (used for the infinite-mode summary). */
  loadedCount?: number
}

/**
 * Build a compact page list with ellipses, e.g. [1, 2, 3, 4, 5, '…', 16].
 * Always shows first + last, plus a window around the current page.
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

/** Pagination footer for the generic DataTable. */
export function DataTablePagination<TData>({
  table,
  itemName = 'results',
  pageSizeOptions,
  infinite = false,
  loadedCount = 0,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  // Total rows across all pages — respects server-side (`rowCount`) pagination
  // and falls back to the filtered client row count otherwise.
  const total = table.getRowCount()
  // In infinite mode the numeric pager is meaningless — collapse to one page.
  const pageCount = infinite ? 1 : table.getPageCount() || 1
  const from = total === 0 ? 0 : infinite ? 1 : pageIndex * pageSize + 1
  const to = infinite
    ? loadedCount
    : Math.min(total, (pageIndex + 1) * pageSize)

  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:items-center">
      {/* Left: summary */}
      <p className="text-sm text-muted-foreground sm:justify-self-start">
        Showing <span className="font-medium text-foreground tabular-nums">{from}</span> to{' '}
        <span className="font-medium text-foreground tabular-nums">{to}</span> of{' '}
        <span className="font-medium text-foreground tabular-nums">{total}</span> {itemName}
      </p>

      {/* Controls + page size share one row on mobile; `contents` restores the
          3-column grid on sm+ so each lands in its own column. */}
      <div className="flex items-center justify-between sm:contents">
      {/* Center: page controls — hidden when everything fits on one page. */}
      {pageCount > 1 ? (
        <div className="flex items-center gap-1 sm:justify-self-center">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer rounded-sm border-border/50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pageList(pageIndex + 1, pageCount).map((p, i) =>
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
                variant={p === pageIndex + 1 ? 'default' : 'outline'}
                size="icon"
                className={cn(
                  'size-8 cursor-pointer rounded-sm border-border/50 text-xs tabular-nums',
                  p !== pageIndex + 1 && 'font-normal',
                )}
                onClick={() => table.setPageIndex(p - 1)}
                aria-label={`Page ${p}`}
                aria-current={p === pageIndex + 1 ? 'page' : undefined}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer rounded-sm border-border/50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div aria-hidden="true" />
      )}

      {/* Right: page size */}
      {pageSizeOptions?.length ? (
        <div className="sm:justify-self-end">
          <Combobox
            className="w-17 border-border/50"
            align="end"
            searchable={false}
            // "All" maps to the infinite sentinel; otherwise the exact page size.
            value={
              infinite || pageSize === ALL_PAGE_SIZE
                ? 'all'
                : pageSizeOptions.includes(pageSize)
                  ? String(pageSize)
                  : String(pageSize)
            }
            onChange={(v) =>
              // `setPageSize` clamps to >= 1, so set the "All" sentinel directly
              // via `setPagination` (also resets to the first batch).
              v === 'all'
                ? table.setPagination((old) => ({
                    ...old,
                    pageIndex: 0,
                    pageSize: ALL_PAGE_SIZE,
                  }))
                : table.setPageSize(Number(v))
            }
            options={[
              ...pageSizeOptions.map((n) => ({ label: String(n), value: String(n) })),
              { label: 'All', value: 'all' },
            ]}
          />
        </div>
      ) : null}
      </div>
    </div>
  )
}
