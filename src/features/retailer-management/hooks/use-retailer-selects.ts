import type { ComboboxOption } from '@/components/ui/combobox'
import { useOutletTypes } from '../api/use-retailers'

/**
 * Outlet-type options. The master is small, so the whole list is fetched once
 * and the Combobox searches it in place — no lazy paging needed.
 */
export function useOutletTypeOptions(): { options: ComboboxOption[]; loading: boolean } {
  const query = useOutletTypes()
  return {
    options: (query.data?.items ?? []).map((t) => ({
      value: String(t.id),
      label: t.name,
    })),
    loading: query.isLoading,
  }
}
