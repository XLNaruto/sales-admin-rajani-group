import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import type { DayCounters } from '../types'

/**
 * The six counters, in the order the field force reads them: what was attempted
 * on the top row, how the plan was followed on the bottom.
 *
 * Abbreviations are what the reports use, so they stay — the tooltip carries the
 * expansion rather than the label, which would otherwise not fit six to a card.
 */
const CELLS: {
  key: keyof DayCounters
  label: string
  hint: string
  /** Tone applied once the number is above zero. */
  tone?: 'success' | 'warning'
}[] = [
  { key: 'tc', label: 'TC', hint: 'Total calls' },
  { key: 'pc', label: 'PC', hint: 'Productive calls — booked an order', tone: 'success' },
  { key: 'ovc', label: 'OVC', hint: 'Out-of-village calls' },
  { key: 'inTurn', label: 'In turn', hint: 'Calls made in the planned beat sequence' },
  { key: 'to', label: 'TO', hint: 'Outlets found temporarily closed' },
  { key: 'ovt', label: 'OVT', hint: 'Out-of-turn calls — not on the day’s plan', tone: 'warning' },
]

const LABEL =
  'mt-0.5 inline-block cursor-default text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground'

/**
 * A day's numbers as a 3 × 2 block.
 *
 * A fixed grid rather than a list of chips so the same figure sits in the same
 * place on all thirty-one cards — a month is read by scanning down one column.
 */
export function CounterGrid({
  counters,
  /** `lg` is the dialog's size; the default fits a day card. */
  size = 'sm',
  className,
}: {
  counters: DayCounters
  size?: 'sm' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-3 text-center', className)}>
      {CELLS.map((cell, index) => {
        const value = counters[cell.key]
        const toned = value > 0 && cell.tone
        return (
          <div
            key={cell.key}
            className={cn(
              'min-w-0 border-t border-border/40 px-1',
              size === 'lg' ? 'py-2' : 'py-1.5',
              index % 3 !== 0 && 'border-l',
            )}
          >
            <p
              className={cn(
                'font-heading font-semibold leading-none tabular-nums',
                size === 'lg' ? 'text-2xl' : 'text-base',
                value === 0 && 'text-muted-foreground/70',
                toned === 'success' && 'text-success',
                toned === 'warning' && 'text-warning',
              )}
            >
              {value}
            </p>
            {/* A month of cards is 180 cells — the tooltip is worth mounting on
                the dialog's single grid, not on all of them. */}
            {size === 'lg' ? (
              <Hint label={cell.hint}>
                <span className={LABEL}>{cell.label}</span>
              </Hint>
            ) : (
              <span className={LABEL} title={cell.hint}>
                {cell.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
