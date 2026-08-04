import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, BadgeCheck, Hash, MapPin, Navigation, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { EmptyState } from '@/components/common/empty-state'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { durationLabel, timeOfDay, toKmPrecise } from '../lib/journey-format'
import { routeStateNote, STATUS_LABEL } from '../lib/live-day-metrics'
import { TRAIL_END_ID, TRAIL_START_ID } from '../lib/trail-selection'
import { DayCounterTiles } from '../components/day-counter-tiles'
import { DaySkeleton } from '../components/day-skeleton'
import { DayStepper } from '../components/day-stepper'
import { DayTimeline } from '../components/day-timeline'
import { DayTrailMap } from '../components/day-trail-map'
import { TrailLegend } from '../components/trail-legend'
import { useLiveDay } from '../hooks/use-live-day'

interface LiveDayPageProps {
  /** Encrypted `?data=` token carrying `{ id, date }`. */
  data?: string
}

/**
 * Journey Management → Live Map → one day's trail.
 *
 * Two panels describing the same day from different angles: the sidebar is the day
 * as numbers and as a sequence (counters, attendance, the punch-by-punch timeline,
 * the stops that were missed), and the map is the same day as geography. Selecting a
 * call in either moves the other, because the questions asked here are always both —
 * *when* did the gap happen, and *where* was he when it did.
 *
 * The line on the map is a **reconstruction**, not a GPS trail: no breadcrumb track
 * exists, so what is drawn is the shortest walk through the day's visit fixes,
 * anchored at the check-in. When the server says it isn't drawable, the pins are
 * shown with no line and the reason is spelled out.
 */
