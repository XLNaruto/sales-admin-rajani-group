import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bell, CalendarClock, Send, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { EmptyState } from '@/components/common/empty-state'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGreetings, useNotifications, useSendNotification } from '../api/use-notifications'
import { GreetingCard } from '../components/greeting-card'
import type { AppNotification, NotificationType } from '../types'

const TODAY = '2026-07-02'
const THIS_MONTH = '2026-07'

const TYPE_VARIANT: Record<NotificationType, 'default' | 'warning' | 'success'> = {
  push: 'default',
  'sales-alert': 'warning',
  greeting: 'success',
}

export function NotificationsPage() {
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

  const columns = useMemo<ColumnDef<AppNotification>[]>(
    () => [
      { accessorKey: 'title', header: 'Title' },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={TYPE_VARIANT[row.original.type]}>{row.original.type}</Badge>
        ),
      },
      { accessorKey: 'body', header: 'Message' },
      { accessorKey: 'sentOn', header: 'Sent / Scheduled' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Push notifications, sales alerts, and birthday / anniversary / festival greetings."
        actions={
          <Button onClick={handleCompose} disabled={sendNotification.isPending}>
            <Send /> {sendNotification.isPending ? 'Sending…' : 'Compose'}
          </Button>
        }
      />

      {composeMessage && (
        <p className="mb-4 rounded-lg border border-dashed bg-card/50 px-4 py-2 text-sm text-muted-foreground">
          {composeMessage}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sent Today" value={sentToday} icon={Bell} hint="delivered" />
        <StatCard label="Scheduled" value={scheduled} icon={CalendarClock} hint="queued to send" />
        <StatCard label="Greetings This Month" value={greetingsThisMonth} icon={Sparkles} hint="upcoming occasions" />
      </div>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="greetings">Greetings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <DataTable
            columns={columns}
            data={notificationRows}
            isLoading={notifications.isLoading}
            searchPlaceholder="Search notifications…"
          />
        </TabsContent>

        <TabsContent value="greetings">
          {greetingRows.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {greetingRows.map((g) => (
                <GreetingCard key={g.id} greeting={g} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No upcoming greetings"
              description="Birthday, anniversary and festival greetings will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
