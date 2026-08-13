import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchAnalyticsSummary,
  fetchDimensionSales,
  fetchGroupRetailers,
  fetchRetailerListGroups,
  fetchTagSummary,
  fetchTaggedRetailers,
} from './analytics-api'
import type {
  AnalyticsFilters,
  ListDimension,
  SalesDimension,
} from '../types'

/**
 * Query hooks for the analytics screens. Components never touch
 * `analytics-api` directly — they consume these, so the swap from the demo
 * dataset to the reporting endpoints is invisible above this line.
 *
 * Every report keeps the previous data while the next filter set loads, so
 * changing a facet doesn't blank the charts.
 */

/** Headline KPIs for the current filter set. */
export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.retailerAnalytics.summary({ ...filters }),
    queryFn: () => fetchAnalyticsSummary(filters),
    placeholderData: keepPreviousData,
  })
}

/** Zone / district / city / beat / product-wise retailer sales. */
export function useDimensionSales(dimension: SalesDimension, filters: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.retailerAnalytics.dimensionSales(dimension, { ...filters }),
    queryFn: () => fetchDimensionSales(dimension, filters),
    placeholderData: keepPreviousData,
  })
}

/** Counts per lifecycle tag. */
export function useTagSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.retailerAnalytics.tagSummary({ ...filters }),
    queryFn: () => fetchTagSummary(filters),
    placeholderData: keepPreviousData,
  })
}

/** Retailers behind a tag card ('all' → every tagged retailer). */
export function useTaggedRetailers(filters: AnalyticsFilters, tag: string) {
  return useQuery({
    queryKey: queryKeys.retailerAnalytics.tagged(tag, { ...filters }),
    queryFn: () => fetchTaggedRetailers(filters, tag),
    placeholderData: keepPreviousData,
  })
}

/** Beat-wise / city-wise groups for the retailer-list report. */
export function useRetailerListGroups(
  dimension: ListDimension,
  filters: AnalyticsFilters,
) {
  return useQuery({
    queryKey: queryKeys.retailerAnalytics.listGroups(dimension, { ...filters }),
    queryFn: () => fetchRetailerListGroups(dimension, filters),
    placeholderData: keepPreviousData,
  })
}

/** Retailers inside the selected beat/city — skipped until a group is picked. */
export function useGroupRetailers(
  dimension: ListDimension,
  groupId: string | null,
  filters: AnalyticsFilters,
) {
  return useQuery({
    queryKey: queryKeys.retailerAnalytics.groupRetailers(dimension, groupId ?? '', {
      ...filters,
    }),
    queryFn: () => fetchGroupRetailers(dimension, groupId as string, filters),
    enabled: Boolean(groupId),
    placeholderData: keepPreviousData,
  })
}
