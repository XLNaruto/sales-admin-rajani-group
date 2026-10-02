/**
 * Permission codes behind the Daily Summary screen.
 *
 * Like `live-day:read`, the `:read` code IS the menu grant — there is no
 * `daily-summary:list`. Opening a row needs the Live Map's own key on top, so a
 * user can read the report without being able to drill into a day.
 */
export const DAILY_SUMMARY_PERMISSION = 'daily-summary:read'

/** Gates the row → Live Day drill-down. */
export const LIVE_DAY_PERMISSION = 'live-day:read'
