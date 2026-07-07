import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useThreads } from '../api/use-communication'
import { useWhatsAppLog } from '../api/use-whatsapp'
import { ThreadList } from '../components/thread-list'
import { WhatsAppComposer } from '../components/whatsapp-composer'
import type { WhatsAppMessage } from '../types'

export function CommunicationPage() {
  const { data: threads, isLoading: threadsLoading } = useThreads()
  const { data: log, isLoading: logLoading } = useWhatsAppLog()

  const logColumns = useMemo<ColumnDef<WhatsAppMessage>[]>(
    () => [
      { accessorKey: 'recipient', header: 'Recipient' },
      { accessorKey: 'to', header: 'Number' },
      { accessorKey: 'body', header: 'Message' },
      {
        accessorKey: 'sentAt',
        header: 'Sent',
        cell: ({ row }) => new Date(row.original.sentAt).toLocaleString('en-IN'),
      },
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
        title="Communication"
        description="Internal messaging & WhatsApp integration for the field team."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ThreadList threads={threads ?? []} isLoading={threadsLoading} />
        <WhatsAppComposer />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>WhatsApp Log</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={logColumns}
            data={log ?? []}
            isLoading={logLoading}
            searchPlaceholder="Search WhatsApp log…"
          />
        </CardContent>
      </Card>
    </div>
  )
}
