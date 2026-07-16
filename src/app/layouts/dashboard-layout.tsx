import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useForegroundPush } from '@/features/notifications'
import { useAppConfig } from '@/features/config'
import { asset } from '@/lib/asset'
import { Sidebar } from './components/sidebar'
import { Topbar } from './components/topbar'

/** Register this device for FCM push once, and toast foreground messages. */
function usePushBootstrap() {
  // const register = useRegisterPushToken()
  useForegroundPush()
  useEffect(() => {
    // register.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function DashboardLayout() {
  usePushBootstrap()
  // Load the media base URL once, globally, so `mediaUrl()` can resolve image
  // paths on every page inside the authenticated shell.
  useAppConfig()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-6">
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
          <footer className="mt-6 border-t pt-4">
            <div className="flex w-full flex-col items-center justify-between gap-2 text-sm font-medium text-muted-foreground sm:flex-row">
              <p className="inline-flex items-center gap-1.5">
                <span className="text-[22px] leading-none">©</span>
                <span>
                  {new Date().getFullYear()}{' '}
                  <span className="font-semibold text-foreground">Rajani Group</span>.
                  All Rights Reserved.
                </span>
              </p>
              <a
                href="https://www.xpertlab.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
              >
                <span className="text-foreground">Designed &amp; Developed By</span>
                <img
                  alt="XpertLab"
                  className="h-6 w-auto object-contain"
                  src={asset('media/logos/xpertlab-logo.webp')}
                />
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
