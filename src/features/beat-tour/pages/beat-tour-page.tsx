import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPinned, Plus, Route, CalendarClock, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { EmptyState } from '@/components/common/empty-state'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompact } from '@/lib/utils'
import { useBeats, useRouteMappings } from '../api/use-beats'
import { useTourPlans } from '../api/use-tours'
import type { Beat, RouteMapping, TourPlan } from '../types'

export function BeatTourPage() {
  const beats = useBeats()
  const tours = useTourPlans('month')
  const routes = useRouteMappings()

  const beatColumns = useMemo<ColumnDef<Beat>[]>(
    () => [
      { accessorKey: 'name', header: 'Beat' },
      { accessorKey: 'territory', header: 'Territory' },
      { accessorKey: 'salesman', header: 'Salesman' },
      { accessorKey: 'parties', header: 'Parties' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  const tourColumns = useMemo<ColumnDef<TourPlan>[]>(
    () => [
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'salesman', header: 'Salesman' },
      { accessorKey: 'beat', header: 'Beat' },
      { accessorKey: 'stops', header: 'Stops' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  const routeColumns = useMemo<ColumnDef<RouteMapping>[]>(
    () => [
      { accessorKey: 'route', header: 'Route' },
      { accessorKey: 'territory', header: 'Territory' },
      { accessorKey: 'beats', header: 'Beats' },
      {
        accessorKey: 'distanceKm',
        header: 'Distance',
        cell: ({ row }) => `${row.original.distanceKm} km`,
      },
      { accessorKey: 'salesman', header: 'Salesman' },
    ],
    [],
  )

  const totalBeats = beats.data?.length ?? 0
  const plannedTours = tours.data?.filter((t) => t.status !== 'completed').length ?? 0
  const partiesMapped = beats.data?.reduce((sum, b) => sum + b.parties, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Beat & Tour Planning"
        description="Beat creation & allocation, monthly and day-wise tour programs, route and party mapping."
        actions={
          <Button>
            <Plus /> Create Beat
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {beats.isLoading || tours.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard label="Total Beats" value={totalBeats} icon={MapPinned} hint="across territories" />
            <StatCard label="Planned Tours" value={plannedTours} icon={CalendarClock} hint="this month" />
            <StatCard label="Parties Mapped" value={formatCompact(partiesMapped)} icon={Users} hint="active outlets" />
          </>
        )}
      </div>

      <Tabs defaultValue="beats" className="mt-6">
        <TabsList>
          <TabsTrigger value="beats">Beats</TabsTrigger>
          <TabsTrigger value="tours">Tour Plans</TabsTrigger>
          <TabsTrigger value="routes">Route Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="beats">
          <DataTable
            columns={beatColumns}
            data={beats.data ?? []}
            isLoading={beats.isLoading}
            searchPlaceholder="Search beats…"
          />
        </TabsContent>

        <TabsContent value="tours">
          <DataTable
            columns={tourColumns}
            data={tours.data ?? []}
            isLoading={tours.isLoading}
            searchPlaceholder="Search tour plans…"
          />
        </TabsContent>

        <TabsContent value="routes">
          {!routes.isLoading && (routes.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Route}
              title="No routes mapped yet"
              description="Map beats into optimized routes with distance-based sequencing."
              action={
                <Button variant="outline">
                  <Plus /> Add Route
                </Button>
              }
            />
          ) : (
            <DataTable
              columns={routeColumns}
              data={routes.data ?? []}
              isLoading={routes.isLoading}
              searchPlaceholder="Search routes…"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
