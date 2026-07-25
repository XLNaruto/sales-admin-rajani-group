import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { env } from '@/config/env'
import { onForegroundMessage, requestPushToken } from '../lib/messaging'
import { saveFcmToken } from './fcm-api'

/**
 * Register this device for FCM push: request permission, obtain the token, and
 * (when a real backend is wired) hand it to the server. Safe to call once after
 * sign-in — no-ops where notifications are unsupported or denied.
 *
 * Called from: `usePushBootstrap()` in `src/app/layouts/dashboard-layout.tsx`,
 * which fires `register.mutate()` once on mount of the authenticated shell — so
 * the POST below runs a single time per session after the user reaches the
 * dashboard (and only when `VITE_USE_MOCK_API` is false).
 */
export function useRegisterPushToken() {
  return useMutation<string | null, Error, void>({
    mutationFn: async () => {
      const token = await requestPushToken()
      if (token && !env.VITE_USE_MOCK_API) {
        // This is a browser portal, so the token is always a web registration.
        await saveFcmToken({ token, platform: 'web' })
      }
      return token
    },
  })
}

/**
 * Toast foreground pushes while the app is open (the SW only fires in the
 * background). Wire this once high in the authenticated tree.
 */
export function useForegroundPush() {
  useEffect(() => {
    let dispose: (() => void) | undefined
    onForegroundMessage((payload) => {
      const { title, body } = payload.notification ?? {}
      if (title || body) toast(title ?? 'Notification', { description: body })
    }).then((fn) => {
      dispose = fn
    })
    return () => dispose?.()
  }, [])
}
