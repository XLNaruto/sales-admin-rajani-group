import { ClipboardCheck, Store, ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { ONBOARDING_STATUSES, RETAILER_STATUSES } from '../lib/retailer-reference'
import { useOutletTypeOptions } from '../hooks/use-retailer-selects'

export interface RetailerFilters {
  search: string
  outletTypeId: string
  onboardingStatus: string
  status: string
}

interface RetailerToolbarProps {
  filters: RetailerFilters
  onChange: (patch: Partial<RetailerFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/** Filter card above the retailers table — driven by the shared FilterBar. */
export function RetailerToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: RetailerToolbarProps) {
  const outletTypes = useOutletTypeOptions()

  const facets: FilterFacet[] = [
    {
      key: 'outletTypeId',
      label: 'Outlet Type',
      icon: Store,
      value: filters.outletTypeId,
      onChange: (v) => onChange({ outletTypeId: v }),
      searchPlaceholder: 'Search outlet type',
      options: [{ label: 'All Outlet Types', value: 'all' }, ...outletTypes.options],
    },
    {
      key: 'onboardingStatus',
      label: 'Onboarding',
      icon: ClipboardCheck,
      value: filters.onboardingStatus,
      onChange: (v) => onChange({ onboardingStatus: v }),
      searchPlaceholder: 'Search onboarding status',
      options: [{ label: 'All Onboarding', value: 'all' }, ...ONBOARDING_STATUSES],
    },
    {
      key: 'status',
      label: 'Status',
      icon: ToggleLeft,
      value: filters.status,
      onChange: (v) => onChange({ status: v }),
      searchPlaceholder: 'Search status',
      options: [{ label: 'All Status', value: 'all' }, ...RETAILER_STATUSES],
    },
  ]

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => onChange({ search: v }),
        placeholder: 'Search by shop, owner, mobile or code…',
      }}
      facets={facets}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
