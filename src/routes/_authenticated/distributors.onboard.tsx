import { createFileRoute } from '@tanstack/react-router'
import { OnboardingWizard } from '@/features/distributor-management'

export const Route = createFileRoute('/_authenticated/distributors/onboard')({
  component: OnboardingWizard,
})
