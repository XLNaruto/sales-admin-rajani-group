import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { ArrowRight, Clock, Map, Route, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/common/hint'
import { encryptParams } from '@/lib/crypto'
import { cn } from '@/lib/utils'
import { timeOfDay, toKm } from '../lib/journey-format'
import { activityLabel, activityTone, isOnField } from '../lib/live-day-metrics'
import { CounterGrid } from './counter-grid'
import type { RepDaySummary } from '../types'

/**
 * Value shown where a day has nothing to report. Spelled out rather than a dash:
 * inside a card a dash reads as a glyph that failed to load, not as "no figure".
 */
const EMPTY = 'N/A'

/**
 * One day of the month, as a card.
 *
 * The card is the screen's whole vocabulary: date and weekday, what the day was
 * spent on, when it started, which beat was worked, then the counters. Off days and
 * days still ahead keep the same skeleton with the fields struck out to `—`, so
 * scanning a month never means re-learning a layout.
 *
 * Note the two different questions on it: the badge is the *activity* (at what) and
 * the card's own styling follows the *status* (did he work). A plan can say
 * Retailing on a day nobody worked, and the card has to show both.
 *
 * The whole card is the link into that day's trail — a card is a summary, and the
 * punch-by-punch timeline behind it is far too long to inline thirty-one times.
 */
export function LiveDayCard({
  day,
  /** Today as `yyyy-MM-dd` — the one day that gets a highlight. */
  today,
  /** Sales incharge the day belongs to — carried into the trail's URL token. */
  inchargeId,
}: {
  day: RepDaySummary
  today: string
  inchargeId: string
}) {
  const date = parseISO(day.date)
  const isToday = day.date === today
  const future = day.date > today
  const onField = isOnField(day)
  const flagged = day.mockSuspectedCount > 0
  const start = timeOfDay(day.dayStartAt)
  const end = timeOfDay(day.dayEndAt)

  return (
    <Link
      to="/journey/live-day"
      search={{ data: encryptParams({ id: inchargeId, date: day.date }) }}
      aria-label={`Open the trail for ${format(date, 'd MMMM yyyy')}`}
      className={cn(
        'group relative flex min-w-0 cursor-pointer flex-col rounded-xl border bg-card p-3 text-left transition-[box-shadow,border-color]',
        'shadow-[rgba(99,99,99,0.12)_0px_1px_4px_0px] hover:border-primary/40 hover:shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        onField ? 'border-border/60' : 'border-dashed border-border/70 bg-muted/20',
        isToday && 'border-primary/50 ring-1 ring-primary/25',
        flagged && 'border-destructive/40',
      )}
    >
      {/* Date row. The day number carries the emphasis — a month of cards is
          scanned by date first and everything else second. */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm tracking-tight">
            <span className="font-semibold tabular-nums text-foreground">
              {format(date, 'dd')}
            </span>{' '}
            <span className="text-foreground">{format(date, 'MMM')}</span>{' '}
            <span className="tabular-nums text-muted-foreground">{format(date, 'yyyy')}</span>
            <span className="text-muted-foreground"> · {format(date, 'EEE')}</span>
            {isToday ? <span className="text-primary"> · today</span> : null}
            {future ? <span className="text-muted-foreground"> · not yet</span> : null}
          </p>
        </div>

        {flagged ? (
          <Hint
            label={`${day.mockSuspectedCount} mock-location hit${
              day.mockSuspectedCount === 1 ? '' : 's'
            } on this day`}
          >
            <span className="grid size-5 shrink-0 cursor-default place-items-center rounded-lg text-destructive">
              <ShieldAlert className="size-4" />
            </span>
          </Hint>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={activityTone(day)}>{activityLabel(day)}</Badge>
        {day.distanceMetres > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {toKm(day.distanceMetres)} km
          </span>
        ) : null}
      </div>

      <Field label="Day start" icon={Clock}>
        {start ? (
          <>
            {/* Attendance stores coordinates but no address, so the address line is
                expected to be null — the punch times carry the day instead. */}
            <span className="block truncate">{day.dayStartAddress ?? 'Checked in'}</span>
            <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-muted-foreground">
              {start} → {end ?? EMPTY}
            </span>
          </>
        ) : (
          EMPTY
        )}
      </Field>

      <Field label="Beat" icon={Route}>
        {day.beatName ? (
          <Hint label={day.beatName}>
            <span className="block truncate">{day.beatName}</span>
          </Hint>
        ) : (
          EMPTY
        )}
      </Field>

      {/* Pushed to the bottom so cards still line their numbers up across a row. */}
      <CounterGrid counters={day.counters} className="mt-2.5 shrink-0" />

      <span className="mt-2.5 flex shrink-0 items-center justify-between gap-2 border-t border-border/50 pt-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground transition-colors group-hover:text-primary">
        <span className="inline-flex items-center gap-1">
          <Map className="size-3" />
          View trail on map
        </span>
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/** One labelled fact on the card — label above, value below, always present. */
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: typeof Clock
  children: React.ReactNode
}) {
  return (
    <div className="mt-2 min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <div className="mt-0.5 min-w-0 text-[13px] leading-snug text-foreground">{children}</div>
    </div>
  )
}
