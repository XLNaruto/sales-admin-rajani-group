import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { productivity } from '../lib/daily-report-format'
import type { DailyReportCounters } from '../types'

const TILES: {
  key: keyof DailyReportCounters
  label: string
  hint: string
  tone: string
}[] = [
  {
    key: 'sc',
    label: 'SC',
    hint: 'Scheduled calls — outlets planned for the day',
    tone: 'border-border/60 bg-muted/40 text-foreground',
  },
  {
    key: 'tc',
    label: 'TC',
    hint: 'Total calls — visits in this report’s window',
    tone: 'border-primary/25 bg-primary/8 text-primary',
  },
  {
    key: 'pc',
    label: 'PC',
    hint: 'Productive calls — visits that took an order',
    tone: 'border-success/25 bg-success/8 text-success',
  },
  {
    key: 'nc',
    label: 'NC',
    hint: 'New counters — retailers onboarded in this window',
    tone: 'border-warning/30 bg-warning/10 text-warning',
  },
]

const MUTED = 'border-border/60 bg-muted/30 text-muted-foreground'

/** SC / TC / PC / NC plus PC ÷ TC productivity ("—" with no calls), as one row of tiles. */
export function ReportCounterTiles({ counters }: { counters: DailyReportCounters }) {
  const percent = productivity(counters)

  return (
    <div className="flex gap-2">
      {TILES.map((tile) => {
        const value = counters[tile.key]
        return (
          <Hint key={tile.key} label={tile.hint}>
            <div
              className={cn(
                'min-w-0 flex-1 cursor-default rounded-lg border px-2 py-3 text-center',
                // A zero carries no signal — mute it.
                value === 0 ? MUTED : tile.tone,
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
      <Hint label="Productive calls as a share of total calls">
        <div
          className={cn(
            'min-w-0 flex-1 cursor-default rounded-lg border px-2 py-3 text-center',
            percent === null ? MUTED : 'border-primary/25 bg-primary/8 text-primary',
          )}
        >
          <p className="font-heading text-2xl font-semibold leading-none tabular-nums">
            {percent === null ? '—' : `${percent}%`}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.09em] opacity-80">
            Productivity
          </p>
        </div>
      </Hint>
    </div>
  )
}
