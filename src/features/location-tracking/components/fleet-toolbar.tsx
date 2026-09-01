import { useState } from 'react'
import { MapPinned, Radio, ShieldAlert, ToggleLeft } from 'lucide-react'
import { FilterBar, type FilterFacet } from '@/components/common/filter-bar'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useBeatOptionsInfinite } from '@/features/beat-creation'

/**
 * Filter state for the Live Fleet Map.
 *
 * `beatName` rides along with the id purely so the active chip can name the beat:
 * the options list is server-searched and paged, so the selected beat is often
 * not among the pages currently loaded.
 */
export interface FleetFilters {
  search: string
  status: string
  beatId: string
  beatName: string
  /** `all` | `stale` — `stale` sends `only_stale=true`. */
  signal: string
  /** `all` | `mock` — `mock` sends `only_fake=true`. */
  device: string
}

interface FleetToolbarProps {
  filters: FleetFilters
  onChange: (patch: Partial<FleetFilters>) => void
  onReset: () => void
}

/**
 * Filter card above the fleet list.
 *
 * Three of these facets — beat, signal and device — narrow the **page**, not the
 * team: the server applies them to the latest fix after paginating the rep list.
 * The page says so next to the count; nothing here tries to hide it.
 */
export function FleetToolbar({ filters, onChange, onReset }: FleetToolbarProps) {
  const [beatSearch, setBeatSearch] = useState('')
  const debouncedBeat = useDebouncedValue(beatSearch)
  const beats = useBeatOptionsInfinite({ search: debouncedBeat || undefined })
  const beatItems = beats.data?.pages.flatMap((page) => page.items) ?? []

  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Rep status',
      icon: ToggleLeft,
      value: filters.status,
      onChange: (value) => onChange({ status: value }),
      searchPlaceholder: 'Search status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Invited', value: 'invited' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      key: 'beat',
      label: 'Beat of latest fix',
      icon: MapPinned,
      value: filters.beatId,
      valueLabel: filters.beatName || undefined,
      onChange: (value) =>
        onChange({
          beatId: value,
          beatName:
            value === 'all'
              ? ''
              : (beatItems.find((beat) => beat.id === value)?.name ?? `Beat ${value}`),
        }),
      options: [
        { label: 'All beats', value: 'all' },
        ...beatItems.map((beat) => ({ label: beat.name, value: beat.id })),
      ],
      searchPlaceholder: 'Search beats',
      onSearchChange: setBeatSearch,
      onScrollEnd: () => {
        if (beats.hasNextPage && !beats.isFetchingNextPage) void beats.fetchNextPage()
      },
      loading: beats.isFetching,
    },
    {
      key: 'signal',
      label: 'Signal',
      icon: Radio,
      value: filters.signal,
      onChange: (value) => onChange({ signal: value }),
      options: [
        { label: 'Any signal', value: 'all' },
        // Named for what it is — the fix has aged past 15 minutes — rather than
        // for what it might mean. A dead zone trips it too.
        { label: 'Stale only (no fix in 15 min)', value: 'stale' },
      ],
      searchable: false,
    },
    {
      key: 'device',
      label: 'Device flag',
      icon: ShieldAlert,
      value: filters.device,
      onChange: (value) => onChange({ device: value }),
      options: [
        { label: 'Any device', value: 'all' },
        // `only_fake` looks at the LATEST fix only — a rep flagged
        // earlier in the day is still listed by the table's Device
        // column, so the wording has to be precise here.
        { label: 'Fake on latest fix', value: 'mock' },
      ],
      searchable: false,
    },
  ]

  return (
    <FilterBar
      search={{
        value: filters.search,
        onChange: (value) => onChange({ search: value }),
        placeholder: 'Search by rep name or phone…',
      }}
      facets={facets}
      onReset={onReset}
    />
  )
}
