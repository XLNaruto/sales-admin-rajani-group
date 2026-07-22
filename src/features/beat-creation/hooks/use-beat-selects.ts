import { useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useDistributorsInfinite } from '@/features/distributor-management'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface LazySelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

/** Distributor select for the beat form — server-searched, scroll-lazy. */
export function useDistributorOptions(): LazySelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useDistributorsInfinite({
    search: debounced || undefined,
    sortBy: 'firm_name',
    sortOrder: 'asc',
  })
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  return {
    options: items.map((d) => ({ value: d.id, label: d.firmName })),
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
