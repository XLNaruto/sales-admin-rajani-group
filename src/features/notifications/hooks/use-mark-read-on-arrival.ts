import { useEffect, useRef } from 'react'
import { useMarkNotificationRead } from '../api/use-inbox'

/**
 * Mark a notification read because its page was opened.
 *
 * The in-app click already does this optimistically before it navigates, so
 * this is for arrivals from OUTSIDE the app: a browser push whose click lands
 * straight on the request screen, carrying the notification id in `?n=`. Push
 * delivery is at-least-once, and the mark-read PATCH is idempotent, so a
 * duplicate does no harm — but it is fired once per id per mount regardless.
 *
 * Deliberately silent: the admin came here to answer a request, and a failure
 * to flip a read flag is not worth a word about.
 */
export function useMarkReadOnArrival(notificationId: number | undefined) {
  const markRead = useMarkNotificationRead()
  const done = useRef<number | null>(null)

  useEffect(() => {
    if (notificationId == null || done.current === notificationId) return
    done.current = notificationId
    markRead.mutate(notificationId)
    // `markRead` is a fresh object each render; the id is the whole trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationId])
}
