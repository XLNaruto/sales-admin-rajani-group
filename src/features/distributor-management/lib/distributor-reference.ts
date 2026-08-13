import type { ComboboxOption } from '@/components/ui/combobox'

/* ------------------------------------------------------------------ *
 * The distributor form's static option lists — the enums the API      *
 * documents, which have no master behind them. Everything with a      *
 * master (geography, routes, payment conditions) is fetched: see      *
 * `@/features/location` and `@/features/master-management`.           *
 * ------------------------------------------------------------------ */

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

/* Payment conditions are no longer a fixed list — they come from the
   payment-condition master (`usePaymentConditions`); the form stores the chosen
   row's id and the API resolves its name for display. */

export const DISTRIBUTOR_STATUSES: ComboboxOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

/** Sunday → Saturday, the days a delivery route can run on. */
export const DELIVERY_DAYS: ComboboxOption[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
]

export const WEEKLY_OFF_DAYS: ComboboxOption[] = [
  { value: 'none', label: 'None' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

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
  // Weekdays — the delivery-day and weekly-off enums.
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  none: 'None',
}

export const labelFor = (value?: string) => (value ? (LABELS[value] ?? value) : '—')

/**
 * Split the picker's "lat, lng" string into the two columns the API stores
 * (`geo_latitude` / `geo_longitude`). Returns empty strings when the value is
 * blank or malformed so a cleared picker clears both fields. The API pattern is
 * `^-?\d{1,3}(\.\d+)?$`, so each half must be a plain finite number.
 */
export function splitLatLng(value?: string): { latitude: string; longitude: string } {
  const [lat, lng] = (value ?? '').split(',').map((s) => s.trim())
  if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return { latitude: '', longitude: '' }
  }
  return { latitude: lat, longitude: lng }
}

/** Join the API's two geo columns back into the "lat, lng" string the UI uses. */
export function joinLatLng(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): string | null {
  if (lat == null || lng == null || lat === '' || lng === '') return null
  return `${lat}, ${lng}`
}
