import { CalendarRange, CircleDot, Replace, UserRound } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import { PLAN_DATE_WINDOWS, type PlanDateWindow } from '../../lib/plan-date-window'
import type { DayChangeOperation, DayChangeStatus } from '../types'

export interface DayChangeFilters {
  status: DayChangeStatus
  /** `'all'` means both kinds of ask — the endpoint's default is to omit it. */
  operation: DayChangeOperation | 'all'
  /** `'all'` means every rep; otherwise the id, stringified for the Combobox. */
  salesInchargeId: string
  /**
   * The picked rep's name, kept beside the id purely so the active chip and the
   * trigger can read it — a server-searched dropdown only holds the pages
   * loaded so far, so the selection is often not among its options.
   */
  salesInchargeName: string
  window: PlanDateWindow
}

const STATUSES: { label: string; value: DayChangeStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
]

const OPERATIONS: { label: string; value: DayChangeOperation | 'all' }[] = [
  { label: 'Any ask', value: 'all' },
  { label: 'Replaces the day', value: 'update' },
  { label: 'Adds to the day', value: 'create' },
]

interface DayChangeToolbarProps {
  filters: DayChangeFilters
  onChange: (patch: Partial<DayChangeFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/**
 * Filter card above the day-change queue.
 *
 * No search box: the endpoint has no free-text search. Status has no "all"
 * option because the API's enum has none — omitting `status` means `pending`,
 * so `pending` is the facet's clear value rather than a fifth choice. Operation
 * DOES have one, because there omitting the param genuinely means both.
 */
export function DayChangeToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: DayChangeToolbarProps) {
  const incharge = useSalesInchargeSelect()

  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Status',
      icon: CircleDot,
      value: filters.status,
      // The queue is a work list; clearing returns to the open items.
      clearValue: 'pending',
      onChange: (v) => onChange({ status: v as DayChangeStatus }),
      options: STATUSES,
    },
    {
      key: 'operation',
      label: 'Ask',
      icon: Replace,
      value: filters.operation,
      clearValue: 'all',
      onChange: (v) => onChange({ operation: v as DayChangeOperation | 'all' }),
      options: OPERATIONS,
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
    {
      key: 'window',
      label: 'Day being re-planned',
      icon: CalendarRange,
      value: filters.window,
      clearValue: 'all',
      onChange: (v) => onChange({ window: v as PlanDateWindow }),
      options: PLAN_DATE_WINDOWS,
    },
  ]

  return <FilterBar facets={facets} onReset={onReset} refresh={refresh} />
}
