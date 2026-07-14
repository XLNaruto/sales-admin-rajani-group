import { ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'

export interface SalesmanFilters {
  search: string
  status: string
}

export const INITIAL_FILTERS: SalesmanFilters = { search: '', status: 'all' }

interface SalesmanToolbarProps {
  filters: SalesmanFilters
  onChange: (patch: Partial<SalesmanFilters>) => void
  onReset: () => void
}

/** Filter card above the sales-incharge table — driven by the shared FilterBar. */
export function SalesmanToolbar({ filters, onChange, onReset }: SalesmanToolbarProps) {
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
        { label: 'Invited', value: 'invited' },
        { label: 'Suspended', value: 'suspended' },
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
    />
  )
}
