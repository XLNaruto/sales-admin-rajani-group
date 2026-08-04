import { FilterBar } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { StripLegend } from './strip-legend'
import type { AllocationFilters } from '../hooks/use-allocation-list'

/**
 * The month strip's legend plus the shared FilterBar, stacked above the table.
 *
 * Deliberately thin. The old queue had *Pending / Approved* tabs and a "Needs a
 * look" filter; **nothing has a status to filter by now**, so there is nothing for
 * segments to slice. The worklist is the `Completion` column sorted ascending, and
 * the Flags column is what you scan.
 *
 * There is no territory facet either: the endpoint that used to hand down the
 * city options (`/journey-plans/summary`) is gone, and building the list from
 * whatever happens to be on the current page would make the panel shrink as the
 * user narrowed — the exact bug that endpoint existed to prevent.
 */
export function AllocationToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: {
  filters: AllocationFilters
  onChange: (patch: Partial<AllocationFilters>) => void
  onReset: () => void
  refresh?: RefreshState
}) {
  return (
    <div className="space-y-3">
      <StripLegend />
      <FilterBar
        search={{
          value: filters.search,
          onChange: (search) => onChange({ search }),
          placeholder: 'Search incharge or code…',
        }}
        refresh={refresh}
        onReset={onReset}
      />
    </div>
  )
}
