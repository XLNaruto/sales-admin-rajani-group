import { CircleDot, ScanFace, UserRound } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import type { FaceRequestStatus, FaceRequestType } from '../types'

export interface FaceRequestFilters {
  search: string
  status: FaceRequestStatus
  type: FaceRequestType | 'all'
  /** `'all'` means every rep; otherwise the id, stringified for the Combobox. */
  salesInchargeId: string
  /** The picked rep's name, kept for the chip — the dropdown is server-paged. */
  salesInchargeName: string
}

const STATUSES: { label: string; value: FaceRequestStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const TYPES: { label: string; value: FaceRequestType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'New registration', value: 'add' },
  { label: 'Re-capture', value: 'edit' },
]

interface Props {
  filters: FaceRequestFilters
  onChange: (patch: Partial<FaceRequestFilters>) => void
  onReset: () => void
  refresh?: RefreshState
}

/**
 * Filter card above the face-request queue. Status has no "all" — the API has
 * none, and omitting it means `pending` — so `pending` is the clear value.
 */
export function FaceRequestToolbar({ filters, onChange, onReset, refresh }: Props) {
  const incharge = useSalesInchargeSelect()

  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Status',
      icon: CircleDot,
      value: filters.status,
      clearValue: 'pending',
      onChange: (v) => onChange({ status: v as FaceRequestStatus }),
      options: STATUSES,
    },
    {
      key: 'type',
      label: 'Type',
      icon: ScanFace,
      value: filters.type,
      onChange: (v) => onChange({ type: v as FaceRequestType | 'all' }),
      options: TYPES,
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
