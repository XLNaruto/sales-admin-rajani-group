import { ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'

export interface SalesmanFilters {
  search: string
  status: string
}

interface SalesmanToolbarProps {
  filters: SalesmanFilters
  onChange: (patch: Partial<SalesmanFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/** Filter card above the sales-incharge table — driven by the shared FilterBar. */
export function SalesmanToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: SalesmanToolbarProps) {
  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Status',
      icon: ToggleLeft,
      value: filters.status,
      onChange: (v) => onChange({ status: v }),
      searchPlaceholder: 'Search status',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ]

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => onChange({ search: v }),
        placeholder: 'Search by name or phone…',
      }}
      facets={facets}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
