import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Legacy path for what is now `/journey/allocations`.
 *
 * The screen stopped approving anything — an allocation is live the moment it
 * exists — so it was renamed. This route exists only so bookmarks and any links
 * already out in the wild land on the new one. No permission check here: the
 * target route runs it.
 */
export const Route = createFileRoute('/_authenticated/journey/approvals')({
  beforeLoad: () => {
    throw redirect({ to: '/journey/allocations', replace: true })
  },
})
