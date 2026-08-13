import { createFileRoute } from '@tanstack/react-router'
import { RetailerAnalyticsPage } from '@/features/retailer-analytics'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/retailers/analytics')({
  // Reporting over the retailer master — gated by the same list permission, so
  // it can't be reached by URL without access to the underlying data.
  beforeLoad: ({ context }) => requirePermission(context.queryClient, 'retailer-master:list'),
  component: RetailerAnalyticsPage,
})
