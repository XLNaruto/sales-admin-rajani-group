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

// Show a notification when a push arrives while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[fcm-sw] onBackgroundMessage payload:', payload)
  const title = payload.notification?.title ?? 'Rajani Group'
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/media/logos/logo.png',
    data: payload.data ?? {},
  }
  console.log('[fcm-sw] showing notification:', title, options)
  self.registration
    .showNotification(title, options)
    .then(() => console.log('[fcm-sw] notification shown'))
    .catch((err) => console.error('[fcm-sw] showNotification failed:', err))
})
