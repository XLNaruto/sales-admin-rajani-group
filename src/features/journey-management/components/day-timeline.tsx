import { Flag, Goal, Star, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRAIL_END_ID, TRAIL_START_ID } from '../lib/trail-selection'
import { kindStyle, NOT_VISITED_STYLE } from '../lib/visit-kinds'
import { durationLabel } from '../lib/journey-format'
import type { DayVisit, ScheduledOutlet } from '../types'

/**
 * The day in punch order, plus the planned stops it never reached.
 *
 * Both lists scroll inside their own box rather than growing the page: the map
 * beside them is the tall element on this screen, and a 40-call day would otherwise
 * push it off the fold. Selecting a row is what links the two panels — the map pans
 * to that marker, so a suspicious 20-minute gap can be checked against where it
 * happened.
 *
 * Rows are numbered by `daySequence` (chronological). The map numbers its pins by
 * the route's own `sequence` (optimised), and the two are deliberately not made to
 * agree — where they disagree is exactly where the rep backtracked.
 */
export function DayTimeline({
  visits,
  missed,
  missIdsOnMap,
  dayStart,
  dayEnd,
  selectedId,
  onSelect,
}: {
  /** Calls the active trail filter keeps, in punch order. */
  visits: DayVisit[]
  /** Planned stops never reached — always the full list, filter or not. */
  missed: ScheduledOutlet[]
  /** Of those, the ones the map is currently drawing a pin for. */
  missIdsOnMap: Set<string>
  /** `HH:mm` of the day's check-in, if there was one. */
  dayStart: string | null
  /** `HH:mm` of the day's check-out, if it was punched. */
  dayEnd: string | null
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <>
      <Section title="Timeline" count={visits.length}>
        <ul className="max-h-72 overflow-auto">
          {dayStart ? (
            <PunchRow
              icon={Flag}
              label="Day start"
              at={dayStart}
              id={TRAIL_START_ID}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : null}

          {visits.map((visit) => {
            const style = kindStyle(visit.kind)
            const selected = visit.id === selectedId
            const dwell = durationLabel(visit.dwellSeconds)
            return (
              <li key={visit.id} className="border-b border-border/40 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(selected ? null : visit.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full cursor-pointer items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50',
                    selected && 'bg-primary/8',
                  )}
                >
                  <span className="w-16 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {visit.at ?? `#${visit.daySequence}`}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: style.color }}
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {visit.outlet}
                      </span>
                      {visit.productive ? (
                        <Star className="size-3 shrink-0 fill-warning text-warning" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate pl-3.5 text-[11px] text-muted-foreground">
                      {style.label}
                      {visit.beatName ? ` · ${visit.beatName}` : ''}
                      {dwell ? ` · ${dwell}` : ''}
                      {/* `order_value` is always null until the orders module lands. */}
                      {visit.orderValue ? ` · ₹${visit.orderValue}` : ''}
                      {visit.reason ? ` · ${visit.reason}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}

          {visits.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              No calls match this filter.
            </li>
          ) : null}

          {/* Punch-out closes the list, wherever the filter left the calls above it
              — the day ended after all of them, filtered or not. */}
          {dayEnd ? (
            <PunchRow
              icon={Goal}
              label="Day end"
              at={dayEnd}
              id={TRAIL_END_ID}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : null}
        </ul>
      </Section>

      <Section title="Not visited" count={missed.length}>
        <ul className="max-h-40 overflow-auto">
          {missed.map((outlet) => {
            const selected = outlet.id === selectedId
            // The panel lists every miss; the map only draws the ones the active
            // filter keeps *and* that carry a fix. A row with no pin behind it stays
            // plain text rather than offering a click that couldn't go anywhere.
            const onMap = missIdsOnMap.has(outlet.id)
            const body = (
              <>
                <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {outlet.plannedSequence != null ? `#${outlet.plannedSequence}` : 'N/A'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      // Slate-600 is tuned for map tiles; on the app's dark
                      // surface a 2px ring in it vanishes, so the chip hue takes
                      // over there — same split the legend uses.
                      className="size-2 shrink-0 rounded-full border border-(--dot) dark:border-(--dot-dark)"
                      style={
                        {
                          '--dot': NOT_VISITED_STYLE.color,
                          '--dot-dark': NOT_VISITED_STYLE.darkColor,
                        } as React.CSSProperties
                      }
                    />
                    <span className="truncate text-sm text-muted-foreground">{outlet.name}</span>
                  </span>
                  <span className="mt-0.5 block truncate pl-3.5 text-[11px] text-muted-foreground">
                    {outlet.stopType}
                    {onMap ? '' : ' · no location on file'}
                  </span>
                </span>
              </>
            )

            return (
              <li key={outlet.id} className="border-b border-border/40 last:border-b-0">
                {onMap ? (
                  <button
                    type="button"
                    onClick={() => onSelect(selected ? null : outlet.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full cursor-pointer items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50',
                      selected && 'bg-primary/8',
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-baseline gap-3 px-3 py-2">{body}</div>
                )}
              </li>
            )
          })}

          {missed.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">
              Every planned stop was covered.
            </li>
          ) : null}
        </ul>
      </Section>
    </>
  )
}

/**
 * Punch-in / punch-out as a timeline row.
 *
 * Clickable like a call, and for the same reason: the two punches are the day's
 * bookends, and "where did he start from" is asked at least as often as anything
 * about a single call. Selecting one hands the map the reserved id.
 */
function PunchRow({
  icon: Icon,
  label,
  at,
  id,
  selectedId,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  /** `HH:mm` of the punch. */
  at: string
  id: typeof TRAIL_START_ID | typeof TRAIL_END_ID
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const selected = id === selectedId
  return (
    <li className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect(selected ? null : id)}
        aria-pressed={selected}
        className={cn(
          'flex w-full cursor-pointer items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50',
          selected && 'bg-primary/8',
        )}
      >
        <span className="w-16 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {at}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Icon className="size-3 text-muted-foreground" />
          {label}
        </span>
      </button>
    </li>
  )
}

/** A labelled, boxed list — the sidebar's repeating unit. */
function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[11px] tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60">{children}</div>
    </div>
  )
}
