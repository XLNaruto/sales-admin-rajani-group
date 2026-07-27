import { createFileRoute, Outlet } from '@tanstack/react-router'

// No gate here: the children don't share one permission. The list screen wants
// `retailer-master:list`, create wants create/update — so each child guards
// itself (see the sales-incharge folder for the same arrangement).
export const Route = createFileRoute('/_authenticated/retailers')({
  component: Outlet,
})
