import type { ComboboxOption } from '@/components/ui/combobox'

/** The two lifecycle statuses — used by the list toolbar's Status facet. */
export const RETAILER_STATUSES: ComboboxOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/** Onboarding-approval states — used by the list toolbar's filter facet. */
export const ONBOARDING_STATUSES: ComboboxOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/**
 * Split the picker's "lat, lng" string into the two columns the API stores.
 * Returns empty strings when the value is blank or malformed, so a cleared
 * picker clears both fields.
 */
export function splitLatLng(value?: string): { latitude: string; longitude: string } {
  const [lat, lng] = (value ?? '').split(',').map((s) => s.trim())
  if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return { latitude: '', longitude: '' }
  }
  return { latitude: lat, longitude: lng }
}

/**
 * Normalise a picker value into a stable identity for "which point is pinned".
 * The same coordinate reaches the form spelled several ways — typed by the
 * picker, re-joined from the API's two stored columns — so the nearest-beat
 * prefill compares this instead of the raw string. Blank when nothing is
 * pinned.
 */
export function coordKey(value?: string): string {
  const { latitude, longitude } = splitLatLng(value)
  return latitude && longitude ? `${latitude}, ${longitude}` : ''
}
