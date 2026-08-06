import { createFileRoute } from '@tanstack/react-router'
import { OutletTypesPage } from '@/features/master-management'

export const Route = createFileRoute('/_authenticated/masters/outlet-types')({
  // No `beforeLoad` guard: the API grants `outlet-type:create|update|delete`
  // but no `:list` key — reading the master is open to any authenticated user,
  // so guarding the route (and hiding the sidebar item) would lock out the
  // read-only users the backend deliberately admits. The write actions are
  // gated inside the page via `useCan()`, and a 403 from the list still falls
  // through to the Forbidden screen. If a `outlet-type:list` key ever ships,
  // add `requirePermission(context.queryClient, 'outlet-type:list')` here and
  // the matching `permission` on the sidebar item in config/navigation.ts.
  component: OutletTypesPage,
})
