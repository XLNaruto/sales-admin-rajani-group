import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, Search, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Rough panel height used to decide whether to open upward. */
const PANEL_MAX = 300
const GAP = 4
const VIEWPORT_PADDING = 8
/** Minimum panel width when the trigger is an inline (text-width) one. */
const INLINE_PANEL_MIN = 300

export interface ComboboxOption {
  label: string
  value: string
  /** Small badge shown after the label in the list (e.g. an employee code). */
  badge?: string
  /** Muted secondary line under the label (e.g. a designation). */
  hint?: string
  /** Avatar image for the option; initials of `label` are used when absent. */
  avatarUrl?: string
}

/** Initials for an avatar fallback — first letter of the first two words. */
function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  /** Leading icon in the trigger. */
  icon?: LucideIcon
  /** Placeholder shown in the trigger when nothing is selected. */
  placeholder?: string
  /** Show the in-panel search box (default true). */
  searchable?: boolean
  searchPlaceholder?: string
  /** How the panel aligns to the trigger. */
  align?: 'start' | 'center' | 'end'
  /** Width utility for the trigger (e.g. "lg:w-44"). */
  className?: string
  /**
   * Called when the option list is scrolled near its end — use to fetch the
   * next page for lazy-loaded / infinite dropdowns.
   */
  onScrollEnd?: () => void
  /** Show a loading row at the bottom of the list (a fetch is in flight). */
  loading?: boolean
  /**
   * When provided, filtering is delegated to the caller (server-side search):
   * the search box value is forwarded here and `options` are shown as-is
   * instead of being filtered locally.
   */
  onSearchChange?: (query: string) => void
  /**
   * Show a clear (×) button in the trigger once something is selected — picking
   * it emits `''`. Use for optional selects that can go back to "nothing
   * chosen" without needing a placeholder option in the list.
   */
  clearable?: boolean
  /**
   * Trigger style. `input` (default) looks like a form control; `inline` drops
   * the border and renders the selected label as bold text with a chevron —
   * for using a select as a heading (e.g. the name in a detail header).
   */
  variant?: 'input' | 'inline'
  /** Show a leading avatar per option (`avatarUrl`, else initials). */
  withAvatars?: boolean
  /** Read-only: the trigger shows the current label but won't open. */
  disabled?: boolean
  /** Accessible name for the trigger when there's no visible label beside it. */
  'aria-label'?: string
}

/** Trigger `onScrollEnd` when scrolled within this many px of the bottom. */
const SCROLL_END_THRESHOLD = 48

interface PanelCoords {
  left: number
  top: number
  width: number
  /** When true the panel is anchored by its bottom edge (opens upward). */
  dropUp: boolean
}

/**
 * Custom searchable dropdown (combobox). Zero-dependency: a button trigger +
 * a portalled panel with a filter box and a checkmark on the selected option.
 * The panel is portalled to `document.body` with fixed positioning so it is
 * never clipped by an `overflow-hidden`/`overflow-auto` ancestor (e.g. the
 * FilterBar panel). Closes on outside-click or Escape.
 */
