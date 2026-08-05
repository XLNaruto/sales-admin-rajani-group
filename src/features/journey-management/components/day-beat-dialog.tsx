import { useEffect, useMemo, useState } from 'react'
import { Check, GripVertical, MapPin, Search, Store, TriangleAlert } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { dayLabel } from '../lib/journey-format'
import type { AllocatedBeat } from '../types'

/**
 * The beats for **one date** of the correction pass.
 *
 * The rules this control exists to make unbreakable, all three enforced server-side:
 *
 * - Every beat must be **allocated to the sales incharge** — so the pool is his beats, never
 *   the beat master.
 * - Every beat must **sit in that day's city** — so the pool is filtered by it. A
 *   beat whose own city is unknown is offered anyway and flagged: that is a gap in
 *   the beat master, not a scheduling error, and refusing it here would make an
 *   unfixable day.
 * - **`beatIds` order is the intended order**, and there is no limit on how many. So
 *   the chosen list is ordered and reorderable, and nothing caps its length.
 *
 * A dialog rather than an inline control because a month is 31 rows: an expanding
 * checklist inside a table cell would push the rest of the calendar off-screen every
 * time one date was touched.
 */
export function DayBeatDialog({
  open,
  onOpenChange,
  date,
  cityName,
  pool,
  value,
  onSave,
  readOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The date being edited, `yyyy-MM-dd`. */
  date: string
  cityName: string | null
  /** The sales incharge's beats **already narrowed to the day's city** by the caller. */
  pool: AllocatedBeat[]
  /** Beat ids currently on the day, in their intended order. */
  value: string[]
  onSave: (beatIds: string[]) => void
  readOnly?: boolean
}) {
  const [draft, setDraft] = useState<string[]>(value)
  const [query, setQuery] = useState('')

  // Re-seed each time it opens: the dialog is one instance reused for 31 dates, so
  // stale state from the last date would silently overwrite this one's beats.
  useEffect(() => {
    if (open) {
      setDraft(value)
      setQuery('')
    }
    // `value` deliberately excluded — re-seeding mid-edit would discard the edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date])

  const chosen = useMemo(() => new Set(draft), [draft])
  const byId = useMemo(() => new Map(pool.map((beat) => [beat.id, beat])), [pool])

  const term = query.trim().toLowerCase()
  const options = useMemo(
    () => (term ? pool.filter((beat) => beat.name.toLowerCase().includes(term)) : pool),
    [pool, term],
  )

  const outlets = draft.reduce((sum, id) => sum + (byId.get(id)?.outlets ?? 0), 0)

  const toggle = (beatId: string) => {
    if (readOnly) return
    // Appended, not inserted: the tail is where a newly added beat belongs in the
    // day's walking order, and reordering is a separate, explicit action.
    setDraft((prev) =>
      prev.includes(beatId) ? prev.filter((id) => id !== beatId) : [...prev, beatId],
    )
  }

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= draft.length) return
    setDraft((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-6">
        <DialogHeader>
          <span className="mb-3 grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </span>
          <DialogTitle>Beats for {dayLabel(date)}</DialogTitle>
          <DialogDescription>
            {cityName
              ? `Only beats in ${cityName} can go on this date — the scheduler refuses a beat from another city. The order below is the order he is meant to walk them.`
              : 'This date has no city, so no beat can go on it. Set the city first.'}
          </DialogDescription>
        </DialogHeader>

        {/* The chosen list, in order, above the pool: the order IS data here, and it
            cannot be read off a checklist sorted by name. */}
        {draft.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium text-foreground">
              On this date
              <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                {draft.length} beat{draft.length === 1 ? '' : 's'}
                {outlets > 0 ? ` · ${outlets} outlets` : ''}
              </span>
            </p>
            <ol className="mt-2 space-y-1.5">
              {draft.map((beatId, index) => {
                const beat = byId.get(beatId)
                return (
                  <li
                    key={beatId}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-primary/10 font-mono text-[11px] font-semibold tabular-nums text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {/* A beat not in the pool is one that has left the day's city
                          since it was scheduled — `beat_outside_city`. It must stay
                          visible and removable, not vanish. */}
                      {beat?.name ?? `Beat ${beatId}`}
                      {!beat ? (
                        <Hint label="This beat no longer sits in the day's city — the beat master has drifted. Remove it, or fix the master.">
                          <span className="ml-1.5 inline-flex cursor-default items-center gap-0.5 rounded-full bg-warning/15 px-1.5 align-middle text-[10px] font-semibold text-warning">
                            <TriangleAlert className="size-2.5" />
                            off-city
                          </span>
                        </Hint>
                      ) : null}
                    </span>
                    {!readOnly ? (
                      <span className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label="Move earlier"
                          className="cursor-pointer rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === draft.length - 1}
                          aria-label="Move later"
                          className="cursor-pointer rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <GripVertical className="size-3.5 text-muted-foreground/50" />
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
          {pool.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {cityName
                ? `He holds no beats in ${cityName}. Allocate him one, or move this date to another city.`
                : 'Set the city first.'}
            </p>
          ) : (
            <>
              <div className="relative border-b border-border/60">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={cityName ? `Search beats in ${cityName}` : 'Search beats'}
                  aria-label="Search beats"
                  className="h-10 w-full bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <ul
                role="listbox"
                aria-multiselectable
                aria-label="Beats for this date"
                className="max-h-64 divide-y divide-border/40 overflow-y-auto"
              >
                {options.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No beat matches “{query.trim()}”.
                  </li>
                ) : (
                  options.map((beat) => {
                    const on = chosen.has(beat.id)
                    return (
                      <li key={beat.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={on}
                          disabled={readOnly}
                          onClick={() => toggle(beat.id)}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                            on ? 'bg-primary/5' : 'hover:bg-accent/50',
                            !readOnly && 'cursor-pointer',
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
                            <span className="block truncate text-sm font-medium text-foreground">
                              {beat.name}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                              <Store className="size-2.5" />
                              {beat.outlets != null
                                ? `${beat.outlets} outlets`
                                : 'Outlets unknown'}
                              {/* A beat with no city of its own is reachable but
                                  unverifiable — the master, not the schedule, is the
                                  thing to fix. */}
                              {beat.cityId == null ? ' · no city in the master' : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={readOnly}
            onClick={() => {
              onSave(draft)
              onOpenChange(false)
            }}
          >
            Set {draft.length} beat{draft.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
