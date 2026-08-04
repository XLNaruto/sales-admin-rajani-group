import { useMemo, useState } from 'react'
import { Check, MapPin, Search, Sparkles, Store, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AllocatedBeat, AllocatedPlanBeat } from '../types'

/**
 * The month's beat list — **the allocation itself**.
 *
 * A rep is permanently allocated 60+ beats and cannot work them all, so choosing
 * *which* are in play this month is the decision this control exists for. There is
 * deliberately **no per-beat count**: how many times each is worked is almost
 * always once, and the server carries no target to edit.
 *
 * The value is the whole set, because the save is a full replacement — this
 * control owns a draft list and hands it back on every change, rather than firing
 * an add or a remove per beat.
 */
export function BeatAllocationPicker({
  pool,
  value,
  onChange,
  /** The saved allocation, for `worked_count` and provenance on each chosen beat. */
  allocated,
  readOnly = false,
  busy = false,
}: {
  /** Every beat the rep holds — the set the month's list is chosen from. */
  pool: AllocatedBeat[]
  /** Beat ids currently on the draft list. */
  value: string[]
  onChange: (beatIds: string[]) => void
  allocated: AllocatedPlanBeat[]
  readOnly?: boolean
  busy?: boolean
}) {
  const [query, setQuery] = useState('')

  const chosen = useMemo(() => new Set(value), [value])

  /** Saved facts per beat — a beat added this session has none yet. */
  const savedById = useMemo(
    () => new Map(allocated.map((beat) => [beat.beatId, beat])),
    [allocated],
  )

  const term = query.trim().toLowerCase()
  const options = useMemo(
    () => (term ? pool.filter((beat) => beat.name.toLowerCase().includes(term)) : pool),
    [pool, term],
  )

  /** Outlets behind the current list — what the month actually covers. */
  const outlets = useMemo(
    () =>
      value.reduce((sum, id) => {
        const beat = savedById.get(id)
        const fromPool = pool.find((b) => b.id === id)
        return sum + (beat?.outletCount ?? fromPool?.outlets ?? 0)
      }, 0),
    [value, savedById, pool],
  )

  const toggle = (beatId: string) => {
    if (readOnly || busy) return
    onChange(
      chosen.has(beatId) ? value.filter((id) => id !== beatId) : [...value, beatId],
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Beats this month
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {value.length} of {pool.length} allocated
        </span>
        {outlets > 0 ? (
          <Hint label="Outlets on the beats currently listed.">
            <span className="inline-flex cursor-default items-center gap-1 text-xs text-muted-foreground">
              <Store className="size-3" />
              <span className="tabular-nums">{outlets}</span> outlets
            </span>
          </Hint>
        ) : null}

        {!readOnly ? (
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer text-xs"
              disabled={busy || value.length === pool.length}
              onClick={() => onChange(pool.map((beat) => beat.id))}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer text-xs"
              disabled={busy || value.length === 0}
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      {pool.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No beats are allocated to this sales incharge, so there is nothing to choose
          from. Allocate beats to him first.
        </p>
      ) : (
        <>
          <div className="relative border-b border-border/60">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search his beats"
              aria-label="Search allocated beats"
              className="h-10 w-full bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul
            role="listbox"
            aria-multiselectable
            aria-label="Beats on this month’s list"
            className="max-h-96 divide-y divide-border/40 overflow-y-auto"
          >
            {options.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No beat matches “{query.trim()}”.
              </li>
            ) : (
              options.map((beat) => {
                const on = chosen.has(beat.id)
                const saved = savedById.get(beat.id)
                return (
                  <li key={beat.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      disabled={readOnly || busy}
                      onClick={() => toggle(beat.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                        on ? 'bg-primary/5' : 'hover:bg-accent/50',
                        !readOnly && !busy && 'cursor-pointer',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded border',
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {on ? <Check className="size-3.5" /> : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium text-foreground">
                            {beat.name}
                          </span>
                          {/* Provenance, only where it exists: `solver` means the
                              picker proposed it at generate, `manual` means an admin
                              put it there. A beat added this session has neither yet. */}
                          {saved?.source === 'solver' ? (
                            <Hint label="Proposed by the picker when the month was generated.">
                              <span className="inline-flex shrink-0 cursor-default items-center gap-0.5 rounded-full bg-info/10 px-1.5 text-[10px] font-semibold text-info">
                                <Sparkles className="size-2.5" />
                                auto
                              </span>
                            </Hint>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                          {beat.outlets != null ? `${beat.outlets} outlets` : 'Outlets unknown'}
                          {/* No target beside it: the list carries no per-beat count,
                              so this is never rendered as "2 / 3". */}
                          {saved && saved.workedCount > 0
                            ? ` · worked ${saved.workedCount}×`
                            : ''}
                        </span>
                      </span>

                      {on && !readOnly ? (
                        <X className="size-4 shrink-0 text-muted-foreground" />
                      ) : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </>
      )}
    </div>
  )
}
