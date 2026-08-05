import { FilterBar } from '@/components/common/filter-bar'
import type { RefreshState } from '@/components/common/refresh-control'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import {
  PLAN_STATUS_CHAIN,
  PLAN_STATUS_HINT,
  PLAN_STATUS_LABEL,
} from '../lib/plan-status'
import { StripLegend } from './strip-legend'
import type { AllocationFilters } from '../hooks/use-allocation-list'

/**
 * The chain tabs, the strip's legend, and the shared FilterBar.
 *
 * The tabs are **segments, not counts**: `GET /journey-plans/summary` is gone, and
 * the list's own `status` filter is what serves them. So there is deliberately no
 * badge on any tab — a number that would have to come from four extra requests, and
 * whose absence costs nothing, because the tab that matters is the one an admin is
 * about to work through.
 *
 * They read left to right in **chain order**, which is also what the API's
 * `sort_by=status` uses. `Submitted` is the queue: the only state waiting on the
 * admin.
 *
 * There is no territory facet: the endpoint that used to hand down the city options
 * is gone, and building the list from whatever happens to be on the current page
 * would make the panel shrink as the user narrowed — the exact bug that endpoint
 * existed to prevent.
 */
export function AllocationToolbar({
  filters,
  onChange,
  onReset,
  refresh,
}: {
  filters: AllocationFilters
  onChange: (patch: Partial<AllocationFilters>) => void
  onReset: () => void
  refresh?: RefreshState
}) {
  return (
    <div className="space-y-3">
      {/* Tabs and legend share a row — both are one-line strips of chips, and the
          legend only decodes the Month column, so it sits out of the way on the
          right. They wrap onto separate lines when the row runs out of width. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusTab
            active={filters.status === null}
            label="All"
            hint="Every plan for the month, whatever state it is in."
            onClick={() => onChange({ status: null })}
          />
          {PLAN_STATUS_CHAIN.map((status) => (
            <StatusTab
              key={status}
              active={filters.status === status}
              label={PLAN_STATUS_LABEL[status]}
              hint={PLAN_STATUS_HINT[status]}
              onClick={() => onChange({ status })}
            />
          ))}
        </div>

        <StripLegend className="ml-auto" />
      </div>

      <FilterBar
        search={{
          value: filters.search,
          onChange: (search) => onChange({ search }),
          placeholder: 'Search incharge or code…',
        }}
        refresh={refresh}
        onReset={onReset}
      />
    </div>
  )
}

/**
 * One chain tab. Each carries the state's own explanation, because the words are
 * not self-explanatory — "draft" in particular means the sales incharge cannot see the month
 * at all, which no admin guesses.
 */
function StatusTab({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <Hint label={hint}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
          active
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )}
      >
        {label}
      </button>
    </Hint>
  )
}
