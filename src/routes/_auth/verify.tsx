import {
  createFileRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { VerifyOtpPage } from '@/features/auth'

// Carry the mobile number through router history state — never in the URL.
declare module '@tanstack/react-router' {
  interface HistoryState {
    mobile?: string
  }
}

export const Route = createFileRoute('/_auth/verify')({
  beforeLoad: ({ location }) => {
    // No number in the flow (e.g. direct visit / refresh) → mobile step.
    if (!location.state.mobile) throw redirect({ to: '/login' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  const mobile = useLocation({ select: (l) => l.state.mobile ?? '' })
  return <VerifyOtpPage mobile={mobile} />
}
