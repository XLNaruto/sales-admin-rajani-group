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
import type {
  CityItem,
  DistrictItem,
  LocationListResult,
  StateItem,
  TalukaItem,
  ZoneItem,
} from '../types'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface LocationSelect<T = { id: number; name: string }> {
  options: ComboboxOption[]
  /**
   * The rows currently loaded, behind the options. Lets a caller read the extra
   * fields on a picked row — e.g. a city carries its taluka/district/zone/state
   * ids, so selecting one can back-fill its whole ancestry.
   */
  items: T[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

/**
 * Every dropdown lists A→Z by name. `sort_order` is explicit because the API
 * defaults to `desc`, which would put Z first.
 */
const NAME_ASC = { sortBy: 'name', sortOrder: 'asc' } as const

type NamedItem = { id: number; name: string }
type InfiniteResult<T extends NamedItem> = UseInfiniteQueryResult<
  { pages: LocationListResult<T>[] },
  unknown
>

/** Adapt an infinite query + its search setter into `LocationSelect` props. */
function toSelect<T extends NamedItem>(
  query: InfiniteResult<T>,
  setSearch: (q: string) => void,
): LocationSelect<T> {
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  return {
    options: toLocationOptions(items),
    items,
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}

/** State select — always enabled. */
export function useStateSelect(): LocationSelect<StateItem> {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useStatesInfinite({ search: debounced || undefined, ...NAME_ASC })
  return toSelect(query, setSearch)
}

/** Zone select — scoped to the chosen state. */
export function useZoneSelect(stateId?: number): LocationSelect<ZoneItem> {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useZonesInfinite({ stateId, search: debounced || undefined, ...NAME_ASC })
  return toSelect(query, setSearch)
}

/** District select — scoped to the chosen zone. */
export function useDistrictSelect(zoneId?: number): LocationSelect<DistrictItem> {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useDistrictsInfinite({ zoneId, search: debounced || undefined, ...NAME_ASC })
  return toSelect(query, setSearch)
}

/** Taluka select — scoped to the chosen district. */
export function useTalukaSelect(districtId?: number): LocationSelect<TalukaItem> {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useTalukasInfinite({
    districtId,
    search: debounced || undefined,
    ...NAME_ASC,
  })
  return toSelect(query, setSearch)
}

/**
 * City select — scoped to the chosen taluka, and by default idle until there is
 * one. Pass `{ alwaysEnabled: true }` for a city-first form: the query then runs
 * with no `taluka_id`, listing/searching every city so one can be picked before
 * any parent level is set (each row carries its own ancestry — see `items`).
 */
export function useCitySelect(
  talukaId?: number,
  options?: { alwaysEnabled?: boolean },
): LocationSelect<CityItem> {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const query = useCitiesInfinite(
    { talukaId, search: debounced || undefined, ...NAME_ASC },
    options?.alwaysEnabled ? { enabled: true } : undefined,
  )
  return toSelect(query, setSearch)
}
