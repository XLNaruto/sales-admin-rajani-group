import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ALL_PAGE_SIZE, DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra classes for this column's header + cells (e.g. `w-px whitespace-nowrap` to shrink to content). */
    className?: string
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Show pulsing skeleton rows instead of data (initial fetch). */
  isLoading?: boolean
  /** How many skeleton rows to render while loading (defaults to `pageSize`). */
  skeletonRows?: number
  /** Optional empty-state message (used when `emptyState` is not given). */
  emptyMessage?: string
  /** Rich empty-state block rendered in place of `emptyMessage`. */
  emptyState?: ReactNode
  /** Render a compact table without pagination footer. */
  hidePagination?: boolean
  /** Column id to scope the search box to. Omit for a table-wide search. */
  searchColumn?: string
  /** Show the built-in search box with this placeholder. */
  searchPlaceholder?: string
  /** Custom toolbar rendered above the table (replaces the built-in search). */
  toolbar?: ReactNode
  /** Initial rows per page. */
  pageSize?: number
  /** Page-size choices; pass to show a "N / page" selector in the footer. */
  pageSizeOptions?: number[]
  /** Noun for the footer summary ("Showing 1 to 10 of 42 salesmen"). */
  itemName?: string
  /** Cap the table body height; enables vertical scroll with a sticky header. */
  maxHeight?: string
  className?: string
  /**
   * Server-side pagination. When true, `data` is treated as the current page
   * (not sliced client-side); supply `pagination` + `onPaginationChange` and
   * `rowCount` (total rows across all pages) to drive the footer.
   */
  manualPagination?: boolean
  /** Controlled pagination state (required when `manualPagination`). */
  pagination?: PaginationState
  /** Pagination change handler (required when `manualPagination`). */
  onPaginationChange?: OnChangeFn<PaginationState>
  /** Total rows across all pages — powers the summary + page count when manual. */
  rowCount?: number
  /**
   * Server-side sorting. When true, `data` is shown in server order; supply
   * `sorting` + `onSortingChange` so header clicks re-query rather than sort
   * the current page only.
   */
  manualSorting?: boolean
  /** Controlled sorting state (required when `manualSorting`). */
  sorting?: SortingState
  /** Sorting change handler (required when `manualSorting`). */
  onSortingChange?: OnChangeFn<SortingState>
  /**
   * Infinite-scroll ("All") support. When `onLoadMore` is supplied, the table
   * watches its scroll container and calls it as the user nears the bottom,
   * provided `hasMore` is true and a fetch isn't already in flight. Pair with a
   * feature hook that appends each batch to `data`. Only active while the page
   * size is `ALL_PAGE_SIZE`; the numeric pager is hidden and a loading row shows.
   */
  onLoadMore?: () => void
  /** Whether another batch remains to load (drives the scroll trigger). */
  hasMore?: boolean
  /** Whether the next batch is currently loading (shows a bottom loading row). */
  isFetchingMore?: boolean
}

/**
 * The ONE generic data table for every list screen (CLAUDE.md rule #7).
 * Feature screens supply `columns` + `data`; do not rebuild tables per feature.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  skeletonRows,
  emptyMessage = 'No results.',
  emptyState,
  hidePagination = false,
  searchColumn,
  searchPlaceholder,
  toolbar,
  pageSize = 5,
  pageSizeOptions,
  itemName,
  maxHeight,
  className,
  manualPagination = false,
  pagination: paginationProp,
  onPaginationChange,
  rowCount,
  manualSorting = false,
  sorting: sortingProp,
  onSortingChange,
  onLoadMore,
  hasMore = false,
  isFetchingMore = false,
}: DataTableProps<TData, TValue>) {
  // Sorting + pagination can be controlled by the caller (server-side) or fall
  // back to internal state (client-side). Controlled props win when supplied.
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const sorting = sortingProp ?? internalSorting
  const pagination = paginationProp ?? internalPagination

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    manualPagination,
    manualSorting,
    rowCount: manualPagination ? rowCount : undefined,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel:
      hidePagination || manualPagination ? undefined : getPaginationRowModel(),
  })

  const showSearch = searchColumn != null || searchPlaceholder != null
  // Hide the pagination footer when there's nothing to page through.
  const hasRows = table.getRowModel().rows.length > 0

  // Infinite ("All") mode: active only when the caller wires up `onLoadMore`
  // AND the current page size is the "All" sentinel.
  const isInfinite = onLoadMore != null && pagination.pageSize === ALL_PAGE_SIZE

  // Scroll container ref + near-bottom detection that drives `onLoadMore`.
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  const maybeLoadMore = useCallback(() => {
    const el = scrollRef.current
    if (!el || !isInfinite || !hasMore || isFetchingMore) return
    // Trigger when within ~150px of the bottom so the next batch is ready
    // before the user hits the very end.
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreRef.current?.()
    }
  }, [isInfinite, hasMore, isFetchingMore])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isInfinite) return
    el.addEventListener('scroll', maybeLoadMore)
    // Content shorter than the viewport never scrolls — kick a check so the
    // next batch still loads until the container fills or data runs out.
    maybeLoadMore()
    return () => el.removeEventListener('scroll', maybeLoadMore)
  }, [isInfinite, maybeLoadMore])

  return (
    <div className={cn('w-full space-y-4', className)}>
      {toolbar ??
        (showSearch && (
          <DataTableToolbar
            table={table}
            searchColumn={searchColumn}
            searchPlaceholder={searchPlaceholder}
          />
        ))}

      <div className="rounded-xl border border-border/50 bg-card shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]">
        <div className={cn('overflow-hidden', hidePagination || !hasRows ? 'rounded-xl' : 'rounded-t-xl')}>
        <Table maxHeight={maxHeight} containerRef={scrollRef}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({
                length: skeletonRows ?? (pageSize > 0 ? pageSize : 10),
              }).map((_, r) => (
                <TableRow key={`skeleton-${r}`} className="hover:bg-transparent">
                  {columns.map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full max-w-35" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="[&:last-child_td]:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.columnDef.meta?.className}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {isInfinite && isFetchingMore ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length}
                      className="border-0 py-4 text-center text-sm text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading more…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : null}
              </>
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className={cn(
                    'border-0 text-center text-muted-foreground',
                    emptyState ? 'p-0' : 'h-28',
                  )}
                >
                  {emptyState ?? emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {!hidePagination && hasRows && (
          <div className="border-t border-border px-4 py-3">
            <DataTablePagination
              table={table}
              itemName={itemName}
              pageSizeOptions={pageSizeOptions}
              infinite={isInfinite}
              loadedCount={table.getRowModel().rows.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}
