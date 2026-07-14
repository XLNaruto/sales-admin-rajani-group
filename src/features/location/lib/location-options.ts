import type { ComboboxOption } from '@/components/ui/combobox'

/**
 * Convert any geography master rows (`{ id: number; name: string }`) into
 * combobox options. Ids are stringified so the options plug straight into the
 * string-valued form fields the cascading selects bind to.
 */
export function toLocationOptions(
  rows: ReadonlyArray<{ id: number; name: string }> | undefined,
): ComboboxOption[] {
  return (rows ?? []).map((r) => ({ value: String(r.id), label: r.name }))
}
