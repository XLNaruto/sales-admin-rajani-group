import { BadgeCheck, Search, SlidersHorizontal, ToggleLeft, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { DESIGNATIONS } from '../lib/incharge-form'

export interface SalesmanFilters {
  search: string
  designation: string
  status: string
}

export const INITIAL_FILTERS: SalesmanFilters = { search: '', designation: 'all', status: 'all' }

interface SalesmanToolbarProps {
  filters: SalesmanFilters
  onChange: (patch: Partial<SalesmanFilters>) => void
  onReset: () => void
}

/** Filter card above the salesman table — mirrors the fleet toolbar design. */
export function SalesmanToolbar({ filters, onChange, onReset }: SalesmanToolbarProps) {
  const activeCount =
    (filters.search ? 1 : 0) +
    (filters.designation !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: filter summary */}
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <SlidersHorizontal className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">Filter</p>
          <p className="text-xs text-muted-foreground">
            {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
          </p>
        </div>
      </div>

      {/* Right: search + selects */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by name, email or mobile…"
            autoComplete="off"
            className="h-9 pl-9 pr-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              title="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Combobox
          className="w-full sm:w-52"
          icon={BadgeCheck}
          placeholder="All Designations"
          searchPlaceholder="Search designation"
          value={filters.designation}
          onChange={(v) => onChange({ designation: v })}
          options={[
            { label: 'All Designations', value: 'all' },
            ...DESIGNATIONS.map((d) => ({ label: d, value: d })),
          ]}
        />

        <Combobox
          className="w-full sm:w-40"
          icon={ToggleLeft}
          searchPlaceholder="Search status"
          value={filters.status}
          onChange={(v) => onChange({ status: v })}
          options={[
            { label: 'All Status', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
        />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-rose-500/10 px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
          >
            <X className="size-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
