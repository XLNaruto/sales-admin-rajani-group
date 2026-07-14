import { useState } from 'react'
import type { UseInfiniteQueryResult } from '@tanstack/react-query'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  useCitiesInfinite,
  useDistrictsInfinite,
  useStatesInfinite,
  useTalukasInfinite,
  useZonesInfinite,
} from '../api/use-location'
import { toLocationOptions } from '../lib/location-options'
import type { LocationListResult } from '../types'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface LocationSelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

type NamedItem = { id: number; name: string }
type InfiniteResult<T extends NamedItem> = UseInfiniteQueryResult<
  { pages: LocationListResult<T>[] },
  unknown
>

/** Adapt an infinite query + its search setter into `LocationSelect` props. */
function toSelect<T extends NamedItem>(
  query: InfiniteResult<T>,
  setSearch: (q: string) => void,
): LocationSelect {
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  return {
    options: toLocationOptions(items),
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}

/** State select — always enabled. */
export function useStateSelect(): LocationSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useStatesInfinite({ search: debounced || undefined, sortBy: 'name' })
  return toSelect(query, setSearch)
}

/** Zone select — scoped to the chosen state. */
export function useZoneSelect(stateId?: number): LocationSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useZonesInfinite({ stateId, search: debounced || undefined, sortBy: 'name' })
  return toSelect(query, setSearch)
}

/** District select — scoped to the chosen zone. */
export function useDistrictSelect(zoneId?: number): LocationSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useDistrictsInfinite({ zoneId, search: debounced || undefined, sortBy: 'name' })
  return toSelect(query, setSearch)
}

/** Taluka select — scoped to the chosen district. */
export function useTalukaSelect(districtId?: number): LocationSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useTalukasInfinite({
    districtId,
    search: debounced || undefined,
    sortBy: 'name',
  })
  return toSelect(query, setSearch)
}

/** City select — scoped to the chosen taluka. */
export function useCitySelect(talukaId?: number): LocationSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useCitiesInfinite({ talukaId, search: debounced || undefined, sortBy: 'name' })
  return toSelect(query, setSearch)
}
