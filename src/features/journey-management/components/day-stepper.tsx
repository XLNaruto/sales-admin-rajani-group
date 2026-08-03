import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  getDaysInMonth,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Date pager for the day trail.
 *
 * The chevrons step one day, which is how a trail is actually reviewed — you walk
 * forward through a week looking for the day that went wrong. The label opens a
 * month calendar for the jumps that would otherwise take twenty clicks, and days
 * after `max` are disabled there rather than hidden, so the shape of the month
 * stays readable.
 */
export function DayStepper({
  date,
  label,
  max,
  onPrev,
  onNext,
  onSelect,
}: {
  /** Selected date as `yyyy-MM-dd`. */
  date: string
  label: string
  /** Latest selectable date as `yyyy-MM-dd` — usually today. */
  max: string
  onPrev: () => void
  onNext: () => void
  onSelect: (date: string) => void
}) {
  const [open, setOpen] = useState(false)
  // Month being browsed in the panel — reset to the selection on each open, so
  // reopening never strands you in a month you scrolled away to last time.
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISO(date)))
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

  const cells = useMemo(() => {
    const days = getDaysInMonth(viewMonth)
    const lead = getDay(startOfMonth(viewMonth))
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ]
  }, [viewMonth])

  const monthKey = format(viewMonth, 'yyyy-MM')
  const iso = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`

  const togglePicker = () => {
    setViewMonth(startOfMonth(parseISO(date)))
    setOpen((o) => !o)
  }

  return (
    <div ref={ref} className="relative">
      <div className="inline-flex h-10 items-center gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-[rgba(99,99,99,0.12)_0px_1px_4px_0px]">
        <Hint label="Previous day">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous day"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
        </Hint>

        <Hint label="Pick a date">
          <button
            type="button"
            onClick={togglePicker}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex h-8 min-w-32 cursor-pointer items-center justify-center rounded-lg px-2 font-mono text-sm font-normal tracking-tight transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {label}
          </button>
        </Hint>

        <Hint label="Next day">
          <button
            type="button"
            onClick={onNext}
            disabled={date >= max}
            aria-label="Next day"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-4" />
          </button>
        </Hint>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Select a date"
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-lg"
        >
          {/* Month row — the panel browses a month without committing to it. */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
              className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-heading text-sm font-semibold">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              disabled={format(endOfMonth(viewMonth), 'yyyy-MM-dd') >= max}
              aria-label="Next month"
              className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday, i) => (
              <span
                key={`${weekday}-${i}`}
                className="grid h-6 place-items-center text-[10px] font-semibold uppercase text-muted-foreground"
              >
                {weekday}
              </span>
            ))}

            {cells.map((day, index) =>
              day == null ? (
                <span key={`pad-${index}`} aria-hidden="true" />
              ) : (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onSelect(iso(day))
                    setOpen(false)
                  }}
                  disabled={iso(day) > max}
                  aria-current={iso(day) === date || undefined}
                  className={cn(
                    'grid h-8 cursor-pointer place-items-center rounded-lg text-sm tabular-nums transition-colors',
                    iso(day) === date
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                    'disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent',
                  )}
                >
                  {day}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
