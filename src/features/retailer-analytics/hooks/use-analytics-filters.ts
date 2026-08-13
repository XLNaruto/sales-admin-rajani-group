import { useState } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { AnalyticsFilters } from '../types'

/** Default view: the current month, whole territory, all products. */
const INITIAL_FILTERS: AnalyticsFilters = {
  period: 'this-month',
  zoneId: 'all',
  districtId: 'all',
  cityId: 'all',
  beatId: 'all',
  productId: 'all',
}

/**
 * The one filter set every analytics report reads from, plus the refresh
 * control that re-pulls all of them at once. Held here rather than in each
 * panel so switching tabs keeps the territory you were looking at.
 */
export function useAnalyticsFilters() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AnalyticsFilters>(INITIAL_FILTERS)
  const [refreshedAt, setRefreshedAt] = useState<number>(() => Date.now())

  // Any analytics query in flight spins the refresh icon — the reports load as
  // a set, so one shared indicator is truer than a per-panel one.
  const fetching = useIsFetching({ queryKey: queryKeys.retailerAnalytics.all })

  return {
    filters,
    patchFilters: (patch: Partial<AnalyticsFilters>) =>
      setFilters((f) => ({ ...f, ...patch })),
    resetFilters: () => setFilters(INITIAL_FILTERS),
    refresh: {
      onRefresh: () => {
        setRefreshedAt(Date.now())
        void queryClient.invalidateQueries({ queryKey: queryKeys.retailerAnalytics.all })
      },
      updatedAt: refreshedAt,
      isFetching: fetching > 0,
    },
  }
}