export function Combobox({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
  searchable = true,
  searchPlaceholder = 'Search',
  align = 'start',
  className,
  onScrollEnd,
  loading = false,
  onSearchChange,
  clearable = false,
  variant = 'input',
  withAvatars = false,
  disabled = false,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const inline = variant === 'inline'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Position the panel against the trigger in fixed/viewport coordinates so it
  // escapes any clipping ancestor. Recomputes on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX && rect.top > spaceBelow
      // An inline trigger is only as wide as its label, so give the panel a
      // usable minimum rather than matching the text width.
      const width = inline ? Math.max(rect.width, INLINE_PANEL_MIN) : rect.width
      let left = rect.left
      if (align === 'end') left = rect.right - width
      else if (align === 'center') left = rect.left + rect.width / 2 - width / 2
      const maxLeft = window.innerWidth - width - VIEWPORT_PADDING
      left = Math.min(Math.max(VIEWPORT_PADDING, left), Math.max(VIEWPORT_PADDING, maxLeft))
      const top = dropUp ? rect.top - GAP : rect.bottom + GAP
      setCoords({ left, top, width, dropUp })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, align, inline])

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

  const selected = options.find((o) => o.value === value)
  // With server-side search the parent already returns the matching page, so
  // show options verbatim; otherwise filter the loaded options locally.
  const filtered =
    onSearchChange || !query
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

  const search = (q: string) => {
    setQuery(q)
    onSearchChange?.(q)
  }

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
    onSearchChange?.('')
  }

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    if (!onScrollEnd) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_END_THRESHOLD) {
      onScrollEnd()
    }
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative',
        // Inline sits inside a flex row (next to badges) — size to the label and
        // refuse to shrink, so the name is never needlessly truncated.
        inline && 'inline-flex w-fit shrink-0',
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          'flex items-center gap-2 rounded-md transition-colors',
          inline
            ? '-mx-1 px-1 py-0.5 text-base font-semibold text-foreground'
            : 'h-9 w-full max-w-full border border-input bg-transparent px-3 text-sm text-foreground',
          disabled
            ? cn(
                'cursor-not-allowed text-muted-foreground',
                !inline && 'border-transparent bg-muted/40',
              )
            : cn(
                'cursor-pointer',
                inline ? 'hover:bg-accent/60' : 'hover:border-ring/40',
                open && (inline ? 'bg-accent/60' : 'ring-1 ring-ring'),
              ),
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
        <span
          className={cn(
            'text-left',
            // `truncate` (overflow:hidden) zeroes a flex item's minimum size, so
            // an inline trigger would collapse to an ellipsis however much room
            // it has. Inline keeps its full label on one line instead.
            inline ? 'shrink-0 whitespace-nowrap' : 'flex-1 truncate',
            !selected && 'font-normal text-muted-foreground',
          )}
        >
          {selected?.label ?? placeholder ?? ''}
        </span>
        {clearable && value && !disabled ? (
          <span
            role="button"
            aria-label="Clear selection"
            tabIndex={-1}
            onClick={(e) => {
              // Don't let the click reach the trigger and toggle the panel.
              e.stopPropagation()
              onChange('')
              setOpen(false)
            }}
            className="shrink-0 cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* `!disabled` too: a control that goes disabled while its panel is open
          must close, not leave an orphan popover behind. */}
      {open && coords && !disabled
        ? createPortal(
            <div
              ref={panelRef}
              data-combobox-portal
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.dropUp ? undefined : coords.top,
                bottom: coords.dropUp ? window.innerHeight - coords.top : undefined,
                width: coords.width,
              }}
              className="z-60 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            >
              {searchable ? (
                <div className="relative mb-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    autoComplete="off"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full rounded-md bg-transparent pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              ) : null}

              <ul
                className="max-h-60 overflow-y-auto"
                role="listbox"
                onScroll={handleScroll}
              >
                {filtered.length === 0 && !loading ? (
                  <li className="px-2 py-2 text-center text-sm text-muted-foreground">No results</li>
                ) : (
                  filtered.map((o) => {
                    const active = o.value === value
                    return (
                      <li key={o.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => choose(o.value)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                            active && 'bg-accent/60 text-foreground',
                          )}
                        >
                          {withAvatars ? (
                            o.avatarUrl ? (
                              <img
                                src={o.avatarUrl}
                                alt=""
                                className="size-8 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                                {initials(o.label)}
                              </span>
                            )
                          ) : null}

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{o.label}</span>
                              {o.badge ? (
                                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                                  {o.badge}
                                </span>
                              ) : null}
                            </span>
                            {o.hint ? (
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {o.hint}
                              </span>
                            ) : null}
                          </span>

                          {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                        </button>
                      </li>
                    )
                  })
                )}
                {loading ? (
                  <li className="flex items-center justify-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
