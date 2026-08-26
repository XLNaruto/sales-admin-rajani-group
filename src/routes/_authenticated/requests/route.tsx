import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/requests')({
  // No guard here: the two queues carry different permission keys, so each
  // child route runs its own.
  component: Outlet,
})
