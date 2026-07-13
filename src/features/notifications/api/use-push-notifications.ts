import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { onForegroundMessage, requestPushToken } from '../lib/messaging'

/**
 * Register this device for FCM push: request permission, obtain the token, and
 * (when a real backend is wired) hand it to the server. Safe to call once after
 * sign-in — no-ops where notifications are unsupported or denied.
 */
export function useRegisterPushToken() {
  return useMutation<string | null, Error, void>({
    mutationFn: async () => {
      const token = await requestPushToken()
      if (token) {
        // TODO: confirm the real device-registration endpoint & payload.
        await apiClient.post('/sales-incharge-admin/notifications/devices', { token })
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
