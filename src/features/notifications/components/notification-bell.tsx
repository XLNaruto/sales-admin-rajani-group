import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/common/hint'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useInbox,
  useMarkAllNotificationsRead,
  useUnreadCount,
} from '../api/use-inbox'
import { useNotificationClick } from '../hooks/use-notification-click'
import { NotificationItem } from './notification-item'
import type { InboxNotification } from '../types'

type Tab = 'all' | 'unread'

/**
 * The bell.
 *
 * Ungated on purpose — the feed is a property of the token holder, not a
 * managed resource, so there is no permission to hide it behind.
 *
 * Costs one cheap request every 3s while shut (the badge count only, and only
 * while the tab is visible). The list is
 * only fetched when the panel is opened, and refetched when the count moves —
 * polling a feed nobody is looking at would be paying for a screen that isn't
 * on.
 *
 * A right-edge sheet rather than a dropdown: the feed is a list the admin reads
 * DOWN and pages through, and a panel anchored to the viewport gets the full
 * height for it instead of the few hundred pixels a menu can borrow under the
 * topbar. `Sheet` also brings the backdrop, the Escape key and the scroll lock,
 * which a hand-rolled popover here was re-implementing badly.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('all')

  const unread = useUnreadCount()
  const inbox = useInbox({ unread: tab === 'unread' }, { enabled: open })
  const markAll = useMarkAllNotificationsRead()
  const onSelect = useNotificationClick()

  const rows: InboxNotification[] = inbox.data?.pages.flatMap((p) => p.items) ?? []
  const count = unread.data ?? 0
  const isFirstLoad = inbox.isLoading && rows.length === 0

  // Infinite scroll, same idiom as <DataTable>: watch the panel's own scroll
  // container and fetch the next page once the bottom is within ~150px, so the
  // batch is in flight before the reader reaches the end of the current one.
  const scrollRef = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = inbox
  // Held in a ref so the callback below depends only on the two booleans that
  // actually change what it does — `inbox` itself is a fresh object every
  // render, and depending on it would rebind the scroll listener each time.
  const fetchNextRef = useRef(fetchNextPage)
  fetchNextRef.current = fetchNextPage

  const maybeLoadMore = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      void fetchNextRef.current()
    }
  }, [hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', maybeLoadMore)
    // A first page shorter than the panel never scrolls, so nothing would ever
    // fire — kick a check on every render that changes the content.
    maybeLoadMore()
    return () => el.removeEventListener('scroll', maybeLoadMore)
  }, [maybeLoadMore, rows.length, open])

  // Close only when the click actually went somewhere. A broadcast, or a
  // request this admin can't open, marks itself read and leaves the panel where
  // it was — shutting the feed on a click that navigated nowhere reads as the
  // panel breaking, and costs the reader their scroll position.
  const handleSelect = (notification: InboxNotification) => {
    if (onSelect(notification)) setOpen(false)
  }

  return (
    <>
      <Hint label="Notifications">
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer"
          aria-label={count > 0 ? `Notifications (${count} unread)` : 'Notifications'}
          onClick={() => setOpen(true)}
        >
          <Bell className="size-5" />
          {/* Hidden at zero: a brand-new admin has an empty inbox, and a badge
              reading "0" is a chore that isn't there. */}
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white tabular-nums">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </Button>
      </Hint>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent onClose={() => setOpen(false)}>
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              {count > 0
                ? `${count} unread — requests raised by your reps.`
                : "You're all caught up."}
            </SheetDescription>
          </SheetHeader>

          {/* Its own strip rather than part of the header: the tabs and the
              bulk action stay put while the list under them scrolls. */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-5 py-2.5">
            <div className="flex items-center gap-1">
              {(['all', 'unread'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                    tab === value
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {value}
                  {value === 'unread' && count > 0 ? ` (${count})` : ''}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || count === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-40"
            >
              {markAll.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Mark all read
            </button>
          </div>

          {/* Full-bleed: the rows carry their own padding and their dividers run
              the whole width of the panel. */}
          <SheetBody ref={scrollRef} className="px-0 py-0">
            {isFirstLoad ? (
              <div className="space-y-4 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : inbox.isError ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-foreground">
                  Couldn't load your notifications
                </p>
                <button
                  type="button"
                  onClick={() => void inbox.refetch()}
                  className="mt-2 cursor-pointer text-xs font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <BellOff className="size-5" />
                </span>
                <p className="text-sm font-medium text-foreground">
                  {tab === 'unread' ? 'Nothing unread' : 'No notifications yet'}
                </p>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {tab === 'unread'
                    ? "You're all caught up."
                    : 'Beat changes, day changes and profile edits raised by your reps will land here.'}
                </p>
              </div>
            ) : (
              <>
                {rows.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={handleSelect}
                  />
                ))}
                {/* No button to press — scrolling is the gesture. This row is
                    only ever a progress indicator or the end of the feed. */}
                {hasNextPage ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading more…
                  </div>
                ) : (
                  <p className="py-4 text-center text-[11px] text-muted-foreground/70">
                    That's everything.
                  </p>
                )}
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  )
}
