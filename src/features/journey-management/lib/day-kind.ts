/**
 * The rhythm strip's colour language, in one place so the strip and its legend
 * can never disagree.
 *
 * Values are design-token references applied as inline `background-color`, not
 * Tailwind classes: the strip paints ~31 data-driven marks per row, and a token
 * var resolves the same way in light and dark themes.
 */
import type { DayKind } from '../types'

export const DAY_KIND_COLOR: Record<DayKind, string> = {
  /** Worked day — the brand accent, since this is the norm. */
  working: 'var(--primary)',
  /** Weekly off — recedes; expected, not noteworthy. */
  'weekly-off': 'color-mix(in oklab, var(--muted-foreground) 28%, transparent)',
  /** Public / festival holiday — calendar-driven, so a cool neutral. */
  holiday: 'var(--info)',
  /** Approved leave — amber, because it eats planned coverage. */
  leave: 'var(--warning)',
}

/** A working day the solver flagged — overrides the working colour. */
export const FLAGGED_COLOR = 'var(--destructive)'

/**
 * A working day that should carry beats but has none — an unfilled slot. Stays in
 * the working colour's family, washed out, so "planned but empty" reads as a gap
 * in the month rather than as a different kind of day.
 */
export const EMPTY_DAY_COLOR = 'color-mix(in oklab, var(--primary) 24%, transparent)'

export const DAY_KIND_LABEL: Record<DayKind, string> = {
  working: 'Working day',
  'weekly-off': 'Weekly off',
  holiday: 'Public holiday',
  leave: 'Leave',
}

/** Legend rows, in the order they read best (common → exceptional). */
export const DAY_KIND_LEGEND: { color: string; label: string }[] = [
  { color: DAY_KIND_COLOR.working, label: DAY_KIND_LABEL.working },
  { color: EMPTY_DAY_COLOR, label: 'No beats planned' },
  { color: FLAGGED_COLOR, label: 'Flagged day' },
  { color: DAY_KIND_COLOR.holiday, label: DAY_KIND_LABEL.holiday },
  { color: DAY_KIND_COLOR.leave, label: DAY_KIND_LABEL.leave },
  { color: DAY_KIND_COLOR['weekly-off'], label: DAY_KIND_LABEL['weekly-off'] },
]
