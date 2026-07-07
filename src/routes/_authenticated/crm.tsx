import { createFileRoute } from '@tanstack/react-router'
import { CrmPage } from '@/features/crm-sales'

export const Route = createFileRoute('/_authenticated/crm')({
  component: CrmPage,
})
