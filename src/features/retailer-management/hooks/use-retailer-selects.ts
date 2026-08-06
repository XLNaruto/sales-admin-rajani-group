import { useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useBeatsInfinite } from '@/features/beat-creation'
import { useOutletTypes } from '@/features/master-management'

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

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface LazySelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

/**
 * Beat select for the "allocate beat" modal — server-searched and scroll-lazy,
 * since the beat master grows well past one page. Options are labelled with the
 * beat name; the caller prepends the current selection when paging/search has
 * dropped it from the loaded page.
 */
export function useBeatOptions(enabled = true): LazySelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useBeatsInfinite(
    { search: debounced || undefined, sortBy: 'name', sortOrder: 'asc' },
    { enabled },
  )
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  return {
    options: items.map((b) => ({ value: b.id, label: b.beatName })),
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
