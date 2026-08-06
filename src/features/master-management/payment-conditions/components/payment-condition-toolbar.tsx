import { FilterBar } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'

export interface PaymentConditionFilters {
  search: string
}

interface PaymentConditionToolbarProps {
  filters: PaymentConditionFilters
  onChange: (patch: Partial<PaymentConditionFilters>) => void
  onReset: () => void
  /** Refresh button + "Fetched x ago" shown in the filter card. */
  refresh?: RefreshState
}

/**
 * Filter card above the payment-condition table. Name search only — the
 * master's single column is all there is to facet on.
 */
export function PaymentConditionToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: PaymentConditionToolbarProps) {
  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (v) => onChange({ search: v }),
        placeholder: 'Search by payment condition name…',
      }}
      onReset={onReset}
      refresh={refresh}
    />
  )
}
