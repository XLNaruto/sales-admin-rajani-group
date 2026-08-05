import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Legacy path for what is now `/journey/plans`.
 *
 * It was named for the allocation because that was once the whole of the screen;
 * a plan now runs `draft → published → submitted → approved` and the allocation is
 * one part of it, so the path follows the subject rather than one of its fields.
 * No permission check here: the target route runs it.
 */
export const Route = createFileRoute('/_authenticated/journey/allocations')({
  beforeLoad: () => {
    throw redirect({ to: '/journey/plans', replace: true })
  },
})
