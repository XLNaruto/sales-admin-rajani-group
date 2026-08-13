import { CalendarRange, Globe2, Map, MapPin, Package, Route } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import {
  BEATS,
  BEAT_CITY,
  CITIES,
  CITY_DISTRICT,
  DISTRICTS,
  DISTRICT_ZONE,
  PRODUCTS,
  ZONES,
} from '../lib/demo-data'
import type { AnalyticsFilters, AnalyticsPeriod } from '../types'

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 3 Months', value: 'last-3-months' },
  { label: 'Year to Date', value: 'ytd' },
]

interface AnalyticsToolbarProps {
  filters: AnalyticsFilters
  onChange: (patch: Partial<AnalyticsFilters>) => void
  onReset: () => void
  refresh?: RefreshState
}

/**
 * Filter card shared by all three analytics reports.
 *
 * The geography facets cascade — picking a zone narrows the districts below it,
 * and so on — so the dropdowns can't offer a combination that returns nothing.
 * There is no search box: these screens are read-only rollups, and finding a
 * single outlet belongs on the retailer list.
 */
export function AnalyticsToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: AnalyticsToolbarProps) {
  const districts = DISTRICTS.filter(
    (d) => filters.zoneId === 'all' || DISTRICT_ZONE.get(d.id) === filters.zoneId,
  )
  const cities = CITIES.filter((c) => {
    const districtId = CITY_DISTRICT.get(c.id)
    if (filters.districtId !== 'all') return districtId === filters.districtId
    return filters.zoneId === 'all' || DISTRICT_ZONE.get(districtId ?? '') === filters.zoneId
  })
  const beats = BEATS.filter((b) => {
    const cityId = BEAT_CITY.get(b.id) ?? ''
    return filters.cityId !== 'all'
      ? cityId === filters.cityId
      : cities.some((c) => c.id === cityId)
  })

  const facets: FilterFacet[] = [
    {
      key: 'period',
      label: 'Period',
      icon: CalendarRange,
      value: filters.period,
      // Period always has a value — there is no "all time" report.
      clearValue: 'this-month',
      onChange: (v) => onChange({ period: v as AnalyticsPeriod }),
      options: PERIODS,
    },
    {
      key: 'zone',
      label: 'Zone',
      icon: Globe2,
      value: filters.zoneId,
      searchable: true,
      searchPlaceholder: 'Search zone',
      // Clearing a parent clears everything below it, otherwise a stale child
      // would keep filtering to a territory the user just widened out of.
      onChange: (v) =>
        onChange({ zoneId: v, districtId: 'all', cityId: 'all', beatId: 'all' }),
      options: [{ label: 'All Zones', value: 'all' }, ...toOptions(ZONES)],
    },
    {
      key: 'district',
      label: 'District',
      icon: Map,
      value: filters.districtId,
      searchable: true,
      searchPlaceholder: 'Search district',
      onChange: (v) => onChange({ districtId: v, cityId: 'all', beatId: 'all' }),
      options: [{ label: 'All Districts', value: 'all' }, ...toOptions(districts)],
    },
    {
      key: 'city',
      label: 'City',
      icon: MapPin,
      value: filters.cityId,
      searchable: true,
      searchPlaceholder: 'Search city',
      onChange: (v) => onChange({ cityId: v, beatId: 'all' }),
      options: [{ label: 'All Cities', value: 'all' }, ...toOptions(cities)],
    },
    {
      key: 'beat',
      label: 'Beat',
      icon: Route,
      value: filters.beatId,
      searchable: true,
      searchPlaceholder: 'Search beat',
      onChange: (v) => onChange({ beatId: v }),
      options: [{ label: 'All Beats', value: 'all' }, ...toOptions(beats)],
    },
    {
      key: 'product',
      label: 'Product',
      icon: Package,
      value: filters.productId,
      searchable: true,
      searchPlaceholder: 'Search product',
      onChange: (v) => onChange({ productId: v }),
      options: [{ label: 'All Products', value: 'all' }, ...toOptions(PRODUCTS)],
    },
  ]

  return <FilterBar facets={facets} onReset={onReset} refresh={refresh} />
}

function toOptions(nodes: { id: string; name: string }[]) {
  return nodes.map((n) => ({ label: n.name, value: n.id }))
}
