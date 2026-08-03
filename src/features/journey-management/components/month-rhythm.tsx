import { memo, useMemo, useState } from 'react'
import { format, getDay, parseISO } from 'date-fns'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { dayKindOf, isBeatlessCode } from '../lib/activities'
import { groupIntoWeeks } from '../lib/journey-metrics'
import {
  DAY_KIND_COLOR,
  DAY_KIND_LABEL,
  EMPTY_DAY_COLOR,
  FLAGGED_COLOR,
} from '../lib/day-kind'
import type { RhythmDay } from '../types'

/** Pillar height in px — every day is the same height; only the split varies. */
const TRACK = 24
/** Pillar width in px. */
const BAR = 5
/** Hover column width in px (pillar + its breathing room). */
const COLUMN = 7
/** Hairline between beat segments, in px. */
const SPLIT = 1
/** Gap between week groups in px — must match the `gap-1.5` below. */
const WEEK_GAP = 6

/**
 * Weekday labels ("18 Sat") for a month, built once and shared by every row.
 *
 * There are ~31 of these per row and dozens of rows per page, so formatting them
 * per pillar was the single most expensive thing the table did on re-render.
 * Keyed by `yyyy-MM`, so a month change is one build, not one per plan.
 */
const labelCache = new Map<string, string[]>()

function dayLabels(month: string): string[] {
  const cached = labelCache.get(month)
  if (cached) return cached
  const start = parseISO(`${month}-01`)
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const labels = Array.from({ length: days }, (_, i) =>
    format(new Date(start.getFullYear(), start.getMonth(), i + 1), 'd EEE'),
  )
  labelCache.set(month, labels)
  return labels
}

/**
 * The month as a row of equal-height pillars — one per calendar day, straight off
 * the row's `month_rhythm`.
 *
 * Height is deliberately constant: the day's *kind* is carried by colour (working
 * / weekly off / holiday / leave) and its beat count by how many segments the
 * pillar is split into. `flagged` is its own overlay — a flagged day is not an
 * activity value, so it recolours a pillar rather than replacing its kind.
 *
 * Geometry and colour are inline rather than Tailwind classes: these are
 * data-driven marks, so nothing here can be lost to class generation.
 *
 * Performance: the pillars are plain spans, and the whole strip shares **one**
 * tooltip whose invisible trigger is parked over the hovered column. A Radix
 * tooltip per day meant ~300 tooltip roots per table page.
 */
export const MonthRhythm = memo(function MonthRhythm({
  rhythm,
  month,
}: {
  rhythm: RhythmDay[]
  /** Month being rendered, as `yyyy-MM` — supplies the weekday labels. */
  month: string
}) {
  const [hovered, setHovered] = useState<RhythmDay | null>(null)

  const weeks = useMemo(
    () => groupIntoWeeks(rhythm, getDay(parseISO(`${month}-01`))),
    [rhythm, month],
  )
  const labels = useMemo(() => dayLabels(month), [month])

  /** Left offset of each day's hover column, by day of month. */
  const offsets = useMemo(() => {
    const map = new Map<number, number>()
    let x = 0
    for (const week of weeks) {
      for (const day of week) {
        map.set(day.day, x)
        x += COLUMN
      }
      x += WEEK_GAP
    }
    return map
  }, [weeks])

  const workingDays = useMemo(
    () => rhythm.filter((day) => dayKindOf(day.activityCode) === 'working').length,
    [rhythm],
  )

  return (
    <span
      className="relative inline-flex items-end gap-1.5"
      style={{ height: TRACK }}
      aria-label={`Month rhythm: ${workingDays} working days`}
      onPointerLeave={() => setHovered(null)}
    >
      {weeks.map((week, w) => (
        <span key={w} className="inline-flex items-end">
          {week.map((day) => (
            <DayPillar key={day.date} day={day} onHover={setHovered} />
          ))}
        </span>
      ))}

      {/* One tooltip for the strip: the trigger is an invisible box moved over
          whichever column the pointer is on, so positioning still tracks the
          individual day. Keyed on the day so it re-anchors on a move. */}
      <Tooltip key={hovered?.date ?? 'none'} open={hovered !== null}>
        <TooltipTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0"
            style={{
              left: hovered ? (offsets.get(hovered.day) ?? 0) : 0,
              width: COLUMN,
              height: TRACK,
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {hovered ? <DayTooltip day={hovered} label={labels[hovered.day - 1]} /> : null}
        </TooltipContent>
      </Tooltip>
    </span>
  )
})

function DayTooltip({ day, label }: { day: RhythmDay; label?: string }) {
  const kind = dayKindOf(day.activityCode)
  return (
    <>
      <span className="block whitespace-nowrap">
        <span className="font-mono tabular-nums">{label ?? day.date}</span>
        {': '}
        {kind === 'working' ? activityLabel(day.activityCode) : DAY_KIND_LABEL[kind]}
      </span>
      {kind === 'working' ? (
        <span className="mt-0.5 block text-[11px] font-normal opacity-70">
          {day.beatCount === 0 && !isBeatlessCode(day.activityCode)
            ? 'No beats planned'
            : `${day.beatCount} ${day.beatCount === 1 ? 'beat' : 'beats'}`}
          {day.flagged ? ' · flagged' : ''}
        </span>
      ) : null}
    </>
  )
}

/** A code as a readable phrase — the row carries no activity name. */
function activityLabel(code: string | null): string {
  if (!code) return 'No activity'
  return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * One day: a hover column holding the pillar. Deliberately plain DOM — no tooltip
 * machinery, no date formatting — and memoised, because this is the component the
 * page renders a few hundred of.
 */
const DayPillar = memo(function DayPillar({
  day,
  onHover,
}: {
  day: RhythmDay
  onHover: (day: RhythmDay) => void
}) {
  const kind = dayKindOf(day.activityCode)
  const working = kind === 'working'
  // A working day with nothing on it is a gap, not a plan — so it gets its own
  // washed-out tint instead of reading as solid as a fully-loaded day. Activities
  // that never take beats (a meeting, a depot visit) are not gaps.
  const empty = working && day.beatCount === 0 && !isBeatlessCode(day.activityCode)
  const color = !working
    ? DAY_KIND_COLOR[kind]
    : day.flagged
      ? FLAGGED_COLOR
      : empty
        ? EMPTY_DAY_COLOR
        : DAY_KIND_COLOR.working
  // A worked day splits into one segment per beat; other kinds stay solid.
  const segments = working ? Math.max(1, day.beatCount) : 1

  return (
    <span
      className="flex cursor-default items-end justify-center"
      style={{ width: COLUMN, height: TRACK }}
      onPointerEnter={() => onHover(day)}
    >
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SPLIT,
          width: BAR,
          height: TRACK,
          flexShrink: 0,
        }}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            style={{
              flex: '1 1 0',
              minHeight: 2,
              borderRadius: 1,
              backgroundColor: color,
            }}
          />
        ))}
      </span>
    </span>
  )
})
