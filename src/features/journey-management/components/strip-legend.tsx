import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { ADMIN_MARK_COLOR, DAY_LABEL_HINT, DAY_LABEL_LEGEND } from '../lib/day-label'

/**
 * Decoder for the Month column. The strip carries three encodings — colour for
 * the server's day label, segment count for beats, and an underline for a date the
 * admin corrected — and none of them is guessable, so the legend sits with the
 * table rather than in a tooltip.
 *
 * Each swatch carries its own hint, because the distinction that matters most
 * (`missed` is a scheduled date nobody worked; `unscheduled` simply has no row
 * yet, which is normal until the month is submitted) cannot be read off a colour.
 */
export function StripLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground',
        className,
      )}
    >
      <span className="font-semibold uppercase tracking-[0.08em]">Month</span>

      {DAY_LABEL_LEGEND.map((entry) => (
        <Hint key={entry.label} label={DAY_LABEL_HINT[entry.label]}>
          <span className="inline-flex cursor-default items-center gap-1.5 whitespace-nowrap">
            <span
              aria-hidden
              style={{
                display: 'block',
                width: 4,
                height: 12,
                borderRadius: 1,
                backgroundColor: entry.color,
              }}
            />
            {entry.text}
          </span>
        </Hint>
      ))}

      {/* Swatch and word are one span, so a wrap can never strand "corrected" on
          the next line away from the mark it names. */}
      <Hint label="A date the admin corrected after the sales incharge submitted the month — this is where the approved calendar differs from the one he handed over.">
        <span className="inline-flex cursor-default items-center gap-1.5 whitespace-nowrap">
          <span
            aria-hidden
            className="flex flex-col items-center gap-px"
            style={{ width: 4 }}
          >
            <span
              style={{
                display: 'block',
                width: 4,
                height: 9,
                borderRadius: 1,
                backgroundColor: 'var(--primary)',
              }}
            />
            <span
              style={{
                display: 'block',
                width: 4,
                height: 2,
                borderRadius: 1,
                backgroundColor: ADMIN_MARK_COLOR,
              }}
            />
          </span>
          corrected
        </span>
      </Hint>

      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {/* A three-beat pillar, drawn the same way the strip draws it. */}
        <span
          aria-hidden
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            width: 4,
            height: 12,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                flex: '1 1 0',
                borderRadius: 1,
                backgroundColor: 'var(--primary)',
              }}
            />
          ))}
        </span>
        one segment per beat
      </span>
    </div>
  )
}
