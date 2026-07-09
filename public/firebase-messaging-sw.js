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

// Show a notification when a push arrives while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Rajani Group'
  self.registration.showNotification(title, {
    body: payload.notification?.body ?? '',
    icon: '/media/logos/logo.png',
    data: payload.data ?? {},
  })
})
