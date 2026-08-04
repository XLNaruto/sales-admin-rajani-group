import { Hint } from '@/components/common/hint'
import { DAY_LABEL_HINT, DAY_LABEL_LEGEND, PINNED_MARK_COLOR } from '../lib/day-label'

/**
 * Decoder for the Month column. The strip carries three encodings — colour for
 * the server's day label, segment count for beats, and an underline for a pinned
 * date — and none of them is guessable, so the legend sits with the table rather
 * than in a tooltip.
 *
 * Each swatch carries its own hint, because the distinction that matters most
 * (`absent` is a date nobody accounted for; `unplanned` is simply still to come)
 * cannot be read off a colour.
 */
export function StripLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-[0.08em]">Month</span>

      {DAY_LABEL_LEGEND.map((entry) => (
        <Hint key={entry.label} label={DAY_LABEL_HINT[entry.label]}>
          <span className="inline-flex cursor-default items-center gap-1.5">
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

      <Hint label="A date the office fixed for everyone, which the rep has not overridden.">
        <span className="inline-flex cursor-default flex-col items-center gap-px">
          <span
            aria-hidden
            style={{
              display: 'block',
              width: 4,
              height: 9,
              borderRadius: 1,
              backgroundColor: 'var(--primary)',
            }}
          />
          <span
            aria-hidden
            style={{
              display: 'block',
              width: 4,
              height: 2,
              borderRadius: 1,
              backgroundColor: PINNED_MARK_COLOR,
            }}
          />
        </span>
      </Hint>
      <span className="-ml-2.5">pinned</span>

      <span className="inline-flex items-center gap-1.5">
        {/* A three-beat pillar, drawn the same way the strip draws it. */}
        <span
          aria-hidden
          style={{ display: 'flex', flexDirection: 'column', gap: 1, width: 4, height: 12 }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ flex: '1 1 0', borderRadius: 1, backgroundColor: 'var(--primary)' }}
            />
          ))}
        </span>
        one segment per beat
      </span>
    </div>
  )
}
