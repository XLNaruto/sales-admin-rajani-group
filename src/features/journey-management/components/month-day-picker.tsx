import { useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { monthRange } from '../lib/journey-format'

/**
 * Pick specific dates of one `yyyy-MM` month.
 *
 * The counterpart to `DayCountInput`: a bucket is normally a **count** ("four
 * weekly offs") and the sales incharge dates it himself, but some buckets are
 * dated by the office — a monthly meeting on the 12th is the office's call, not
 * his. This is the control for that case, and the count is then whatever was
 * picked.
 *
 * `react-day-picker` in `multiple` mode does the calendar; everything specific to
 * a generate run is expressed in its props rather than in a validator, for the
 * same reason the count field clamps as you type — a control that can't take a
 * wrong answer beats an error message:
 *
 * - **One month, no navigation.** `month` is fixed and the nav is gone: a run
 *   generates one period, so a date outside it is not a thing to refuse, it is a
 *   thing to be unreachable.
 * - **`disabled` holds both refusals.** A date another row picked is out of reach —
 *   one date cannot be two activities. And once the row is at its ceiling, every
 *   *unselected* date goes dead while the selected ones stay live, because
 *   deselecting is what makes room again.
 *
 * The ceiling is deliberately **not** `react-day-picker`'s own `max`: that prop is
 * destructive here. Clicking one more date at `max` makes it *reset the selection
 * to that single date* (`useMulti`), so a full row of twelve meeting dates would
 * silently collapse to one. Disabling is the behaviour this needs, and it comes
 * with the affordance `max` never had.
 *
 * **Dates stay `yyyy-MM-dd` strings** at this component's edges — the calendar's
 * `Date`s never leave it. The conversion is a symmetric local round-trip
 * (`parseISO` builds a local midnight, `format` reads local parts back), which is
 * the one trip that cannot shift a day. Anything that mixes it with UTC can, which
 * is why `journey-format` does string arithmetic instead.
 */
export function MonthDayPicker({
  month,
  value,
  taken,
  max,
  disabled = false,
  onChange,
}: {
  /** The month being picked in, as `yyyy-MM`. */
  month: string
  /** Dates this row holds, as `yyyy-MM-dd`. */
  value: string[]
  /** Dates other rows hold — unclickable here. */
  taken?: Set<string>
  /** Most dates this row may hold. */
  max?: number
  disabled?: boolean
  onChange: (dates: string[]) => void
}) {
  const selected = useMemo(() => value.map(toDate), [value])
  const held = useMemo(() => new Set(value), [value])
  const full = max != null && value.length >= max
  // The month the calendar opens on. `monthRange` is string arithmetic, so this
  // is the only date built from the month prop.
  const firstOfMonth = useMemo(() => toDate(monthRange(month).from), [month])

  return (
    <DayPicker
      mode="multiple"
      month={firstOfMonth}
      selected={selected}
      disabled={
        disabled ||
        ((date: Date) => {
          const iso = toISO(date)
          // Held dates are never disabled — that is the click that frees a day
          // when the row is full.
          if (held.has(iso)) return false
          return Boolean(taken?.has(iso)) || full
        })
      }
      hideNavigation
      showOutsideDays={false}
      onSelect={(dates) =>
        // Sorted, so the chips read in calendar order however they were clicked.
        onChange((dates ?? []).map(toISO).sort())
      }
      footer={
        full ? (
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            All {max} days of this activity are dated — remove one to pick another.
          </p>
        ) : undefined
      }
      classNames={CLASS_NAMES}
      // Chrome-less: the calendar is always shown inside a panel that already
      // brings the border, the surface and the padding.
      className="w-full"
    />
  )
}

/** `yyyy-MM-dd` → a local-midnight `Date`, the only form the calendar takes. */
function toDate(date: string): Date {
  return parseISO(date)
}

/** A calendar `Date` → `yyyy-MM-dd`, read off its local parts. */
function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * The calendar's skin, as Tailwind classes on `react-day-picker`'s own elements.
 *
 * Given in full rather than by importing the library stylesheet: the package ships
 * plain CSS with its own colours, which would be one more theme in an app that
 * already has design tokens — and it would not follow dark mode. Every class here
 * resolves through the same tokens as the rest of the dialog.
 */
const CLASS_NAMES = {
  months: 'relative',
  month: 'w-full',
  month_caption: 'hidden',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday:
    'flex-1 py-1 text-center text-[10px] font-medium text-muted-foreground',
  week: 'mt-1 flex',
  day: 'flex-1 p-0 text-center',
  day_button: cn(
    'h-7 w-full cursor-pointer rounded-md text-xs font-medium tabular-nums transition-colors',
    'hover:bg-primary/10 hover:text-primary',
  ),
  selected: '[&_button]:bg-primary [&_button]:text-primary-foreground [&_button:hover]:bg-primary',
  // Both a date another row holds and — once the row is full — every unselected
  // one. See the `disabled` matcher above.
  disabled:
    '[&_button]:cursor-not-allowed [&_button]:opacity-35 [&_button:hover]:bg-transparent [&_button:hover]:text-foreground',
  today: 'font-semibold text-primary',
  outside: 'invisible',
  hidden: 'invisible',
} as const
