import * as React from 'react'
import ReactDatePicker from 'react-date-picker'
import 'react-calendar/dist/Calendar.css'
import 'react-date-picker/dist/DatePicker.css'
import { format, parse, isValid } from 'date-fns'
import { Calendar as CalendarIcon, Check, ChevronDown, Search, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ComboboxOption } from '@/components/ui/combobox'

/** Close a popover on outside-click / Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

/** Labelled field wrapper with inline error + optional hint. */
export function Field({
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className={cn('text-foreground/90', !optional && 'required')}>{label}</Label>
      {children}
      {error ? (
        <p data-error className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Date picker (react-date-picker) — value is a 'yyyy-MM-dd' string.
 * Themed via the `.sa-datepicker` overrides in globals.css.
 */
export function DatePicker({
  value,
  onChange,
  fromYear = 1950,
  toYear = 2035,
  maxDate,
  minDate,
}: {
  value: string
  onChange: (v: string) => void
  fromYear?: number
  toYear?: number
  /** Latest selectable date. Overrides the `toYear` end-of-year default when set
   *  (e.g. to enforce a minimum age on a birth-date field). */
  maxDate?: Date
  /** Earliest selectable date. Overrides the `fromYear` start-of-year default
   *  when set (e.g. to bar dates before the owner's date of birth). */
  minDate?: Date
}) {
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : null
  const selected = parsed && isValid(parsed) ? parsed : null

  // With nothing picked yet, open the calendar on `maxDate`'s month (e.g. the
  // 18-years-ago cap for a birth date) instead of today — so the user isn't
  // dropped on a fully-disabled current month and forced to page backwards.
  const openMonth = !selected && maxDate ? maxDate : undefined

  return (
    <ReactDatePicker
      className="sa-datepicker"
      value={selected}
      onChange={(d) => {
        const date = Array.isArray(d) ? d[0] : d
        onChange(date ? format(date, 'yyyy-MM-dd') : '')
      }}
      format="dd-MM-yyyy"
      dayPlaceholder="dd"
      monthPlaceholder="mm"
      yearPlaceholder="yyyy"
      minDate={minDate ?? new Date(fromYear, 0, 1)}
      maxDate={maxDate ?? new Date(toYear, 11, 31)}
      calendarProps={openMonth ? { defaultActiveStartDate: openMonth } : undefined}
      calendarIcon={<CalendarIcon className="size-4 text-muted-foreground" />}
      clearIcon={value ? <X className="size-4 text-muted-foreground" /> : null}
    />
  )
}

/** Searchable multi-select with chips. Value is an array of option values. */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search',
}: {
  value: string[]
  onChange: (v: string[]) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const ref = useDismiss(open, () => setOpen(false))

  const selected = options.filter((o) => value.includes(o.value))
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm transition-colors hover:border-ring/40',
          open && 'ring-1 ring-ring',
        )}
      >
        {selected.length === 0 ? (
          <span className="px-1 text-muted-foreground">{placeholder}</span>
        ) : (
          selected.map((o) => (
            <Badge key={o.value} variant="secondary" className="gap-1 py-0.5 pr-1">
              {o.label}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(o.value)
                }}
                className="cursor-pointer rounded-full p-0.5 hover:bg-background/60"
              >
                <X className="size-3" />
              </span>
            </Badge>
          ))
        )}
        <ChevronDown
          className={cn(
            'ml-auto size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg">
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
          <ul className="max-h-56 overflow-y-auto" role="listbox" aria-multiselectable>
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">No results</li>
            ) : (
              filtered.map((o) => {
                const active = value.includes(o.value)
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => toggle(o.value)}
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
