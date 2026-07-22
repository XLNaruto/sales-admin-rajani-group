import { Building2, ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import { FIRM_TYPES } from '../lib/distributor-reference'

export interface DistributorFilters {
  search: string
  firmType: string
  status: string
}

interface DistributorToolbarProps {
  filters: DistributorFilters
  onChange: (patch: Partial<DistributorFilters>) => void
  onReset: () => void
}

/** Filter card above the distributors table — driven by the shared FilterBar. */
export function DistributorToolbar({ filters, onChange, onReset }: DistributorToolbarProps) {
  const facets: FilterFacet[] = [
    {
      key: 'firmType',
      label: 'Firm Type',
      icon: Building2,
      value: filters.firmType,
      onChange: (v) => onChange({ firmType: v }),
      searchPlaceholder: 'Search firm type',
      options: [{ label: 'All Firm Types', value: 'all' }, ...FIRM_TYPES],
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
        placeholder: 'Search by firm, owner or code…',
      }}
      facets={facets}
      onReset={onReset}
    />
  )
}
