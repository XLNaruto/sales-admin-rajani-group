import { mockDelay } from '@/lib/utils'
import { DEMO_RETAILERS, PRODUCTS, type DemoRetailer } from '../lib/demo-data'
import { TAG_ORDER } from '../lib/retailer-tags'
import type {
  AnalyticsFilters,
  AnalyticsRetailer,
  AnalyticsSummary,
  DimensionSalesRow,
  ListDimension,
  RetailerListGroup,
  SalesDimension,
  TagSummaryRow,
} from '../types'

/**
 * Analytics data source.
 *
 * Every function here is the seam the real reporting endpoints will slot into:
 * the hooks in `use-retailer-analytics.ts` call these and nothing else, so
 * swapping the demo dataset for `http.get('/retailers/analytics/...')` touches
 * only this file. The aggregation below mirrors what the API is expected to do
 * server-side — it is not meant to run over a live retailer base.
 */

/**
 * Rough weighting per reporting window, so changing the period visibly moves
 * the numbers in the demo. The real endpoint will filter by date range instead.
 */
const PERIOD_WEIGHT: Record<AnalyticsFilters['period'], number> = {
  'this-month': 1,
  'last-month': 0.92,
  'last-3-months': 2.8,
  ytd: 7.4,
}

/** Apply the geography/product filters — the same narrowing the API will do. */
function applyFilters(filters: AnalyticsFilters): DemoRetailer[] {
  return DEMO_RETAILERS.filter((r) => {
    if (filters.zoneId !== 'all' && r.zoneId !== filters.zoneId) return false
    if (filters.districtId !== 'all' && r.districtId !== filters.districtId) return false
    if (filters.cityId !== 'all' && r.cityId !== filters.cityId) return false
    if (filters.beatId !== 'all' && r.beatId !== filters.beatId) return false
    // A product filter keeps only the outlets that actually bought that product.
    if (filters.productId !== 'all' && !r.productSales[filters.productId]) return false
    return true
  })
}

/**
 * Sales attributed to a retailer under the current filters: the whole basket,
 * or just the selected product's share of it.
 */
function salesOf(r: DemoRetailer, filters: AnalyticsFilters, previous = false): number {
  const weight = PERIOD_WEIGHT[filters.period]
  const base = previous
    ? filters.productId === 'all'
      ? r.prevSales
      : (r.prevProductSales[filters.productId] ?? 0)
    : filters.productId === 'all'
      ? r.sales
      : (r.productSales[filters.productId] ?? 0)
  return Math.round(base * weight)
}

export async function fetchAnalyticsSummary(
  filters: AnalyticsFilters,
): Promise<AnalyticsSummary> {
  const rows = applyFilters(filters)
  return mockDelay({
    totalSales: rows.reduce((sum, r) => sum + salesOf(r, filters), 0),
    prevTotalSales: rows.reduce((sum, r) => sum + salesOf(r, filters, true), 0),
    totalRetailers: rows.length,
    billedRetailers: rows.filter((r) => salesOf(r, filters) > 0).length,
    visits: rows.reduce((sum, r) => sum + r.visits, 0),
    productiveVisits: rows.reduce((sum, r) => sum + r.productiveVisits, 0),
  })
}

/** Which field a dimension groups on, and the parent label shown beside it. */
const GROUP_BY: Record<
  Exclude<SalesDimension, 'product'>,
  { id: (r: DemoRetailer) => string; name: (r: DemoRetailer) => string; parent: (r: DemoRetailer) => string }
> = {
  zone: { id: (r) => r.zoneId, name: (r) => r.zoneName, parent: () => '' },
  district: { id: (r) => r.districtId, name: (r) => r.districtName, parent: (r) => r.zoneName },
  city: { id: (r) => r.cityId, name: (r) => r.cityName, parent: (r) => r.districtName },
  beat: { id: (r) => r.beatId, name: (r) => r.beatName, parent: (r) => r.cityName },
}

export async function fetchDimensionSales(
  dimension: SalesDimension,
  filters: AnalyticsFilters,
): Promise<DimensionSalesRow[]> {
  const rows = applyFilters(filters)
  const out =
    dimension === 'product' ? productRows(rows, filters) : geoRows(dimension, rows, filters)
  return mockDelay(out.sort((a, b) => b.sales - a.sales))
}

