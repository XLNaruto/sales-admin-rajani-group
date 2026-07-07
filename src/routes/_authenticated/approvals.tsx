import { createFileRoute } from '@tanstack/react-router'
import { ApprovalsPage } from '@/features/approvals'

export const Route = createFileRoute('/_authenticated/approvals')({
  component: ApprovalsPage,
})
