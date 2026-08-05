import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Legacy path for what is now `/journey/plans`.
 *
 * Approving is back — a plan runs `draft → published → submitted → approved` — but
 * the screen is not a queue for the last of those four states, so it is not named
 * after it. Points at the current path directly rather than hopping through
 * `/journey/allocations`, which is itself only a redirect. No permission check
 * here: the target route runs it.
 */
export const Route = createFileRoute('/_authenticated/journey/approvals')({
  beforeLoad: () => {
    throw redirect({ to: '/journey/plans', replace: true })
  },
})
