import { createFileRoute } from '@tanstack/react-router'
import { PaymentConditionsPage } from '@/features/master-management'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/masters/payment-conditions')({
  // Reading the master needs `payment-condition:list`; the write actions
  // (`payment-condition:create|update|delete`) are gated inside the page via `useCan()`.
  beforeLoad: ({ context }) =>
    requirePermission(context.queryClient, 'payment-condition:list'),
  component: PaymentConditionsPage,
})
