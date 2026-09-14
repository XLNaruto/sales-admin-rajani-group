import { useEffect, useRef } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchInbox,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './inbox-api'
import type { InboxResult } from '../types'

/**
 * How often the badge is re-read. The list is never polled — only the count.
 *
 * 3s: the bell lives in the topbar, so this is the app's stand-in for a
 * websocket — a request raised by a rep has to light the badge while the admin
 * is still looking at whatever screen they're on.
 */
const UNREAD_POLL_MS = 3_000

/** Rows per page inside the dropdown. */
export const INBOX_PAGE_SIZE = 20

/** The cached list pages, as the infinite query holds them. */
type InboxPages = InfiniteData<InboxResult, number>

/**
 * Walk every cached inbox page (both tabs) and rewrite the rows in place.
 *
 * Both tabs matter: marking one row read has to leave the All tab showing it as
 * read AND drop it out of the Unread tab's count, and the two are separate
 * cache entries.
 */
function patchCachedPages(
  qc: QueryClient,
  patch: (pages: InboxPages) => InboxPages,
): void {
  qc.setQueriesData<InboxPages>(
    // Scoped to the LIST queries: the count lives under the same prefix and
    // holds a bare number, which has no pages to rewrite.
    { queryKey: queryKeys.notifications.inbox.lists(), exact: false },
    (data) => (data ? patch(data) : data),
  )
}

/**
 * GET /notifications/inbox/unread-count — the badge.
 *
 * Polled every 3s plus once on window focus, because there is no websocket for
 * notifications yet. This is the only thing that polls: the list is refetched
 * when the dropdown opens or when this number moves (the effect below marks it
 * stale, so a closed dropdown costs nothing until it is opened).
 */
export function useUnreadCount(options: { enabled?: boolean } = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.notifications.inbox.unreadCount(),
    queryFn: fetchUnreadCount,
    enabled: options.enabled ?? true,
    refetchInterval: UNREAD_POLL_MS,
    // Never in a hidden tab: a 3s poll that keeps running behind a minimised
    // window is all cost and no reader.
    refetchIntervalInBackground: false,
    // The poll IS the freshness policy here — the 30s global staleTime would
    // otherwise serve the cached number back on every other tick.
    staleTime: 0,
    refetchOnWindowFocus: true,
    // A failing bell must not retry loudly in the background forever.
    retry: 1,
  })

  const previous = useRef<number | undefined>(undefined)
  const count = query.data
  useEffect(() => {
    if (count == null) return
    const changed = previous.current != null && previous.current !== count
    previous.current = count
    if (changed) {
      void qc.invalidateQueries({
        queryKey: queryKeys.notifications.inbox.all,
        // The count is what just told us it moved — re-reading it is the one
        // thing this invalidation must not do.
        predicate: (q) => q.queryKey.at(-1) !== 'unread-count',
      })
    }
  }, [count, qc])

  return query
}

/**
 * GET /notifications/inbox — the dropdown's list, one tab at a time.
 *
 * Infinite rather than paged: the bell is a feed, and "Load more" beats a pager
 * inside a 400px panel. Disabled while the dropdown is shut, so a closed bell
 * costs exactly one poll of the count.
 */
export function useInbox(
  params: { unread?: boolean } = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.inbox.list({ unread: params.unread ?? false }),
    queryFn: ({ pageParam }) =>
      fetchInbox({ page: pageParam, pageSize: INBOX_PAGE_SIZE, unread: params.unread }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * PATCH /notifications/inbox/{id}/read.
 *
 * Optimistic and fire-and-forget by design: the click that marks a notification
 * read is the same click that navigates away, so waiting on the round trip
 * would only delay the deep link. The badge and the row flip immediately; a
 * failure rolls the cache back and is otherwise silent, because a notification
 * that stayed unread is not something to interrupt the admin over.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.inbox.all })
      const snapshot = qc.getQueriesData({
        queryKey: queryKeys.notifications.inbox.all,
      })

      const wasUnread = qc
        .getQueriesData<InboxPages>({
          queryKey: queryKeys.notifications.inbox.lists(),
          exact: false,
        })
        .some(([, data]) =>
          data?.pages.some((p) => p.items.some((n) => n.id === id && !n.isRead)),
        )

      const readAt = new Date().toISOString()
      patchCachedPages(qc, (data) => ({
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: n.readAt ?? readAt } : n,
          ),
        })),
      }))

      if (wasUnread) {
        qc.setQueryData<number>(queryKeys.notifications.inbox.unreadCount(), (n) =>
          n == null ? n : Math.max(0, n - 1),
        )
      }

      return { snapshot }
    },
    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    // Reconcile against the server once the dust settles — the optimistic
    // decrement is a guess, and another tab may have moved the count too.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.inbox.all })
    },
  })
}

/** PATCH /notifications/inbox/read-all — the dropdown's "Mark all read". */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      // The badge is the whole point of the button: zero it at once rather than
      // leaving it lit until the refetch lands.
      qc.setQueryData<number>(queryKeys.notifications.inbox.unreadCount(), 0)
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.inbox.all })
    },
  })
}
