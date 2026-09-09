import { useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useDistributorOptionsInfinite } from '@/features/distributor-management'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface LazySelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

/**
 * Distributor select for the beat form — server-searched, scroll-lazy.
 *
 * Fed by the dedicated options endpoint rather than the full distributor list:
 * it returns `id` + firm name only and needs just `distributor-master:lookup`,
 * so a sales incharge can fill this dropdown without holding access to the
 * Distributor Master screen. Restricted to `active` firms.
 */
export function useDistributorOptions(): LazySelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useDistributorOptionsInfinite({
    search: debounced || undefined,
    // A beat is a standing commitment to serve these firms, so only active ones
    // are offered — a suspended or closed distributor must not be picked up here.
    status: 'active',
  })
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  return {
    options: items.map((d) => ({ value: d.id, label: d.name })),
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
