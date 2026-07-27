import { createFileRoute, Outlet } from '@tanstack/react-router'

// No gate here: the children don't share one permission. The list screens need
// `sales-incharge:list`, create needs create/update, hierarchy needs
// `hierarchy:list` — so each child guards itself.
export const Route = createFileRoute('/_authenticated/sales-incharge')({
  component: Outlet,
})
