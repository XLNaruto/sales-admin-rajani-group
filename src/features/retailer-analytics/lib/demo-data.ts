import { resolveRetailerTag } from './retailer-tags'
import type { AnalyticsRetailer } from '../types'

/**
 * Demo dataset for the analytics screens.
 *
 * This is scaffolding for the design review only — it stands in for the
 * reporting endpoints so the layout, the tag rules and the drill-downs can be
 * judged with realistic shapes. It is generated from a fixed seed, so the
 * numbers are identical on every reload. When the endpoints land, only
 * `api/analytics-api.ts` changes; nothing here leaks into the components.
 */

/** Deterministic PRNG (mulberry32) — same seed, same demo numbers every load. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GeoNode {
  id: string
  name: string
}

/** Geography tree: zone → district → city → beat, as the masters model it. */
const GEO: {
  zone: string
  districts: { name: string; cities: { name: string; beats: string[] }[] }[]
}[] = [
  {
    zone: 'North Gujarat',
    districts: [
      {
        name: 'Mehsana',
        cities: [
          { name: 'Mehsana', beats: ['Mehsana Main Bazaar', 'Modhera Road'] },
          { name: 'Visnagar', beats: ['Visnagar Market'] },
        ],
      },
      {
        name: 'Banaskantha',
        cities: [
          { name: 'Palanpur', beats: ['Palanpur City', 'Abu Highway'] },
          { name: 'Deesa', beats: ['Deesa Market Yard'] },
        ],
      },
    ],
  },
  {
    zone: 'South Gujarat',
    districts: [
      {
        name: 'Surat',
        cities: [
          { name: 'Surat', beats: ['Ring Road', 'Adajan', 'Varachha'] },
          { name: 'Bardoli', beats: ['Bardoli Town'] },
        ],
      },
      {
        name: 'Valsad',
        cities: [{ name: 'Vapi', beats: ['Vapi GIDC', 'Chala Road'] }],
      },
    ],
  },
  {
    zone: 'Saurashtra',
    districts: [
      {
        name: 'Rajkot',
        cities: [
          { name: 'Rajkot', beats: ['Kalawad Road', 'Gondal Road', 'Bhaktinagar'] },
          { name: 'Gondal', beats: ['Gondal Bazaar'] },
        ],
      },
      {
        name: 'Jamnagar',
        cities: [{ name: 'Jamnagar', beats: ['Jamnagar Central', 'Digjam Circle'] }],
      },
    ],
  },
  {
    zone: 'Kutch',
    districts: [
      {
        name: 'Kutch',
        cities: [
          { name: 'Bhuj', beats: ['Bhuj Main Road'] },
          { name: 'Gandhidham', beats: ['Gandhidham Sector 8', 'Adipur'] },
        ],
      },
    ],
  },
]

/** Product master used by the product-wise sales report. */
export const PRODUCTS: GeoNode[] = [
  { id: 'p-1', name: 'Premium Ghee 1L' },
  { id: 'p-2', name: 'Cow Ghee 500ml' },
  { id: 'p-3', name: 'Refined Oil 5L' },
  { id: 'p-4', name: 'Mustard Oil 1L' },
  { id: 'p-5', name: 'Spice Combo Pack' },
  { id: 'p-6', name: 'Butter 500g' },
]

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Flat geography rows, one per beat — the grain everything else rolls up from. */
interface BeatRow {
  zone: GeoNode
  district: GeoNode
  city: GeoNode
  beat: GeoNode
}

const BEAT_ROWS: BeatRow[] = GEO.flatMap((z) =>
  z.districts.flatMap((d) =>
    d.cities.flatMap((c) =>
      c.beats.map((b) => ({
        zone: { id: `z-${slug(z.zone)}`, name: z.zone },
        district: { id: `d-${slug(d.name)}`, name: d.name },
        city: { id: `c-${slug(c.name)}`, name: c.name },
        beat: { id: `b-${slug(b)}`, name: b },
      })),
    ),
  ),
)

/** Unique option lists for the filter bar, in master order. */
function unique(nodes: GeoNode[]): GeoNode[] {
  const seen = new Map<string, GeoNode>()
  for (const n of nodes) if (!seen.has(n.id)) seen.set(n.id, n)
  return [...seen.values()]
}

export const ZONES = unique(BEAT_ROWS.map((r) => r.zone))
export const DISTRICTS = unique(BEAT_ROWS.map((r) => r.district))
export const CITIES = unique(BEAT_ROWS.map((r) => r.city))
export const BEATS = unique(BEAT_ROWS.map((r) => r.beat))

/** Parent lookups, so a filtered facet can narrow the ones below it. */
export const DISTRICT_ZONE = new Map(BEAT_ROWS.map((r) => [r.district.id, r.zone.id]))
export const CITY_DISTRICT = new Map(BEAT_ROWS.map((r) => [r.city.id, r.district.id]))
export const BEAT_CITY = new Map(BEAT_ROWS.map((r) => [r.beat.id, r.city.id]))

const SHOP_PREFIX = [
  'Shree',
  'Jay',
  'Maa',
  'New',
  'Krishna',
  'Balaji',
  'Radhe',
  'Om',
  'Sai',
  'Gokul',
]
const SHOP_SUFFIX = [
  'Provision Store',
  'Super Market',
  'Kirana',
  'General Store',
  'Traders',
  'Agency',
  'Enterprise',
  'Stores',
]
const OWNER_FIRST = [
  'Rajesh',
  'Nilesh',
  'Bhavesh',
  'Kiran',
  'Manish',
  'Hitesh',
  'Paresh',
  'Jignesh',
  'Ashok',
  'Vipul',
]
const OWNER_LAST = ['Patel', 'Shah', 'Desai', 'Joshi', 'Mehta', 'Trivedi', 'Solanki']

