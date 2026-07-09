import { createFileRoute, redirect } from '@tanstack/react-router'
import { VerifyOtpPage } from '@/features/auth'
import { useOtpSessionStore } from '@/stores/otp-session-store'

export const Route = createFileRoute('/_auth/verify')({
  beforeLoad: () => {
    // No pending OTP session (direct visit / refresh into a dead flow) → mobile step.
    if (!useOtpSessionStore.getState().session) {
      throw redirect({ to: '/login' })
    }
  },
  component: VerifyOtpPage,
})
