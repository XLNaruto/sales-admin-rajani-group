export { NotificationsPage } from './pages/notifications-page'
export { useRegisterPushToken, useForegroundPush } from './api/use-push-notifications'
/** The bell — mounted in the topbar. Ungated: no permission hides it. */
export { NotificationBell } from './components/notification-bell'
/** The card a foreground push renders as — matched to the bell's rows. */
export { PushToast, showPushToast } from './components/push-toast'
export {
  useInbox,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './api/use-inbox'
/**
 * The one `entity_type` → route table. Both the dropdown and the push handler
 * go through it; nothing else should build a request URL by hand.
 */
export {
  NOTIFICATION_ROUTE,
  notificationRoute,
  notificationTarget,
} from './lib/notification-route'
export { useNotificationClick } from './hooks/use-notification-click'
export { useMarkReadOnArrival } from './hooks/use-mark-read-on-arrival'
export { useNotificationCompanyHint } from './hooks/use-notification-company-hint'
export type {
  InboxNotification,
  InboxParams,
  InboxResult,
  NotificationEntityType,
  NotificationMetadata,
  NotificationPriority,
  NotificationTone,
} from './types'
