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

/* ---------------------------- Enums ------------------------------- */

export const FIRM_TYPES: ComboboxOption[] = [
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'company', label: 'Company' },
]

export const YES_NO: ComboboxOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const MARKET_TYPES: ComboboxOption[] = [
  { value: 'local', label: 'Local' },
  { value: 'rural', label: 'Rural' },
  { value: 'local_rural', label: 'Local & Rural' },
  { value: 'counter_sales', label: 'Counter Sales' },
]

export const MARKET_SYSTEMS: ComboboxOption[] = [
  { value: 'ready_stock', label: 'Ready Stock' },
  { value: 'booking', label: 'Booking' },
]

export const PAYMENT_CONDITIONS: ComboboxOption[] = [
  { value: 'same_day_cheque', label: 'Same Day Cheque' },
  { value: 'due_date_neft_rtgs', label: 'Due Date NEFT/RTGS' },
  { value: 'advance', label: 'Advance' },
]

export const DISTRIBUTOR_STATUSES: ComboboxOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
]

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
const TALUKA_NAMES = nameMap(TALUKAS)

export const stateName = (id: string) => STATE_NAMES.get(id) ?? id
export const cityName = (id: string) => CITY_NAMES.get(id) ?? id
export const talukaName = (id: string) => TALUKA_NAMES.get(id) ?? id

const LABELS: Record<string, string> = {
  proprietorship: 'Proprietorship',
  partnership: 'Partnership',
  company: 'Company',
  local: 'Local',
  rural: 'Rural',
  local_rural: 'Local & Rural',
  counter_sales: 'Counter Sales',
  ready_stock: 'Ready Stock',
  booking: 'Booking',
  same_day_cheque: 'Same Day Cheque',
  due_date_neft_rtgs: 'Due Date NEFT/RTGS',
  advance: 'Advance',
  yes: 'Yes',
  no: 'No',
}

export const labelFor = (value?: string) => (value ? (LABELS[value] ?? value) : '—')

/** Convert a list of reference nodes into combobox options. */
export const toOptions = (rows: RefNode[]): ComboboxOption[] =>
  rows.map((r) => ({ value: r.id, label: r.name }))