function geoRows(
  dimension: Exclude<SalesDimension, 'product'>,
  rows: DemoRetailer[],
  filters: AnalyticsFilters,
): DimensionSalesRow[] {
  const by = GROUP_BY[dimension]
  const map = new Map<string, DimensionSalesRow>()

  for (const r of rows) {
    const id = by.id(r)
    const bucket = map.get(id) ?? {
      id,
      name: by.name(r),
      parent: by.parent(r) || undefined,
      retailers: 0,
      billedRetailers: 0,
      visits: 0,
      productiveVisits: 0,
      sales: 0,
      prevSales: 0,
    }
    const sales = salesOf(r, filters)
    bucket.retailers += 1
    bucket.billedRetailers += sales > 0 ? 1 : 0
    bucket.visits += r.visits
    bucket.productiveVisits += r.productiveVisits
    bucket.sales += sales
    bucket.prevSales += salesOf(r, filters, true)
    map.set(id, bucket)
  }
  return [...map.values()]
}

/**
 * Product rows are a different grain: one retailer contributes to every product
 * it bought, so "retailers" here reads as *buying outlets*, not outlet count.
 */
function productRows(rows: DemoRetailer[], filters: AnalyticsFilters): DimensionSalesRow[] {
  const weight = PERIOD_WEIGHT[filters.period]
  return PRODUCTS.filter(
    (p) => filters.productId === 'all' || p.id === filters.productId,
  ).map((p) => {
    const buyers = rows.filter((r) => (r.productSales[p.id] ?? 0) > 0)
    return {
      id: p.id,
      name: p.name,
      retailers: buyers.length,
      billedRetailers: buyers.length,
      visits: buyers.reduce((s, r) => s + r.visits, 0),
      productiveVisits: buyers.reduce((s, r) => s + r.productiveVisits, 0),
      sales: Math.round(buyers.reduce((s, r) => s + (r.productSales[p.id] ?? 0), 0) * weight),
      prevSales: Math.round(
        buyers.reduce((s, r) => s + (r.prevProductSales[p.id] ?? 0), 0) * weight,
      ),
    }
  })
}

export async function fetchTagSummary(filters: AnalyticsFilters): Promise<TagSummaryRow[]> {
  const rows = applyFilters(filters)
  return mockDelay(
    TAG_ORDER.map((tag) => {
      const count = rows.filter((r) => r.tag === tag).length
      return { tag, count, share: rows.length ? (count / rows.length) * 100 : 0 }
    }),
  )
}

/** Retailers behind a tag card (all tags when `tag` is omitted). */
export async function fetchTaggedRetailers(
  filters: AnalyticsFilters,
  tag?: string,
): Promise<AnalyticsRetailer[]> {
  const rows = applyFilters(filters)
    .filter((r) => !tag || tag === 'all' || r.tag === tag)
    .map((r) => ({ ...r, sales: salesOf(r, filters) }))
  return mockDelay(rows.sort((a, b) => b.sales - a.sales))
}

/** Beat-wise / city-wise groups for the retailer-list report. */
export async function fetchRetailerListGroups(
  dimension: ListDimension,
  filters: AnalyticsFilters,
): Promise<RetailerListGroup[]> {
  const rows = applyFilters(filters)
  const map = new Map<string, RetailerListGroup>()

  for (const r of rows) {
    const id = dimension === 'beat' ? r.beatId : r.cityId
    const group = map.get(id) ?? {
      id,
      name: dimension === 'beat' ? r.beatName : r.cityName,
      parent: dimension === 'beat' ? r.cityName : r.districtName,
      retailers: 0,
      activeRetailers: 0,
      sales: 0,
    }
    group.retailers += 1
    // "Active" here means currently transacting — the two healthy tags.
    group.activeRetailers += r.tag === 'active-call' || r.tag === 'new-call' ? 1 : 0
    group.sales += salesOf(r, filters)
    map.set(id, group)
  }
  return mockDelay([...map.values()].sort((a, b) => b.retailers - a.retailers))
}

/** Retailers inside one beat/city group, for the drill-down table. */
export async function fetchGroupRetailers(
  dimension: ListDimension,
  groupId: string,
  filters: AnalyticsFilters,
): Promise<AnalyticsRetailer[]> {
  const rows = applyFilters(filters)
    .filter((r) => (dimension === 'beat' ? r.beatId : r.cityId) === groupId)
    .map((r) => ({ ...r, sales: salesOf(r, filters) }))
  return mockDelay(rows.sort((a, b) => b.sales - a.sales))
}
