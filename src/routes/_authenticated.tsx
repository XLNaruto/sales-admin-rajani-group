import { createFileRoute, redirect } from '@tanstack/react-router'
import { DashboardLayout } from '@/app/layouts/dashboard-layout'
import { useAuthStore } from '@/stores/auth-store'

/** Pathless layout guarding every in-app route; unauthenticated → /login. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayout,
})
