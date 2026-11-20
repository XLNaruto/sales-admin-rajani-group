import { CircleDot, UserRound } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import type { RetailerEditRequestStatus } from '../types'

export interface RetailerEditRequestFilters {
  search: string
  status: RetailerEditRequestStatus
  /** `'all'` means every rep; otherwise the id, stringified for the Combobox. */
  salesInchargeId: string
  /** The picked rep's name, kept for the chip — the dropdown is server-paged. */
  salesInchargeName: string
}

const STATUSES: { label: string; value: RetailerEditRequestStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

interface Props {
  filters: RetailerEditRequestFilters
  onChange: (patch: Partial<RetailerEditRequestFilters>) => void
  onReset: () => void
  refresh?: RefreshState
}

/**
 * Filter card above the retailer-edit queue. Status has no "all" — the API has
 * none, and omitting it means `pending` — so `pending` is the clear value.
 */
export function RetailerEditRequestToolbar({ filters, onChange, onReset, refresh }: Props) {
  const incharge = useSalesInchargeSelect()

  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Status',
      icon: CircleDot,
      value: filters.status,
      clearValue: 'pending',
      onChange: (v) => onChange({ status: v as RetailerEditRequestStatus }),
      options: STATUSES,
    },
    {
      key: 'sales-incharge',
      label: 'Sales Incharge',
      icon: UserRound,
      value: filters.salesInchargeId,
      searchable: true,
      searchPlaceholder: 'Search sales incharge',
      onSearchChange: incharge.onSearchChange,
      onScrollEnd: incharge.onScrollEnd,
      loading: incharge.loading,
      valueLabel:
        filters.salesInchargeId === 'all' ? undefined : filters.salesInchargeName,
      onChange: (v) =>
        onChange({
          salesInchargeId: v,
          salesInchargeName:
            incharge.options.find((o) => o.value === v)?.label ??
            (v === 'all' ? '' : filters.salesInchargeName),
        }),
      options: [{ label: 'All Sales Incharges', value: 'all' }, ...incharge.options],
    },
  ]

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => onChange({ search: v }),
        placeholder: 'Search by shop, retailer code, rep name, phone or employee code…',
      }}
      facets={facets}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
