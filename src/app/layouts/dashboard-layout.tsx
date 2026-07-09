import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useForegroundPush, useRegisterPushToken } from '@/features/notifications'
import { Sidebar } from './components/sidebar'
import { Topbar } from './components/topbar'

/** Register this device for FCM push once, and toast foreground messages. */
function usePushBootstrap() {
  const register = useRegisterPushToken()
  useForegroundPush()
  useEffect(() => {
    register.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function DashboardLayout() {
  usePushBootstrap()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