/** ISO date `days` before `from`. */
function daysBefore(from: Date, days: number): string {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** A demo retailer plus the per-product split the product report needs. */
export interface DemoRetailer extends AnalyticsRetailer {
  zoneId: string
  districtId: string
  cityId: string
  beatId: string
  /** Period sales broken down by product id (only the ones actually bought). */
  productSales: Record<string, number>
  /** Same split for the previous period — powers the growth column. */
  prevProductSales: Record<string, number>
  prevSales: number
}

/**
 * Build the demo retailer base. Every outlet gets an activation date and a
 * visit/order history, then its tag is derived through the same
 * `resolveRetailerTag` the real data will go through — so the tag counts on
 * screen are produced by the actual rules, not hand-written.
 */
function buildRetailers(): DemoRetailer[] {
  const rand = seeded(20260813)
  const today = new Date()
  const rows: DemoRetailer[] = []

  BEAT_ROWS.forEach((geo) => {
    // 6–13 outlets per beat, so beat sizes vary the way real routes do.
    const count = 6 + Math.floor(rand() * 8)

    for (let i = 0; i < count; i += 1) {
      const seq = rows.length + 1
      const shopName = `${SHOP_PREFIX[Math.floor(rand() * SHOP_PREFIX.length)]} ${
        SHOP_SUFFIX[Math.floor(rand() * SHOP_SUFFIX.length)]
      }`

      // Activation spread over ~2 years, with a slice of very new outlets so the
      // "New Call" bucket is populated.
      const activationDaysAgo = rand() < 0.12 ? Math.floor(rand() * 28) : 40 + Math.floor(rand() * 700)
      const activationDate = daysBefore(today, activationDaysAgo)

      // Coverage: most outlets are visited regularly, some have gone dark.
      const coverage = rand()
      const lastVisitDaysAgo =
        coverage < 0.1
          ? undefined // never visited at all
          : coverage < 0.2
            ? 95 + Math.floor(rand() * 120) // dropped off the route
            : Math.floor(rand() * 80)

      // Ordering: a productive visit can only be at or before the last visit.
      const ordering = rand()
      const lastOrderDaysAgo =
        lastVisitDaysAgo === undefined || ordering < 0.15
          ? undefined // has never bought
          : lastVisitDaysAgo + Math.floor(rand() * 60)

      // A visit/order can't predate activation — clamp both to the outlet's age.
      const visitDate =
        lastVisitDaysAgo !== undefined && lastVisitDaysAgo <= activationDaysAgo
          ? daysBefore(today, lastVisitDaysAgo)
          : undefined
      const orderDate =
        lastOrderDaysAgo !== undefined && lastOrderDaysAgo <= activationDaysAgo
          ? daysBefore(today, lastOrderDaysAgo)
          : undefined

      const visits = visitDate ? 1 + Math.floor(rand() * 12) : 0
      const productiveVisits = orderDate ? Math.max(1, Math.floor(visits * rand())) : 0

      const tag = resolveRetailerTag({
        activationDate,
        lastVisitDate: visitDate,
        lastOrderDate: orderDate,
        asOf: today,
      })

      // Only outlets that bought in the window carry sales.
      const sales = productiveVisits > 0 ? Math.round((8000 + rand() * 92000) / 100) * 100 : 0
      const prevSales =
        sales > 0 ? Math.round((sales * (0.6 + rand() * 0.9)) / 100) * 100 : 0

      // Split the value across 1–4 products.
      const productSales: Record<string, number> = {}
      const prevProductSales: Record<string, number> = {}
      if (sales > 0) {
        const picked = [...PRODUCTS]
          .sort(() => rand() - 0.5)
          .slice(0, 1 + Math.floor(rand() * 4))
        const weights = picked.map(() => 0.2 + rand())
        const total = weights.reduce((a, b) => a + b, 0)
        picked.forEach((p, idx) => {
          productSales[p.id] = Math.round((sales * weights[idx]) / total)
          prevProductSales[p.id] = Math.round((prevSales * weights[idx]) / total)
        })
      }

      rows.push({
        id: `r-${seq}`,
        code: `RTL${String(seq).padStart(4, '0')}`,
        shopName,
        ownerName: `${OWNER_FIRST[Math.floor(rand() * OWNER_FIRST.length)]} ${
          OWNER_LAST[Math.floor(rand() * OWNER_LAST.length)]
        }`,
        mobile: `9${String(700000000 + Math.floor(rand() * 89999999))}`,
        zoneId: geo.zone.id,
        zoneName: geo.zone.name,
        districtId: geo.district.id,
        districtName: geo.district.name,
        cityId: geo.city.id,
        cityName: geo.city.name,
        beatId: geo.beat.id,
        beatName: geo.beat.name,
        activationDate,
        lastVisitDate: visitDate,
        lastOrderDate: orderDate,
        visits,
        productiveVisits,
        sales,
        orders: productiveVisits,
        tag,
        productSales,
        prevProductSales,
        prevSales,
      })
    }
  })

  return rows
}

export const DEMO_RETAILERS: DemoRetailer[] = buildRetailers()
