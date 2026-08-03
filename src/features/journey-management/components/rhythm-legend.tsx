import { DAY_KIND_LEGEND } from '../lib/day-kind'

/**
 * Decoder for the Month Rhythm column. The strip carries two encodings — colour
 * for the kind of day, segment count for beats — and neither is guessable, so
 * the legend sits with the table rather than in a tooltip.
 */
export function RhythmLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-[0.08em]">Month rhythm</span>
      {DAY_KIND_LEGEND.map((entry) => (
        <span key={entry.label} className="inline-flex items-center gap-1.5">
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
          {entry.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
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
