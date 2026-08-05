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
 * - **`missed` and `holiday` must not collapse into one "off" state.** A sales incharge who
 *   skipped six days must not render identically to one who had six holidays.
 * - **`unscheduled` is only a problem from submission onward.** It is the normal
 *   state of a draft and of a freshly published month, so it reads as empty and
 *   nothing badges it — see `unscheduledIsAProblem` in `plan-status`.
 */
import type { DayLabel } from '../types'

export const DAY_LABEL_COLOR: Record<DayLabel, string> = {
  /** Scheduled and a visit landed on it — the goal, so the brand accent. */
  worked: 'var(--primary)',
  /** Scheduled, still ahead. "Outlined": the same hue, thinned. */
  planned: 'color-mix(in oklab, var(--primary) 45%, transparent)',
  /** Scheduled with a non-working activity — a weekly off, a holiday, leave. */
  holiday: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)',
  /** Scheduled, PAST, and nothing was ever recorded. The one real warning. */
  missed: 'var(--warning)',
  /** No day row at all. Empty — and normal until the month is submitted. */
  unscheduled: 'color-mix(in oklab, var(--muted-foreground) 14%, transparent)',
}

export const DAY_LABEL_TEXT: Record<DayLabel, string> = {
  worked: 'Worked',
  planned: 'Planned',
  holiday: 'Holiday',
  missed: 'Missed',
  unscheduled: 'Not scheduled',
}

/**
 * One-line explanation per label — the tooltip's second line and the legend's
 * hover text. Written for an admin who has never seen the strip before.
 */
export const DAY_LABEL_HINT: Record<DayLabel, string> = {
  worked: 'Scheduled, and a visit landed on it.',
  planned: 'Scheduled, still ahead — or today, and not worked yet.',
  holiday: 'Scheduled to an activity that is not a working day.',
  missed: 'Scheduled, the date has passed, and nothing was ever recorded.',
  unscheduled:
    'No day row. Normal on a draft or a freshly published month — the sales incharge dates it.',
}

/**
 * Legend rows, in the order they read best: the two states that mean work, the
 * expected empty, then the two exceptions.
 */
export const DAY_LABEL_LEGEND: {
  label: DayLabel
  color: string
  text: string
}[] = (['worked', 'planned', 'unscheduled', 'holiday', 'missed'] as DayLabel[]).map(
  (label) => ({
    label,
    color: DAY_LABEL_COLOR[label],
    text: DAY_LABEL_TEXT[label],
  }),
)

/**
 * A date the **admin corrected** after the sales incharge submitted the month — marked apart
 * from the sales incharge's own rows, because that difference is the whole point of `origin`.
 */
export const ADMIN_MARK_COLOR = 'var(--info)'
