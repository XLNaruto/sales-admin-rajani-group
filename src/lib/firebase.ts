import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'
import { env, isFirebaseConfigured } from '@/config/env'

/**
 * Single Firebase app for the whole client. Firebase powers two things here:
 *  - Phone Authentication (SMS OTP) on the sign-in screens, and
 *  - Cloud Messaging (FCM) push notifications.
 * The backend session (access/refresh tokens) is issued by our own REST API
 * after the Firebase ID token is exchanged — see `features/auth/api`.
 */
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Guard against Vite HMR / double-init re-registering the default app.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(firebaseApp)
// Send SMS / reCAPTCHA UI in the device language.
auth.useDeviceLanguage()

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
