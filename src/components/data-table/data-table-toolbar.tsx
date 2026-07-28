import type { Table } from '@tanstack/react-table'
import { FilterBar } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  /** Column id to filter with the search box. Omit to filter across all columns. */
  searchColumn?: string
  searchPlaceholder?: string
  /** Shows the refresh button + "Fetched x ago" beside the search box. */
  refresh?: RefreshState
}

/**
 * Search/filter toolbar. Filters a single column when `searchColumn` is set,
 * otherwise falls back to the table-wide global filter. Renders the shared
 * `FilterBar` (search-only — no facets) so every list screen reads the same.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder = 'Search...',
  refresh,
}: DataTableToolbarProps<TData>) {
  const column = searchColumn ? table.getColumn(searchColumn) : undefined
  const value = searchColumn
    ? ((column?.getFilterValue() as string) ?? '')
    : ((table.getState().globalFilter as string) ?? '')

  const setValue = (next: string) =>
    searchColumn ? column?.setFilterValue(next) : table.setGlobalFilter(next)

  return (
    <FilterBar
      search={{ value, onChange: setValue, placeholder: searchPlaceholder }}
      onReset={() => setValue('')}
      refresh={refresh}
    />
  )
}
