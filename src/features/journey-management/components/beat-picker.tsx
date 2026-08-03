import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Lock, MapPin, Plus, Search, X } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AllocatedBeat, PlanDayBeat } from '../types'

/**
 * Chips shown inline in the row before the rest collapse into a `+N` counter.
 * Three keeps the cell one line tall at the table's default width, which is the
 * point — the row is a scanning surface, not a list.
 */
const INLINE_CHIP_LIMIT = 3

/** Panel width in px. */
const PANEL_WIDTH = 320
/** Tallest the panel gets — decides whether it drops up instead of down. */
const PANEL_MAX = 320
/** Space between the trigger and the panel, in px. */
const GAP = 4
const VIEWPORT_PADDING = 8

interface PanelCoords {
  left: number
  top: number
  /** Opens upward — the trigger sits too close to the bottom of the viewport. */
  dropUp: boolean
}

/**
 * The day's beats: the scheduled ones as removable chips, with a `+ beat` trigger
 * over the incharge's allocation.
 *
 * Adding and removing are separate one-shot calls, not a set replacement, because
 * that is what the API offers — a POST per beat and a DELETE per beat, each
 * answering with the recomputed plan. So this control reports intent (`onAdd` /
 * `onRemove`) and never owns the selection.
 *
 * Not the shared `MultiSelect`: this lives inside a dense table row, so the chips
 * *are* the cell, with no bordered control around them.
 */
