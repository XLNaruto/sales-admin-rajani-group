import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthLayout } from '@/app/layouts/auth-layout'
import { useAuthStore } from '@/stores/auth-store'

/** Pathless layout for unauthenticated screens; already signed in → /dashboard. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AuthLayout,
})
