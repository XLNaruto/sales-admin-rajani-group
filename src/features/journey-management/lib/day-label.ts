/**
 * The month strip's colour language, in one place so the strip and its legend can
 * never disagree.
 *
 * Values are design-token references applied as inline `background-color`, not
 * Tailwind classes: the strip paints ~31 data-driven marks per row, and a token
 * var resolves the same way in light and dark themes.
 *
 * The five labels are the server's, derived at read time. Two rules they exist to
 * enforce:
 *
 * - **`absent` and `holiday` must not collapse into one "off" state.** A rep who
 *   skipped six days must not render identically to one who had six holidays.
 * - **`unplanned` on a future date is not a problem.** Most of a future month is
 *   unplanned, because the rep chooses each morning — so it reads as empty, and
 *   nothing badges it.
 */
import type { DayLabel } from '../types'

export const DAY_LABEL_COLOR: Record<DayLabel, string> = {
  /** A past date he chose an activity for — the norm, so the brand accent. */
  worked: 'var(--primary)',
  /** Today or later with an activity already set. "Outlined": the same hue, thinned. */
  planned: 'color-mix(in oklab, var(--primary) 45%, transparent)',
  /** A non-working day, pinned by the office or marked by the rep. Recedes. */
  holiday: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)',
  /** A PAST date with no entry at all. Nobody said anything and nobody worked. */
  absent: 'var(--warning)',
  /** Today or later, nothing chosen yet. Empty — not a gap to be filled. */
  unplanned: 'color-mix(in oklab, var(--muted-foreground) 14%, transparent)',
}

export const DAY_LABEL_TEXT: Record<DayLabel, string> = {
  worked: 'Worked',
  planned: 'Planned',
  holiday: 'Holiday',
  absent: 'Absent',
  unplanned: 'Not planned yet',
}

/**
 * One-line explanation per label — the tooltip's second line and the legend's
 * hover text. Written for an admin who has never seen the strip before.
 */
export const DAY_LABEL_HINT: Record<DayLabel, string> = {
  worked: 'He picked an activity for this date and it has passed.',
  planned: 'Activity already set — pinned by the office, or chosen this morning.',
  holiday: 'The day’s activity is not a working day.',
  absent: 'This date has passed with no entry at all — nobody said anything.',
  unplanned: 'Still to come; he chooses on the morning. Normal, not a gap.',
}

/**
 * Legend rows, in the order they read best: the two states that mean work, the
 * expected empty, then the two exceptions.
 */
export const DAY_LABEL_LEGEND: { label: DayLabel; color: string; text: string }[] = (
  ['worked', 'planned', 'unplanned', 'holiday', 'absent'] as DayLabel[]
).map((label) => ({
  label,
  color: DAY_LABEL_COLOR[label],
  text: DAY_LABEL_TEXT[label],
}))

/** A pinned date the rep has not overridden — marked apart from his own choices. */
export const PINNED_MARK_COLOR = 'var(--info)'
