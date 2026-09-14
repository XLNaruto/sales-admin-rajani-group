import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { env } from '@/config/env'
import { queryKeys } from '@/lib/query-keys'
import { onForegroundMessage, requestPushToken } from '../lib/messaging'
import { showPushToast } from '../components/push-toast'
import { notificationTarget } from '../lib/notification-route'
import type { NotificationTone } from '../types'
import { saveFcmToken } from './fcm-api'

/** Tones the card knows how to paint; anything else is treated as `info`. */
const TONES: readonly NotificationTone[] = ['info', 'success', 'warning', 'alert']

function toneOf(value: string | undefined): NotificationTone {
  return TONES.includes(value as NotificationTone) ? (value as NotificationTone) : 'info'
}

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
 *
 * Three things happen on arrival, and each earns its place:
 *
 * **Dedupe.** Push delivery is at-least-once — the same notification can arrive
 * twice — so a toast is shown once per notification id (falling back to the
 * entity pair when the payload carries no id).
 *
 * **The badge.** A push IS the news that the count moved; re-reading it now
 * beats waiting up to 60s for the next poll.
 *
 * **The deep link.** The toast opens the request itself, through the SAME
 * routing table the dropdown uses. A toast that only says a request arrived
 * makes the admin go and find it.
 */
export function useForegroundPush() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  // Ids already toasted this session. A Set, not state: it must not re-render
  // anything, and it only ever grows within a page lifetime.
  const seen = useRef(new Set<string>())

  useEffect(() => {
    let dispose: (() => void) | undefined
    onForegroundMessage((payload) => {
      const data = (payload.data ?? {}) as Record<string, string | undefined>
      const entityType = data.entity_type ?? null
      const entityId = data.entity_id ? Number(data.entity_id) : null
      const notificationId = data.id ?? data.notification_id

      // The id when the payload has one; otherwise what the push points at —
      // there is at most one inbox row per (request, outcome), so the pair is a
      // sound stand-in.
      const key = notificationId ?? `${entityType ?? 'broadcast'}:${entityId ?? ''}`
      if (seen.current.has(key)) return
      seen.current.add(key)

      void qc.invalidateQueries({ queryKey: queryKeys.notifications.inbox.all })

      // A data-only push carries its copy in `data`; a notification push in
      // `notification`. Take either, so neither shape arrives silently.
      const title = payload.notification?.title ?? data.title
      const body = payload.notification?.body ?? data.body
      if (!title && !body) return

      // `n` rides inside the encrypted token: acting on a push IS reading it,
      // so the screen it lands on marks it read.
      const target = notificationTarget(
        entityType,
        entityId,
        notificationId ? Number(notificationId) : undefined,
      )
      showPushToast({
        title: title ?? 'Notification',
        body,
        tone: toneOf(data.type),
        entityType,
        // Same lookup table as the dropdown — see `lib/notification-route.ts`.
        onOpen: target ? () => void navigate({ href: target }) : undefined,
      })
    }).then((fn) => {
      dispose = fn
    })
    return () => dispose?.()
  }, [qc, navigate])
}
