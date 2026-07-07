import { useState, type ReactNode } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
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
import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'

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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: hidePagination ? undefined : getPaginationRowModel(),
  })

  const showSearch = searchColumn != null || searchPlaceholder != null

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

      <div className="rounded-xl border border-border bg-card">
        <div className={cn('overflow-hidden', hidePagination ? 'rounded-xl' : 'rounded-t-xl')}>
        <Table maxHeight={maxHeight}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
              Array.from({ length: skeletonRows ?? pageSize }).map((_, r) => (
                <TableRow key={`skeleton-${r}`} className="hover:bg-transparent">
                  {columns.map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full max-w-35" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="[&:last-child_td]:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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

        {!hidePagination && (
          <div className="border-t border-border px-4 py-3">
            <DataTablePagination
              table={table}
              itemName={itemName}
              pageSizeOptions={pageSizeOptions}
            />
          </div>
        )}
      </div>
    </div>
  )
}
