import { getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { env } from '@/config/env'
import { getMessagingInstance } from '@/lib/firebase'

/**
 * FCM push, kept behind this service so the SDK never leaks into components.
 * `requestPushToken` asks for notification permission, registers the SW, and
 * returns the device token (or `null` when unsupported / denied). The caller
 * decides what to do with the token (e.g. POST it to the backend).
 */
const SW_URL = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`

export async function requestPushToken(): Promise<string | null> {
  const messaging = await getMessagingInstance()
  if (!messaging) return null

  // Requires a user gesture on some browsers; harmless if already decided.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register(SW_URL)
  const token = await getToken(messaging, {
    vapidKey: env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  return token || null
}

/**
 * Subscribe to messages that arrive while the app is in the foreground.
 * Returns an unsubscribe function (a no-op where messaging is unsupported).
 */
export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, handler)
}
