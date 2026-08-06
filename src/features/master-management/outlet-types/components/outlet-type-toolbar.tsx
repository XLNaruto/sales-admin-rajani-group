import { FilterBar } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'

export interface OutletTypeFilters {
  search: string
}

interface OutletTypeToolbarProps {
  filters: OutletTypeFilters
  onChange: (patch: Partial<OutletTypeFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/**
 * Filter card above the outlet-type table. Name search only — the master has no
 * other column to facet on now that status is gone.
 */
export function OutletTypeToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: OutletTypeToolbarProps) {
  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => onChange({ search: v }),
        placeholder: 'Search by outlet type name…',
      }}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
