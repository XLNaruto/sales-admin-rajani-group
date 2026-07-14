import { useState } from 'react'
import { useGreetings, useNotifications, useSendNotification } from '../api/use-notifications'

const TODAY = '2026-07-02'
const THIS_MONTH = '2026-07'

/**
 * Orchestrates the notifications console: the notification & greeting list
 * queries, the compose mutation, derived KPI counts and the compose handler.
 * The page consumes this and only renders — no data/handler logic lives in
 * the component (column defs stay in the page).
 */
export function useNotificationsConsole() {
  const notifications = useNotifications()
  const greetings = useGreetings()
  const sendNotification = useSendNotification()
  const [composeMessage, setComposeMessage] = useState<string | null>(null)

  const notificationRows = notifications.data ?? []
  const greetingRows = greetings.data ?? []

  const sentToday = notificationRows.filter(
    (n) => n.status === 'sent' && n.sentOn.startsWith(TODAY),
  ).length
  const scheduled = notificationRows.filter((n) => n.status === 'scheduled').length
  const greetingsThisMonth = greetingRows.filter((g) => g.date.startsWith(THIS_MONTH)).length

  const handleCompose = () => {
    sendNotification.mutate(
      { title: 'Broadcast Notification', body: 'Composed from the notifications console.', type: 'push' },
      { onSuccess: () => setComposeMessage('Notification sent to all recipients.') },
    )
  }

  return {
    notifications,
    sendNotification,
    composeMessage,
    notificationRows,
    greetingRows,
    sentToday,
    scheduled,
    greetingsThisMonth,
    handleCompose,
  }
}
