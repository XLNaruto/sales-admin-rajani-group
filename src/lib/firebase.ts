import { getApp, getApps, initializeApp } from 'firebase/app'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'
import { env, isFirebaseConfigured } from '@/config/env'

/**
 * Single Firebase app for the whole client. Firebase powers Cloud Messaging
 * (FCM) push notifications only — sign-in is a username/password exchange
 * against our own REST API (see `features/auth/api`).
 */
const firebaseConfig = env.VITE_FIREBASE_CONFIG

// Guard against Vite HMR / double-init re-registering the default app.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

/**
 * Messaging is only available in secure contexts with Service Worker + Push
 * support. Returns `null` where unsupported (e.g. some in-app browsers) so
 * callers can no-op gracefully. Memoised — `isSupported()` runs once.
 */
let messagingPromise: Promise<Messaging | null> | null = null
export function getMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null)
  if (!messagingPromise) {
    messagingPromise = isSupported().then((ok) =>
      ok ? getMessaging(firebaseApp) : null,
    )
  }
  return messagingPromise
}
