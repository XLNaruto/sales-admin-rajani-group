import { createFileRoute } from '@tanstack/react-router'
import { PaymentConditionsPage } from '@/features/master-management'

export const Route = createFileRoute('/_authenticated/masters/payment-conditions')({
  // No `beforeLoad` guard — same reason as the outlet-type master: the API
  // grants `payment-condition:create|update|delete` but no `:list` key, so
  // reading is open to any authenticated user. The write actions are gated
  // inside the page via `useCan()`, and a 403 from the list still renders the
  // Forbidden screen.
  component: PaymentConditionsPage,
})
