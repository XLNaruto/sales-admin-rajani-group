import { Store, ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import { MARKET_TYPES } from '../lib/beat-reference'

export interface BeatFilters {
  search: string
  marketType: string
  status: string
}

interface BeatToolbarProps {
  filters: BeatFilters
  onChange: (patch: Partial<BeatFilters>) => void
  onReset: () => void
}

/** Filter card above the beats table — driven by the shared FilterBar. */
export function BeatToolbar({ filters, onChange, onReset }: BeatToolbarProps) {
  const facets: FilterFacet[] = [
    {
      key: 'marketType',
      label: 'Market Type',
      icon: Store,
      value: filters.marketType,
      onChange: (v) => onChange({ marketType: v }),
      searchPlaceholder: 'Search market type',
      options: [{ label: 'All Market Types', value: 'all' }, ...MARKET_TYPES],
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
        placeholder: 'Search by beat name or code…',
      }}
      facets={facets}
      onReset={onReset}
    />
  )
}
