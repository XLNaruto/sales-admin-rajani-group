/* Firebase Cloud Messaging background handler.
 * Service workers can't use ESM/env, so the (public) web config is inlined and
 * the compat SDK is loaded from gstatic. Keep the version in sync with the
 * `firebase` package in package.json. */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyA8G5sKfglvmOlzXMMiSyNVlPRCEHo_5ZQ',
  authDomain: 'rajani-group-dms.firebaseapp.com',
  projectId: 'rajani-group-dms',
  storageBucket: 'rajani-group-dms.firebasestorage.app',
  messagingSenderId: '574730718010',
  appId: '1:574730718010:web:4492cb954eef84754d9e03',
})

const messaging = firebase.messaging()

// Raw push receipt — fires for every push that reaches this SW, even if the
// FCM handler below never runs. Use this to confirm the push arrives at all.
self.addEventListener('push', (event) => {
  let raw
  try {
    raw = event.data?.json()
  } catch {
    raw = event.data?.text()
  }
  console.log('[fcm-sw] push event received:', raw)
})

/* Where this build is served from — `scope` already carries VITE_APP_BASE_URL,
 * so icons and deep links resolve under a sub-path deployment too. */
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')

// Show a notification when a push arrives while the app is in the background.
// The copy may come as `notification` (display push) or `data` (data-only) —
// take either, so neither shape arrives silently.
messaging.onBackgroundMessage((payload) => {
  console.log('[fcm-sw] onBackgroundMessage payload:', payload)
  const data = payload.data ?? {}
  const title = payload.notification?.title ?? data.title ?? 'Rajani Group'
  const options = {
    body: payload.notification?.body ?? data.body ?? '',
    // The square mark reads at notification size; the wordmark does not.
    icon: `${BASE_PATH}/media/logos/logo-only.png`,
    badge: `${BASE_PATH}/media/logos/logo-only.png`,
    // Push delivery is at-least-once: tagging by notification id collapses a
    // redelivery onto the same OS notification instead of stacking a duplicate.
    tag: data.id ? `notification-${data.id}` : undefined,
    renotify: Boolean(data.id),
    // `high`/`urgent` is worth interrupting for; the rest can sit quietly.
    requireInteraction: data.priority === 'urgent',
    data,
  }
  console.log('[fcm-sw] showing notification:', title, options)
  self.registration
    .showNotification(title, options)
    .then(() => console.log('[fcm-sw] notification shown'))
    .catch((err) => console.error('[fcm-sw] showNotification failed:', err))
})

/* The `entity_type` → route table, for a click on a BACKGROUND notification.
 * A service worker can't import modules, so this is a hand-kept copy of
 * `src/features/notifications/lib/notification-route.ts` — change them
 * together. An entity type this copy doesn't know about simply opens the app,
 * which is the right failure: new request kinds are coming. */
const NOTIFICATION_ROUTE = {
  beat_change: (id) => `/requests/beat-changes/${id}`,
  day_change: (id) => `/requests/day-changes/${id}`,
  profile_edit_request: (id) => `/requests/profile-edits/${id}`,
}

function targetUrl(data) {
  const build = NOTIFICATION_ROUTE[data.entity_type]
  if (!build || !data.entity_id) return `${BASE_PATH}/dashboard`
  // `?n=` names the notification so the page it lands on marks it read —
  // clicking a push IS reading it.
  const query = data.id ? `?n=${data.id}` : ''
  return `${BASE_PATH}${build(data.entity_id)}${query}`
}

/* Open the request the notification points at — focusing the tab that is
 * already open rather than piling up windows. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = targetUrl(event.notification.data ?? {})

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (new URL(client.url).origin !== self.location.origin) continue
          if ('navigate' in client) return client.navigate(url).then((c) => c?.focus())
          return client.focus()
        }
        return self.clients.openWindow(url)
      }),
  )
})