export function BeatPicker({
  beats,
  selected,
  onAdd,
  onRemove,
  disabled = false,
  busy = false,
}: {
  /** Beats allocated to this incharge — the pickable set. */
  beats: AllocatedBeat[]
  /** Beats already on the day, as the server has them. */
  selected: PlanDayBeat[]
  onAdd: (beatId: string) => void
  onRemove: (beatId: string) => void
  disabled?: boolean
  /** An edit is in flight — the controls stay put but stop accepting clicks. */
  busy?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // The picker lives inside the day table's scroll container, so an absolutely
  // positioned panel gets clipped by it no matter how high its z-index goes.
  // Portal it to the body in fixed/viewport coordinates instead, and re-anchor on
  // scroll/resize.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const trigger = ref.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow
      const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, rect.left),
        Math.max(VIEWPORT_PADDING, maxLeft),
      )
      setCoords({
        left,
        top: dropUp ? rect.top - GAP : rect.bottom + GAP,
        dropUp,
      })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const term = query.trim().toLowerCase()
  const options = term ? beats.filter((b) => b.name.toLowerCase().includes(term)) : beats
  const onDay = new Set(selected.map((beat) => beat.beatId))

  const inline = selected.slice(0, INLINE_CHIP_LIMIT)
  const overflow = selected.length - inline.length

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {inline.map((beat) => (
          <BeatChip
            key={beat.id}
            beat={beat}
            disabled={disabled || beat.locked}
            busy={busy}
            onRemove={() => onRemove(beat.beatId)}
          />
        ))}

        {overflow > 0 ? (
          <Hint
            label={selected
              .slice(INLINE_CHIP_LIMIT)
              .map((b) => b.beatName)
              .join(', ')}
          >
            <button
              type="button"
              onClick={() => setListOpen(true)}
              aria-label={`Show all ${selected.length} beats`}
              className="inline-flex h-6 shrink-0 cursor-pointer items-center rounded-full border border-primary/25 bg-primary/10 px-2 text-[11px] font-semibold tabular-nums text-primary transition-colors hover:border-primary/50 hover:bg-primary/20"
            >
              +{overflow}
            </button>
          </Hint>
        ) : null}

        {disabled ? (
          // Read-only and nothing scheduled: say so in words. A lone dash in a
          // dense column reads as a missing glyph rather than "no beats".
          selected.length === 0 ? (
            <span className="text-sm text-muted-foreground">N/A</span>
          ) : null
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setQuery('')
              setOpen((o) => !o)
            }}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              // Deliberately off the chips' primary: the chips are the day's
              // content, this is the one action in the cell.
              'inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              open
                ? 'border-info bg-info text-white'
                : 'border-info/40 bg-info/10 text-info hover:border-info/60 hover:bg-info/20',
            )}
          >
            <Plus className={cn('size-3.5', open ? 'text-white' : 'text-info')} />
            {selected.length === 0 ? 'Add beat' : 'Add'}
          </button>
        )}
      </div>

      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.dropUp ? undefined : coords.top,
                bottom: coords.dropUp ? window.innerHeight - coords.top : undefined,
                width: PANEL_WIDTH,
              }}
              className="z-60 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            >
              <div className="relative mb-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search allocated beats"
                  className="h-9 w-full rounded-md bg-transparent pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <ul
                className="max-h-64 space-y-0.5 overflow-y-auto"
                role="listbox"
                aria-multiselectable
              >
                {options.length === 0 ? (
                  <li className="px-2 py-2 text-sm text-muted-foreground">
                    {beats.length
                      ? 'No matching beat'
                      : 'No beats allocated to this incharge'}
                  </li>
                ) : (
                  options.map((beat) => {
                    const active = onDay.has(beat.id)
                    return (
                      <li key={beat.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            // Already on the day: the chip's × is what removes it, so
                            // this row only ever adds.
                            if (active) return
                            onAdd(beat.id)
                            setOpen(false)
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                            active
                              ? 'cursor-default bg-accent/60'
                              : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">
                              {beat.name}
                            </span>
                            {beat.outlets != null ? (
                              <span className="block text-xs tabular-nums text-muted-foreground">
                                {beat.outlets} outlets
                              </span>
                            ) : null}
                          </span>
                          {active ? (
                            <Check className="size-4 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>

              {/* The per-day workload rules live on the server — a second full-day
              beat comes back as a 409 with a message written for the admin. */}
              <p className="border-t border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
                Two half-day beats fit one day; a second full-day beat is refused.
              </p>
            </div>,
            document.body,
          )
        : null}

      <SelectedBeatsDialog
        open={listOpen}
        onOpenChange={setListOpen}
        beats={selected}
        disabled={disabled}
        onRemove={onRemove}
      />
    </div>
  )
}

/** Workload as the ½ marker — the server tells us, so nothing is inferred. */
function isHalfDay(beat: PlanDayBeat): boolean {
  return beat.workload === 'half_day'
}

/** One scheduled beat as it reads inside the table row. */
function BeatChip({
  beat,
  disabled,
  busy,
  onRemove,
}: {
  beat: PlanDayBeat
  disabled: boolean
  busy: boolean
  onRemove: () => void
}) {
  return (
    <Hint
      label={`${beat.stopCount} outlets${isHalfDay(beat) ? ' · half day' : ''}${
        beat.locked ? ' · already started' : ''
      }`}
    >
      <span
        className={cn(
          'inline-flex h-6 max-w-56 items-center gap-1 rounded-full border py-0 pl-2 text-xs',
          disabled
            ? 'border-border/60 bg-muted/40 pr-2 text-muted-foreground'
            : 'border-primary/25 bg-primary/10 pr-1 text-primary',
        )}
      >
        <MapPin
          className={cn(
            'size-3 shrink-0',
            disabled ? 'text-muted-foreground' : 'text-primary/70',
          )}
        />
        <span className="truncate font-medium">{beat.beatName}</span>
        {isHalfDay(beat) ? (
          <span
            aria-label="Half day"
            className={cn(
              'shrink-0 rounded-full px-1 text-[10px] font-semibold',
              disabled
                ? 'bg-background text-muted-foreground'
                : 'bg-primary/15 text-primary',
            )}
          >
            ½
          </span>
        ) : null}
        {disabled ? (
          <Lock className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            aria-label={`Remove ${beat.beatName}`}
            className="grid size-4 shrink-0 cursor-pointer place-items-center rounded-full text-primary/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    </Hint>
  )
}

/**
 * The day's full beat list, opened from the `+N` chip — the row can only ever show
 * the first few, so this is where the rest live.
 */
function SelectedBeatsDialog({
  open,
  onOpenChange,
  beats,
  disabled,
  onRemove,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  beats: PlanDayBeat[]
  disabled: boolean
  onRemove: (beatId: string) => void
}) {
  // Emptying the list from inside leaves nothing to look at — close with it.
  useEffect(() => {
    if (open && beats.length === 0) onOpenChange(false)
  }, [open, beats.length, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" onClose={() => onOpenChange(false)}>
        <DialogHeader className="gap-1 border-b border-border/60 px-5 py-4">
          <DialogTitle>Beats on this day</DialogTitle>
          <DialogDescription>
            {beats.length} scheduled
            {beats.some(isHalfDay) ? ' — half-day beats are paired' : ''}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-96 space-y-1 overflow-y-auto p-2">
          {beats.map((beat) => (
            <li
              key={beat.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                {beat.sequence}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {beat.beatName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {beat.stopCount} outlets · {isHalfDay(beat) ? 'half day' : 'full day'}
                  {beat.source ? ` · ${beat.source}` : ''}
                </span>
              </span>
              {disabled || beat.locked ? (
                <Lock className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <button
                  type="button"
                  onClick={() => onRemove(beat.beatId)}
                  aria-label={`Remove ${beat.beatName}`}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
