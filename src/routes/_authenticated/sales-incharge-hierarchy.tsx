import { createFileRoute } from '@tanstack/react-router'
import {
  SalesInchargeHierarchyPage,
  salesInchargeHierarchyQueryOptions,
} from '@/features/sales-incharge'

export const Route = createFileRoute('/_authenticated/sales-incharge-hierarchy')({
  // Prefetch the reporting tree into the query cache. With `defaultPreload:
  // 'intent'` the loader runs on link hover, so the hierarchy is ready before
  // the page mounts; `ensureQueryData` reuses a fresh entry if one exists.
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(salesInchargeHierarchyQueryOptions()),
  component: SalesInchargeHierarchyPage,
})
