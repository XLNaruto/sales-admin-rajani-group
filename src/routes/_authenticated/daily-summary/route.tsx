import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DAILY_SUMMARY_PERMISSION } from '@/features/daily-summary'
import { requirePermission } from '@/features/permissions'

/**
 * Daily Summary — the list and a rep's Sales Details share one grant,
 * `daily-summary:read`, which is also the menu grant (there is no `:list` code).
 * Opening a rep's day on the Live Map additionally needs `live-day:read`.
 */
export const Route = createFileRoute('/_authenticated/daily-summary')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, DAILY_SUMMARY_PERMISSION),
  component: Outlet,
})
