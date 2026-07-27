import { createFileRoute } from '@tanstack/react-router'
import { BeatsPage } from '@/features/beat-creation'
import { requirePermission } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/beats/')({
  // Block direct URL access when the user lacks the permission — hiding the
  // sidebar link alone doesn't stop someone navigating to /beats.
  beforeLoad: ({ context }) => requirePermission(context.queryClient, 'beat:list'),
  component: BeatsPage,
})
