import type { ComboboxOption } from '@/components/ui/combobox'

/* ------------------------------------------------------------------ *
 * Mock reference data. In a real build these come from their own API  *
 * hooks; here they're static so the cascading selects have something  *
 * to drive. Each level references its parent's id.                    *
 * ------------------------------------------------------------------ */

export interface RefNode {
  id: string
  name: string
}

export const STATES: RefNode[] = [
  { id: 'st-gj', name: 'Gujarat' },
  { id: 'st-mh', name: 'Maharashtra' },
]

export const ZONES: (RefNode & { stateId: string })[] = [
  { id: 'zn-gj-s', stateId: 'st-gj', name: 'Saurashtra' },
  { id: 'zn-gj-c', stateId: 'st-gj', name: 'Central Gujarat' },
  { id: 'zn-mh-w', stateId: 'st-mh', name: 'West Maharashtra' },
  { id: 'zn-mh-v', stateId: 'st-mh', name: 'Vidarbha' },
]

export const DISTRICTS: (RefNode & { zoneId: string })[] = [
  { id: 'dt-rajkot', zoneId: 'zn-gj-s', name: 'Rajkot' },
  { id: 'dt-jamnagar', zoneId: 'zn-gj-s', name: 'Jamnagar' },
  { id: 'dt-vadodara', zoneId: 'zn-gj-c', name: 'Vadodara' },
  { id: 'dt-pune', zoneId: 'zn-mh-w', name: 'Pune' },
  { id: 'dt-nagpur', zoneId: 'zn-mh-v', name: 'Nagpur' },
]

export const TALUKAS: (RefNode & { districtId: string })[] = [
  { id: 'tl-rajkot', districtId: 'dt-rajkot', name: 'Rajkot' },
  { id: 'tl-gondal', districtId: 'dt-rajkot', name: 'Gondal' },
  { id: 'tl-jamnagar', districtId: 'dt-jamnagar', name: 'Jamnagar' },
  { id: 'tl-vadodara', districtId: 'dt-vadodara', name: 'Vadodara' },
  { id: 'tl-haveli', districtId: 'dt-pune', name: 'Haveli' },
  { id: 'tl-nagpur', districtId: 'dt-nagpur', name: 'Nagpur Rural' },
]

export const CITIES: (RefNode & { talukaId: string })[] = [
  { id: 'ct-rajkot', talukaId: 'tl-rajkot', name: 'Rajkot City' },
  { id: 'ct-gondal', talukaId: 'tl-gondal', name: 'Gondal' },
  { id: 'ct-jamnagar', talukaId: 'tl-jamnagar', name: 'Jamnagar City' },
  { id: 'ct-vadodara', talukaId: 'tl-vadodara', name: 'Vadodara City' },
  { id: 'ct-pune', talukaId: 'tl-haveli', name: 'Pune City' },
  { id: 'ct-nagpur', talukaId: 'tl-nagpur', name: 'Nagpur City' },
]

export const VILLAGES: (RefNode & { cityId: string })[] = [
  { id: 'vl-kotharia', cityId: 'ct-rajkot', name: 'Kotharia' },
  { id: 'vl-mavdi', cityId: 'ct-rajkot', name: 'Mavdi' },
  { id: 'vl-vasavad', cityId: 'ct-gondal', name: 'Vasavad' },
  { id: 'vl-dhrol', cityId: 'ct-jamnagar', name: 'Dhrol' },
  { id: 'vl-waghodia', cityId: 'ct-vadodara', name: 'Waghodia' },
  { id: 'vl-wagholi', cityId: 'ct-pune', name: 'Wagholi' },
  { id: 'vl-hingna', cityId: 'ct-nagpur', name: 'Hingna' },
]

export const DISTRIBUTORS: RefNode[] = [
  { id: 'ds-1', name: 'Rajani Distributors — Rajkot' },
  { id: 'ds-2', name: 'Shree Traders — Vadodara' },
  { id: 'ds-3', name: 'Maharashtra Sales Corp — Pune' },
  { id: 'ds-4', name: 'Vidarbha Agencies — Nagpur' },
]

export const RETAILERS: (RefNode & { area: string })[] = [
  { id: 'rt-1', name: 'Shiv Kirana Store', area: 'Kotharia' },
  { id: 'rt-2', name: 'Maruti Provision', area: 'Mavdi' },
  { id: 'rt-3', name: 'Balaji Super Market', area: 'Gondal' },
  { id: 'rt-4', name: 'Annapurna Stores', area: 'Vadodara' },
  { id: 'rt-5', name: 'Sai General Store', area: 'Pune' },
  { id: 'rt-6', name: 'Gajanan Traders', area: 'Nagpur' },
  { id: 'rt-7', name: 'New Bharat Kirana', area: 'Jamnagar' },
  { id: 'rt-8', name: 'Krishna Provision Mart', area: 'Rajkot' },
]

export const BEAT_PROGRAMS: RefNode[] = [
  { id: 'bp-1', name: 'Monthly Coverage Program' },
  { id: 'bp-2', name: 'High-Value Outlet Program' },
  { id: 'bp-3', name: 'New Market Development' },
]

/* ---------------------------- Enums ------------------------------- */

export const MARKET_TYPES: ComboboxOption[] = [
  { value: 'local', label: 'Local' },
  { value: 'rural', label: 'Rural' },
  { value: 'counter_sales', label: 'Counter Sales' },
]

export const MARKET_SYSTEMS: ComboboxOption[] = [
  { value: 'ready_stock', label: 'Ready Stock' },
  { value: 'booking', label: 'Booking' },
]

export const VISIT_CYCLES: ComboboxOption[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
]

export const BEAT_STATUSES: ComboboxOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export const VISIT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/* ---------------------- Cascade filter helpers -------------------- */

export const zonesByState = (stateId: string) => ZONES.filter((z) => z.stateId === stateId)
export const districtsByZone = (zoneId: string) => DISTRICTS.filter((d) => d.zoneId === zoneId)
export const talukasByDistrict = (districtId: string) =>
  TALUKAS.filter((t) => t.districtId === districtId)
export const citiesByTaluka = (talukaId: string) => CITIES.filter((c) => c.talukaId === talukaId)
export const villagesByCity = (cityId: string) => VILLAGES.filter((v) => v.cityId === cityId)

/* ------------------------- Name lookups --------------------------- */

const nameMap = (rows: RefNode[]) => new Map(rows.map((r) => [r.id, r.name]))

const STATE_NAMES = nameMap(STATES)
const CITY_NAMES = nameMap(CITIES)
const DISTRIBUTOR_NAMES = nameMap(DISTRIBUTORS)
const RETAILER_NAMES = nameMap(RETAILERS)

export const stateName = (id: string) => STATE_NAMES.get(id) ?? id
export const cityName = (id: string) => CITY_NAMES.get(id) ?? id
export const distributorName = (id: string) => DISTRIBUTOR_NAMES.get(id) ?? id
export const retailerName = (id: string) => RETAILER_NAMES.get(id) ?? id

const LABELS: Record<string, string> = {
  local: 'Local',
  rural: 'Rural',
  counter_sales: 'Counter Sales',
  ready_stock: 'Ready Stock',
  booking: 'Booking',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

export const labelFor = (value: string) => LABELS[value] ?? value

/** Convert a list of reference nodes into combobox options. */
export const toOptions = (rows: RefNode[]): ComboboxOption[] =>
  rows.map((r) => ({ value: r.id, label: r.name }))
