import { memo, useMemo, useState } from 'react'
import { format, getDay, parseISO } from 'date-fns'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { groupIntoWeeks } from '../lib/journey-metrics'
import {
  DAY_LABEL_COLOR,
  DAY_LABEL_HINT,
  DAY_LABEL_TEXT,
  PINNED_MARK_COLOR,
} from '../lib/day-label'
import type { MonthStripDay } from '../types'

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
/** Height of the pinned-date marker under a pillar, in px. */
const PIN_MARK = 2

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
 * The month as a row of equal-height pillars — one per calendar date, straight off
 * the row's `month_strip`.
 *
 * Colour carries the server's **label**, which is the whole point of the strip:
 * `absent` (a past date nobody accounted for) and `holiday` are different colours
 * on purpose, and `unplanned` — most of any future month — reads as empty rather
 * than as a gap to chase. Segment count carries the beats on the day.
 *
 * A thin underline marks a date the **office pinned** and the rep has not
 * overridden, so his own choices are distinguishable from the ones fixed for him.
 *
 * Geometry and colour are inline rather than Tailwind classes: these are
 * data-driven marks, so nothing here can be lost to class generation.
 *
 * Performance: the pillars are plain spans, and the whole strip shares **one**
 * tooltip whose invisible trigger is parked over the hovered column. A Radix
 * tooltip per day meant ~300 tooltip roots per table page.
 */
export const MonthStrip = memo(function MonthStrip({
  strip,
  month,
}: {
  strip: MonthStripDay[]
  /** Month being rendered, as `yyyy-MM` — supplies the weekday labels. */
  month: string
}) {
  const [hovered, setHovered] = useState<MonthStripDay | null>(null)

  const weeks = useMemo(
    () => groupIntoWeeks(strip, getDay(parseISO(`${month}-01`))),
    [strip, month],
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

  /**
   * The one figure worth announcing: dates that have passed with nothing on them.
   * Not the working-day count — the server sends that as its own column.
   */
  const absent = useMemo(
    () => strip.filter((day) => day.label === 'absent').length,
    [strip],
  )

  return (
    <span
      className="relative inline-flex items-end gap-1.5"
      style={{ height: TRACK }}
      aria-label={
        absent ? `Month strip: ${absent} unaccounted days` : 'Month strip: nothing unaccounted'
      }
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

function DayTooltip({ day, label }: { day: MonthStripDay; label?: string }) {
  return (
    <>
      <span className="block whitespace-nowrap">
        <span className="font-mono tabular-nums">{label ?? day.date}</span>
        {': '}
        {DAY_LABEL_TEXT[day.label]}
        {day.origin === 'pinned' ? ' · pinned' : ''}
      </span>
      <span className="mt-0.5 block max-w-56 text-[11px] font-normal opacity-70">
        {day.activityCode ? activityLabel(day.activityCode) : DAY_LABEL_HINT[day.label]}
        {day.beatCount > 0
          ? ` · ${day.beatCount} ${day.beatCount === 1 ? 'beat' : 'beats'}`
          : ''}
      </span>
    </>
  )
}

/** A code as a readable phrase — the strip carries no activity name. */
function activityLabel(code: string): string {
  return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * One date: a hover column holding the pillar. Deliberately plain DOM — no tooltip
 * machinery, no date formatting — and memoised, because this is the component the
 * page renders a few hundred of.
 */
const DayPillar = memo(function DayPillar({
  day,
  onHover,
}: {
  day: MonthStripDay
  onHover: (day: MonthStripDay) => void
}) {
  const color = DAY_LABEL_COLOR[day.label]
  // A day splits into one segment per beat. Days with no beats — every unplanned
  // and holiday date, and a working day whose activity takes none — stay solid.
  const segments = Math.max(1, day.beatCount)
  const pinned = day.origin === 'pinned'

  return (
    <span
      className="flex cursor-default flex-col items-center justify-end"
      style={{ width: COLUMN, height: TRACK }}
      onPointerEnter={() => onHover(day)}
    >
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SPLIT,
          width: BAR,
          // The pinned marker eats into the track rather than adding to it, so
          // every row of the table stays exactly `TRACK` tall.
          height: pinned ? TRACK - PIN_MARK - 1 : TRACK,
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
      {pinned ? (
        <span
          aria-hidden
          style={{
            marginTop: 1,
            width: BAR,
            height: PIN_MARK,
            borderRadius: 1,
            backgroundColor: PINNED_MARK_COLOR,
          }}
        />
      ) : null}
    </span>
  )
})
