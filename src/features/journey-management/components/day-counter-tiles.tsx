import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import type { DayCounters } from '../types'

/**
 * The day's headline counters, as six tiles.
 *
 * Tiles rather than the month card's hairline grid because this is the sidebar's
 * first block and has to be readable at a glance from across a desk. Order is the
 * order they're read in: what was planned, what was called, what paid off on the
 * top row; the three exception counters underneath.
 */
const TILES: {
  key: keyof DayCounters
  label: string
  hint: string
  tone: 'neutral' | 'primary' | 'success' | 'warning' | 'destructive'
}[] = [
  { key: 'sc', label: 'SC', hint: 'Scheduled calls — outlets the beat plan asked for', tone: 'neutral' },
  { key: 'tc', label: 'TC', hint: 'Total calls actually punched', tone: 'primary' },
  { key: 'pc', label: 'PC', hint: 'Productive calls — booked an order', tone: 'success' },
  { key: 'ovt', label: 'OVT', hint: 'Out-of-turn calls — not on the day’s plan', tone: 'warning' },
  { key: 'to', label: 'TO', hint: 'Outlets found temporarily closed', tone: 'warning' },
  { key: 'ovc', label: 'OVC', hint: 'Out-of-village calls', tone: 'destructive' },
]

const TONE: Record<string, string> = {
  neutral: 'border-border/60 bg-muted/40 text-foreground',
  primary: 'border-primary/25 bg-primary/8 text-primary',
  success: 'border-success/25 bg-success/8 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/25 bg-destructive/8 text-destructive',
}

export function DayCounterTiles({ counters }: { counters: DayCounters }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TILES.map((tile) => {
        const value = counters[tile.key]
        return (
          <Hint key={tile.key} label={tile.hint}>
            <div
              className={cn(
                'cursor-default rounded-lg border px-2 py-2.5 text-center',
                TONE[tile.tone],
                // A zero carries no signal — mute it so the numbers that do
                // carry one are what the eye lands on.
                value === 0 && 'border-border/60 bg-muted/30 text-muted-foreground',
              )}
            >
              <p className="font-heading text-2xl font-semibold leading-none tabular-nums">
                {value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.09em] opacity-80">
                {tile.label}
              </p>
            </div>
          </Hint>
        )
      })}
    </div>
  )
}