export function LiveDayPage({ data }: LiveDayPageProps) {
  const {
    day,
    isLoading,
    date,
    dateLabel,
    incharge,
    inchargeCode,
    inchargeHint,
    prevDate,
    nextDate,
    selectDate,
    today,
    filter,
    setFilter,
    visits,
    visitMarkers,
    missMarkers,
    missed,
    monthToken,
  } = useLiveDay(data)

  const [picked, setPicked] = useState<string | null>(null)

  /**
   * Switching the legend filter is a change of *slice*, not of focus: the row that
   * was open belonged to the previous slice, so the selection is dropped and the map
   * refits to the pins the new filter draws instead of staying parked on one call.
   */
  const changeFilter = (next: typeof filter) => {
    setPicked(null)
    setFilter(next)
  }
  /** Road distance from Directions — preferred over the straight-line estimate. */
  const [roadKm, setRoadKm] = useState<number | null>(null)

  /** Misses the map has a pin for — the NOT VISITED panel lists them all. */
  const missIdsOnMap = new Set(missMarkers.map((outlet) => outlet.id))

  const checkIn = timeOfDay(day?.attendance.dayStartAt)
  const checkOut = timeOfDay(day?.attendance.dayEndAt)

  // A selection only survives while its marker is on screen — switching filters must
  // not leave the map panned at a marker it no longer draws. The two punch markers
  // are filter-independent: they survive as long as the day has them.
  const selectable =
    picked === TRAIL_START_ID
      ? Boolean(day?.attendance.checkIn)
      : picked === TRAIL_END_ID
        ? Boolean(day?.attendance.checkOut)
        : visitMarkers.some((visit) => visit.id === picked) ||
          (picked != null && missIdsOnMap.has(picked))
  const selectedId = selectable ? picked : null

  const routeNote = day ? routeStateNote(day.route.state) : null

  return (
    <div>
      {/* Header — who, which day, and the way back to the month. */}
      <div className="mb-5 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Navigation className="size-5" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Live map · {format(parseISO(date), 'dd-MM-yyyy')}
              </p>
              <Combobox
                variant="inline"
                withAvatars
                placeholder="Select sales incharge"
                searchPlaceholder="Search sales incharge…"
                value={incharge.value}
                onChange={incharge.onChange}
                options={incharge.options}
                loading={incharge.loading}
                onScrollEnd={incharge.onScrollEnd}
                onSearchChange={incharge.onSearchChange}
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {day ? (
                  <Badge variant={day.status === 'worked' ? 'default' : 'secondary'}>
                    {STATUS_LABEL[day.status] ?? day.status}
                  </Badge>
                ) : null}
                <Chip icon={Hash} value={inchargeCode} mono />
                <Chip icon={BadgeCheck} value={inchargeHint} />
                {day && day.mockSuspectedCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    <ShieldAlert className="size-3.5" />
                    {day.mockSuspectedCount} mock-location hit
                    {day.mockSuspectedCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DayStepper
              date={date}
              label={dateLabel}
              max={today}
              onPrev={prevDate}
              onNext={nextDate}
              onSelect={selectDate}
            />
            <Link
              to="/journey/live-map"
              search={{ data: monthToken }}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Month
            </Link>
          </div>
        </div>

        {/* Legend lives in the header, not under the map: it filters the timeline as
            well as the pins, so it belongs to the whole day. */}
        {day ? (
          <div className="mt-4 border-t border-border/50 pt-3">
            <TrailLegend day={day} value={filter} onChange={changeFilter} />
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <DaySkeleton />
      ) : !day ? (
        <EmptyState
          title="No data for this date"
          description="Pick a date this sales incharge has a journey plan or attendance for."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[21rem_1fr]">
          {/* Sidebar — the day as numbers, then as a sequence. */}
          <aside className="min-w-0 rounded-xl border border-border/60 bg-card p-4">
            <DayCounterTiles counters={day.counters} />

            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Day start">{checkIn ?? '—'}</Row>
              <Row label="Day end">{checkOut ?? '—'}</Row>
              {/* Two different durations: "On field" includes breaks, "working"
                  excludes them. Labelled apart so neither passes for the other. */}
              <Row label="On field">
                <Hint label="Check-in to check-out, including breaks.">
                  <span className="cursor-default">
                    {durationLabel(day.attendance.elapsedSeconds) ?? '—'}
                  </span>
                </Hint>
              </Row>
              <Row label="Working">
                <Hint label="The same span with breaks taken out.">
                  <span className="cursor-default">
                    {durationLabel(day.attendance.workingSeconds) ?? '—'}
                  </span>
                </Hint>
              </Row>
              {/* Every beat here is his own pick, in the order he took them. */}
              <Row label={day.beats.length > 1 ? 'Beats worked' : 'Beat worked'}>
                {day.beats.length ? day.beats.map((beat) => beat.name).join(' → ') : '—'}
              </Row>
              {/* A deviation, not a refusal: an off-list beat is allowed, and the
                  admin sees it here. `true` on a day with no beats at all, so the
                  row is only worth showing when he actually worked one. */}
              {day.beats.length && !day.onAllocation ? (
                <Row label="On allocation">
                  <span className="font-medium text-warning">Off this month&rsquo;s list</span>
                </Row>
              ) : null}
            </dl>

            {day.attendance.dayStartAddress ? (
              <p className="mt-3 flex items-start gap-1.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                <span>{day.attendance.dayStartAddress}</span>
              </p>
            ) : day.attendance.checkIn ? (
              <p className="mt-3 flex items-start gap-1.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                {/* Attendance stores coordinates but no address, so this is the
                    check-in itself rather than a reverse-geocoded line. */}
                <span className="font-mono tabular-nums">
                  {day.attendance.checkIn.lat.toFixed(5)}, {day.attendance.checkIn.lng.toFixed(5)}
                </span>
              </p>
            ) : null}

            <DayTimeline
              visits={visits}
              missed={missed}
              missIdsOnMap={missIdsOnMap}
              dayStart={day.attendance.checkIn ? checkIn : null}
              dayEnd={day.attendance.checkIn ? checkOut : null}
              selectedId={selectedId}
              onSelect={setPicked}
            />
          </aside>

          {/* Map — the same day as geography. */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="relative min-h-104 flex-1 sm:min-h-136">
              <DayTrailMap
                start={
                  day.attendance.checkIn
                    ? {
                        point: day.attendance.checkIn,
                        at: checkIn,
                        address: day.attendance.dayStartAddress,
                      }
                    : null
                }
                end={
                  day.attendance.checkOut
                    ? {
                        point: day.attendance.checkOut,
                        at: checkOut,
                        address: day.attendance.dayEndAddress,
                      }
                    : null
                }
                // Drawable false ⇒ no line at all: a "shortest route" with no anchor
                // would be fiction. The pins still tell the day.
                route={day.route.drawable ? day.route.points : []}
                visits={visitMarkers}
                misses={missMarkers}
                selectedId={selectedId}
                onSelect={setPicked}
                onRoadDistance={setRoadKm}
                className="absolute inset-0"
              />

              {/* Overlay rather than a sidebar tile: the distance is a property of
                  the line drawn underneath it. This is the chronological total —
                  the route's own optimised figure is smaller by the backtracking. */}
              <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-border/60 bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  Total km travelled
                </p>
                <p className="mt-0.5 font-heading text-xl font-semibold leading-none tabular-nums">
                  {roadKm ?? toKmPrecise(day.totalDistanceMetres)}
                </p>
              </div>

              {(routeNote || day.timeline.length === 0) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
                  <p className="max-w-lg rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-center text-xs text-muted-foreground shadow-sm">
                    {routeNote ??
                      (date > today
                        ? 'This day hasn’t happened yet — no punches on it.'
                        : `No calls were punched on this day — it is marked ${(
                            STATUS_LABEL[day.status] ?? day.status
                          ).toLowerCase()}.`)}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/** One provenance fact in the header. */
function Chip({
  icon: Icon,
  value,
  mono = false,
}: {
  icon: typeof Hash
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className={cn('truncate', mono && 'font-mono tabular-nums')}>{value}</span>
    </span>
  )
}

/** A label/value row in the sidebar's fact list. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-mono text-xs tabular-nums text-foreground">
        {children}
      </dd>
    </div>
  )
}
