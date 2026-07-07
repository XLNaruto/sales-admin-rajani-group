import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Rough panel height used to decide whether to open upward. */
const PANEL_MAX = 300

export interface ComboboxOption {
  label: string
  value: string
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
  /** How the panel aligns to the trigger (from `sm` up when `responsiveCenter`). */
  align?: 'start' | 'center' | 'end'
  /** Center the panel on mobile, then fall back to `align` from `sm` up. */
  responsiveCenter?: boolean
  /** Width utility for the trigger (e.g. "lg:w-44"). */
  className?: string
}

/**
 * Custom searchable dropdown (combobox). Zero-dependency: a button trigger +
 * an absolutely-positioned panel with a filter box and a checkmark on the
 * selected option. Closes on outside-click or Escape.
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
  responsiveCenter = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Flip the panel above the trigger when there's not enough room below.
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setDropUp(spaceBelow < PANEL_MAX && rect.top > spaceBelow)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-foreground transition-colors hover:border-ring/40',
          open && 'ring-1 ring-ring',
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
        <span
          className={cn(
            'flex-1 truncate text-left',
            !selected && 'text-muted-foreground',
          )}
        >
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute z-50 w-full overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
            // Base (mobile) alignment.
            responsiveCenter || align === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : align === 'end'
                ? 'right-0'
                : 'left-0',
            // From `sm` up, `responsiveCenter` falls back to `align`.
            responsiveCenter &&
              (align === 'end'
                ? 'sm:left-auto sm:right-0 sm:translate-x-0'
                : align === 'start'
                  ? 'sm:left-0 sm:translate-x-0'
                  : ''),
          )}
        >
          {searchable ? (
            <div className="relative mb-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-md bg-transparent pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : null}

          <ul className="max-h-60 overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">No results</li>
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
                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                        active && 'bg-accent/60 font-medium text-foreground',
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
