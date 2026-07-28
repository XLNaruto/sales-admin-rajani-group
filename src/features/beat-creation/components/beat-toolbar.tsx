import { Route } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { BEAT_GRADES } from '../lib/beat-reference'

export interface BeatFilters {
  search: string
  /** A beat-grade value, or 'all'. */
  grade: string
}

interface BeatToolbarProps {
  filters: BeatFilters
  onChange: (patch: Partial<BeatFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/** Filter card above the beats table — search + beat-grade facet. */
export function BeatToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: BeatToolbarProps) {
  const facets: FilterFacet[] = [
    {
      key: 'grade',
      label: 'Grade',
      icon: Route,
      value: filters.grade,
      onChange: (v) => onChange({ grade: v }),
      searchPlaceholder: 'Search grade',
      options: [{ label: 'All Grades', value: 'all' }, ...BEAT_GRADES],
    },
  ]

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => onChange({ search: v }),
        placeholder: 'Search by beat name…',
      }}
      facets={facets}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
