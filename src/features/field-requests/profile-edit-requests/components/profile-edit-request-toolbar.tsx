import { CircleDot, UserRound } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import type { ProfileEditRequestStatus } from '../types'

export interface ProfileEditRequestFilters {
  search: string
  status: ProfileEditRequestStatus
  /** `'all'` means every rep; otherwise the id, stringified for the Combobox. */
  salesInchargeId: string
  /**
   * The picked rep's name, kept beside the id purely so the active chip and the
   * trigger can read it — a server-searched dropdown only holds the pages
   * loaded so far, so the selection is often not among its options.
   */
  salesInchargeName: string
}

const STATUSES: { label: string; value: ProfileEditRequestStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

interface ProfileEditRequestToolbarProps {
  filters: ProfileEditRequestFilters
  onChange: (patch: Partial<ProfileEditRequestFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/**
 * Filter card above the profile-edit queue.
 *
 * Status has no "all" option because the API's enum has none — omitting
 * `status` means `pending`, so `pending` is the facet's clear value rather than
 * a fourth choice.
 */
export function ProfileEditRequestToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: ProfileEditRequestToolbarProps) {
  const incharge = useSalesInchargeSelect()

  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Status',
      icon: CircleDot,
      value: filters.status,
      // The queue is a work list; clearing returns to the open items.
      clearValue: 'pending',
      onChange: (v) => onChange({ status: v as ProfileEditRequestStatus }),
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
        placeholder: 'Search by name, phone or employee code…',
      }}
      facets={facets}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
