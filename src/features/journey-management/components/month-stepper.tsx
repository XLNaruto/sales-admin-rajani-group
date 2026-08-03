import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** `yyyy-MM` → its year and 1-based month. */
function parseMonth(month: string) {
  const [year, m] = month.split('-').map(Number)
  return { year, month: m }
}

/**
 * Month pager for the review batch — one run per month, so the whole screen is
 * scoped by this control rather than a date-range picker.
 *
 * The chevrons step one month; the label opens a month/year picker for jumps
 * that would otherwise take a dozen clicks.
 */
export function MonthStepper({
  month,
  label,
  onPrev,
  onNext,
  onSelect,
}: {
  /** Selected month as `yyyy-MM`. */
  month: string
  label: string
  onPrev: () => void
  onNext: () => void
  onSelect: (month: string) => void
}) {
  const selected = parseMonth(month)
  const [open, setOpen] = useState(false)
  // Year being browsed in the panel — reset to the selection on each open, so
  // reopening never strands you in a year you scrolled away to last time.
  const [viewYear, setViewYear] = useState(selected.year)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const togglePicker = () => {
    setViewYear(selected.year)
    setOpen((o) => !o)
  }

  const pick = (m: number) => {
    onSelect(`${viewYear}-${String(m).padStart(2, '0')}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="inline-flex h-10 items-center gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-[rgba(99,99,99,0.12)_0px_1px_4px_0px]">
        <Hint label="Previous month">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous month"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
        </Hint>

        <Hint label="Pick month & year">
          <button
            type="button"
            onClick={togglePicker}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex h-8 min-w-32 cursor-pointer items-center justify-center rounded-lg px-2 font-heading text-sm font-semibold tracking-tight transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {label}
          </button>
        </Hint>

        <Hint label="Next month">
          <button
            type="button"
            onClick={onNext}
            aria-label="Next month"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </Hint>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Select month and year"
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-lg"
        >
          {/* Year row — the panel browses a year without committing to it. */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Previous year"
              className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-heading text-sm font-semibold tabular-nums">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Next year"
              className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1">
            {MONTHS.map((name, i) => {
              const isSelected =
                viewYear === selected.year && i + 1 === selected.month
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => pick(i + 1)}
                  aria-current={isSelected || undefined}
                  className={cn(
                    'cursor-pointer rounded-lg px-2 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
