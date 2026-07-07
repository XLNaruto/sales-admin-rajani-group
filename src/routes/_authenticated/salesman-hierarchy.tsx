import { createFileRoute } from '@tanstack/react-router'
import { SalesmanHierarchyPage } from '@/features/team-management'

export const Route = createFileRoute('/_authenticated/salesman-hierarchy')({
  component: SalesmanHierarchyPage,
})
