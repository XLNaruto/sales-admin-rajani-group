import type { Table } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  /** Column id to filter with the search box. Omit to filter across all columns. */
  searchColumn?: string
  searchPlaceholder?: string
}

/**
 * Search/filter toolbar. Filters a single column when `searchColumn` is set,
 * otherwise falls back to the table-wide global filter.
 */
export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder = 'Search...',
}: DataTableToolbarProps<TData>) {
  const column = searchColumn ? table.getColumn(searchColumn) : undefined
  const value = searchColumn
    ? ((column?.getFilterValue() as string) ?? '')
    : ((table.getState().globalFilter as string) ?? '')
  const isFiltered = value.length > 0

  const setValue = (next: string) =>
    searchColumn ? column?.setFilterValue(next) : table.setGlobalFilter(next)

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 pl-9"
        />
      </div>
      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 cursor-pointer px-2"
          onClick={() => setValue('')}
        >
          Reset
          <X className="ml-1 size-4" />
        </Button>
      )}
    </div>
  )
}
