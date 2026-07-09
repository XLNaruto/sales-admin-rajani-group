import { BadgeCheck, ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import { DESIGNATIONS } from '../lib/incharge-form'

export interface SalesmanFilters {
  search: string
  designation: string
  status: string
}

export const INITIAL_FILTERS: SalesmanFilters = { search: '', designation: 'all', status: 'all' }

interface SalesmanToolbarProps {
  filters: SalesmanFilters
  onChange: (patch: Partial<SalesmanFilters>) => void
  onReset: () => void
}

/** Filter card above the salesman table — driven by the shared FilterBar. */
export function SalesmanToolbar({ filters, onChange, onReset }: SalesmanToolbarProps) {
  const facets: FilterFacet[] = [
    {
      key: 'designation',
      label: 'Designation',
      icon: BadgeCheck,
      value: filters.designation,
      onChange: (v) => onChange({ designation: v }),
      searchPlaceholder: 'Search designation',
      options: [
        { label: 'All Designations', value: 'all' },
        ...DESIGNATIONS.map((d) => ({ label: d, value: d })),
      ],
    },
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
        placeholder: 'Search by name, email or mobile…',
      }}
      facets={facets}
      onReset={onReset}
    />
  )
}
