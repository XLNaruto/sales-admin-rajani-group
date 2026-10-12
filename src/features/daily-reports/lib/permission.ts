/**
 * Permission code behind the Daily Reports screens — list and detail alike.
 *
 * Separate from `daily-summary:read`, and like it the `:read` code IS the menu
 * grant. Not in the default set: a role has to grant it ("Daily Reports → View").
 */
export const DAILY_REPORT_PERMISSION = 'daily-report:read'
