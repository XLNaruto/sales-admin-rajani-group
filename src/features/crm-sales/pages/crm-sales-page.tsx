import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, ClipboardList, CalendarClock, Store } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useCrm } from '../hooks/use-crm'
import type { MarketVisit, Meeting, VisitForm } from '../types'

export function CrmPage() {
  const {
    visits,
    meetings,
    marketVisits,
    visitsToday,
    upcomingMeetings,
    marketVisitsThisWeek,
  } = useCrm()

  const visitColumns = useMemo<ColumnDef<VisitForm>[]>(
    () => [
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'salesman', header: 'Salesman' },
      { accessorKey: 'retailer', header: 'Retailer' },
      { accessorKey: 'purpose', header: 'Purpose' },
      { accessorKey: 'outcome', header: 'Outcome' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  const meetingColumns = useMemo<ColumnDef<Meeting>[]>(
    () => [
      { accessorKey: 'title', header: 'Meeting' },
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'attendees', header: 'Attendees' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  const marketColumns = useMemo<ColumnDef<MarketVisit>[]>(
    () => [
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'salesman', header: 'Salesman' },
      { accessorKey: 'market', header: 'Market' },
      { accessorKey: 'outletsCovered', header: 'Outlets Covered' },
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
        title="CRM & Sales"
        description="Visit forms, meeting & CRM scheduling, and secondary-sales / market-visit monitoring."
        actions={
          <Button>
            <Plus /> New Visit Form
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visits.isLoading || meetings.isLoading || marketVisits.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard label="Visits Today" value={visitsToday} icon={ClipboardList} hint="field visit forms" />
            <StatCard label="Upcoming Meetings" value={upcomingMeetings} icon={CalendarClock} hint="scheduled" />
            <StatCard label="Market Visits" value={marketVisitsThisWeek} icon={Store} hint="this week" />
          </>
        )}
      </div>

      <Tabs defaultValue="visits" className="mt-6">
        <TabsList>
          <TabsTrigger value="visits">Visit Forms</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="market">Market Visits</TabsTrigger>
        </TabsList>

        <TabsContent value="visits">
          <DataTable
            columns={visitColumns}
            data={visits.data ?? []}
            isLoading={visits.isLoading}
            searchPlaceholder="Search visit forms…"
          />
        </TabsContent>

        <TabsContent value="meetings">
          <DataTable
            columns={meetingColumns}
            data={meetings.data ?? []}
            isLoading={meetings.isLoading}
            searchPlaceholder="Search meetings…"
          />
        </TabsContent>

        <TabsContent value="market">
          <DataTable
            columns={marketColumns}
            data={marketVisits.data ?? []}
            isLoading={marketVisits.isLoading}
            searchPlaceholder="Search market visits…"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
