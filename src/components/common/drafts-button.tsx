import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDistanceToNow } from 'date-fns'
import { Check, FilePlus2, FileClock, History, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/common/hint'
import { useDrafts } from '@/hooks/use-form-drafts'
import { cn } from '@/lib/utils'
import { popoverZ } from '@/lib/z-layers'

/** Rough panel height used to decide whether to open upward. */
const PANEL_MAX = 340
const PANEL_WIDTH = 360
const GAP = 6
const VIEWPORT_PADDING = 8

interface DraftsButtonProps {
  /** Form kind whose drafts to show, e.g. `sales-incharge:create`. */
  formKey: string
  /** Open the picked draft — usually a navigate to the create route. */
  onOpen: (id: string) => void
  /** Shown as a last row ("Start a new …") when provided. */
  onNew?: () => void
  /** Noun for that row, e.g. "sales incharge". */
  newLabel?: string
  /** Overrides the two lines of that row when the wording needs to differ. */
  newTitle?: string
  newDescription?: string
  /**
   * The draft currently open in the form — flagged as CURRENT and inert, since
   * picking the one you're already editing does nothing. Only meaningful when
   * this button is rendered on the form page itself.
   */
  currentId?: string
  title?: string
  description?: string
}

interface PanelCoords {
  left: number
  top: number
  /** When true the panel is anchored by its bottom edge (opens upward). */
  dropUp: boolean
}

/**
 * "Drafts (n)" button for a list screen's header, sitting beside the Add
 * button. Renders nothing while there are no drafts, so the header stays clean
 * until something is actually parked.
 *
 * Clicking opens a combobox-style dropdown rather than a dialog: picking up
 * unfinished work is a lightweight, one-click choice, and a modal that dims the
 * whole page overstates it. The panel is portalled to `document.body` with
 * fixed positioning so a header inside an `overflow-hidden` ancestor can't clip
 * it — the same approach the Combobox takes.
 */
export function DraftsButton({
  formKey,
  onOpen,
  onNew,
  newLabel,
  newTitle,
  newDescription = 'Opens a blank form.',
  currentId,
  title = 'Saved drafts',
  description = 'Pick one up where you left off.',
}: DraftsButtonProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { drafts, count, remove, isRemoving, clearAll, isClearing } = useDrafts(formKey)

  // Right-align the panel under the trigger, flipping up when the header sits
  // low in the viewport. Recomputes on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow
      const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, rect.right - PANEL_WIDTH),
        Math.max(VIEWPORT_PADDING, maxLeft),
      )
      setCoords({ left, top: dropUp ? rect.top - GAP : rect.bottom + GAP, dropUp })
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
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Both lines are searchable: the label is usually a name, but the summary
  // carries the mobile / email that a user is likelier to remember typing.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return drafts
    return drafts.filter(
      (d) =>
        d.label.toLowerCase().includes(q) || (d.summary ?? '').toLowerCase().includes(q),
    )
  }, [drafts, query])

  // Clearing the last draft unmounts this component, so the panel state goes
  // with it — nothing to reset here.
  if (count === 0) return null

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const pick = (id: string) => {
    close()
    onOpen(id)
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Brand-tinted outline: unfinished work is easy to forget, so this has to
          be noticed, but it stays an outline so the solid primary Add button
          beside it still reads as the main action. */}
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'border-primary/50 bg-primary/5 font-semibold text-primary hover:border-primary hover:bg-primary/10 hover:text-primary',
          open && 'border-primary bg-primary/10',
        )}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <FileClock />
        Drafts
        <span className="animate-draft-blink ml-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold tabular-nums text-primary-foreground">
          {count}
        </span>
      </Button>

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
              className={cn(
                'overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg',
                popoverZ(wrapRef.current),
              )}
            >
              <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {title}
                    <span className="grid min-w-5 place-items-center rounded-full bg-muted px-1.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => clearAll()}
                  disabled={isClearing}
                  className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400"
                >
                  <Trash2 className="size-3.5" />
                  Clear all
                </button>
              </div>

              {/* Always present so the panel's shape doesn't shift as the draft
                  count crosses a threshold — and so typing is always an option. */}
              <div className="relative border-t border-border/60">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search drafts"
                  className="h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <ul
                role="listbox"
                className="max-h-64 overflow-y-auto border-t border-border/60 p-1"
              >
                {filtered.length === 0 ? (
                  <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No drafts match “{query.trim()}”
                  </li>
                ) : (
                  filtered.map((draft) => {
                    const current = draft.id === currentId
                    return (
                      <li key={draft.id}>
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-1 transition-colors',
                            current ? 'bg-primary/5' : 'hover:bg-accent/50',
                          )}
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={current}
                            // The open draft is a label, not a destination.
                            disabled={current}
                            onClick={() => pick(draft.id)}
                            className={cn(
                              'flex min-w-0 flex-1 items-center gap-3 py-2 text-left',
                              current ? 'cursor-default' : 'cursor-pointer',
                            )}
                          >
                            {/* Same tile size and icon size in both states — the
                                open draft is marked by a ring, not by extra
                                visual weight, so rows stay on one rhythm. */}
                            <span
                              className={cn(
                                'grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary',
                                current && 'ring-1 ring-inset ring-primary/40',
                              )}
                            >
                              {current ? (
                                <Check className="size-4" />
                              ) : (
                                <History className="size-4" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-foreground">
                                  {draft.label}
                                </span>
                                {current ? (
                                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                    Current
                                  </span>
                                ) : null}
                              </span>
                              {draft.summary ? (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {draft.summary}
                                </span>
                              ) : null}
                              <span className="block text-xs text-muted-foreground">
                                Edited {formatDistanceToNow(draft.updatedAt, { addSuffix: true })}
                              </span>
                            </span>
                          </button>
                          <Hint label="Discard draft">
                            <button
                              type="button"
                              onClick={() => remove(draft.id)}
                              disabled={isRemoving}
                              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </Hint>
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>

              {onNew ? (
                <div className="border-t border-border/60 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      onNew()
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <FilePlus2 className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {newTitle ?? `Start a new ${newLabel ?? 'record'}`}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {newDescription}
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
