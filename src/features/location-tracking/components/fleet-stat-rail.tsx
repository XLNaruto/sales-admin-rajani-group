import { Hint } from '@/components/common/hint'

/**
 * The screen's headline numbers.
 *
 * Only the first is about the team: `total` counts REPS in the selected company,
 * which is why it will exceed the number of markers the map can draw. Every
 * other cell is explicitly **of this page** — the beat / stale / mock filters are
 * applied by the server after it pages the rep list, so a filtered total is a
 * number the client genuinely cannot compute, and inventing one would be worse
 * than not showing it.
 */
export function FleetStatRail({
  total,
  counts,
  narrowing,
}: {
  total: number
  counts: { fresh: number; stale: number; noSignal: number; mock: number; shown: number }
  narrowing: boolean
}) {
  return (
    <div className="grid grid-cols-2 divide-border/60 rounded-xl border border-border/60 bg-card sm:grid-cols-3 sm:divide-x lg:grid-cols-6">
      <Cell
        label="Team"
        hint="Every rep in the selected company — not the number of markers on the map."
      >
        {total}
      </Cell>
      <Cell
        label="On this page"
        hint={
          narrowing
            ? 'Rows matching the beat / signal / device filter on this page. A later page may hold more.'
            : 'Rows on the page currently shown.'
        }
      >
        {counts.shown}
      </Cell>
      <Cell label="Live" hint="Reported within the last 15 minutes.">
        <span className="text-success">{counts.fresh}</span>
      </Cell>
      <Cell
        label="Stale"
        hint="Last fix older than 15 minutes — a signal dead zone trips this too."
      >
        <span className="text-muted-foreground">{counts.stale}</span>
      </Cell>
      <Cell
        label="No signal"
        hint="Nothing reported by the handset on this day, so there is no marker to place."
      >
        <span className="text-warning">{counts.noSignal}</span>
      </Cell>
      <Cell
        label="Fake today"
        hint="Reps on this page with at least one mock-location fix anywhere on this day — not only on their latest fix."
      >
        <span className={counts.mock ? 'text-destructive' : undefined}>{counts.mock}</span>
      </Cell>
    </div>
  )
}

function Cell({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <Hint label={hint}>
        <p className="w-fit cursor-default text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
      </Hint>
      <p className="mt-1 font-heading text-2xl font-semibold leading-none tabular-nums">
        {children}
      </p>
    </div>
  )
}
