import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DAILY_REPORT_PERMISSION } from '@/features/daily-reports'
import { requirePermission } from '@/features/permissions'

/**
 * Daily Reports — the list and one rep's report share one grant,
 * `daily-report:read`, which is also the menu grant (there is no `:list` code).
 */
export const Route = createFileRoute('/_authenticated/daily-reports')({
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, DAILY_REPORT_PERMISSION),
  component: Outlet,
})
