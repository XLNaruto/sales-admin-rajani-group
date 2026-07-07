import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { MessagesSquare } from 'lucide-react'
import type { MessageThread } from '../types'

export function ThreadList({
  threads,
  isLoading,
}: {
  threads: MessageThread[]
  isLoading?: boolean
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Internal Threads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : threads.length ? (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <Avatar name={thread.participants[0] ?? '?'} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{thread.subject}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {thread.lastActivity}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {thread.lastMessage}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={thread.channel === 'announcement' ? 'default' : 'outline'}>
                    {thread.channel}
                  </Badge>
                  {thread.unread > 0 && (
                    <Badge variant="success">{thread.unread} new</Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={MessagesSquare}
            title="No conversations"
            description="Internal threads will appear here."
          />
        )}
      </CardContent>
    </Card>
  )
}
