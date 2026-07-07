import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPin, Radio, ShieldAlert, WifiOff } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { EmptyState } from '@/components/common/empty-state'
import { DataTable } from '@/components/data-table/data-table'
import { SalesmanMap } from '@/components/maps/salesman-map'
import type { MapPoint } from '@/components/maps/salesman-map'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useFakeLocationAlerts, useLivePositions } from '../api/use-gps'
import type { FakeLocationAlert, GpsPing } from '../types'

const positionColumns: ColumnDef<GpsPing>[] = [
  { accessorKey: 'salesmanName', header: 'Salesman' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'coords',
    header: 'Coordinates',
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.lat.toFixed(4)}, {row.original.lng.toFixed(4)}
      </span>
    ),
  },
  {
    accessorKey: 'speedKmh',
    header: 'Speed',
    cell: ({ row }) => `${row.original.speedKmh} km/h`,
  },
  {
    accessorKey: 'accuracy',
    header: 'Accuracy',
    cell: ({ row }) => `${row.original.accuracy} m`,
  },
  {
    accessorKey: 'timestamp',
    header: 'Last Seen',
    cell: ({ row }) =>
      new Date(row.original.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
]

const alertColumns: ColumnDef<FakeLocationAlert>[] = [
  { accessorKey: 'salesmanName', header: 'Salesman' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: () => <StatusBadge status="suspicious" />,
  },
  {
    id: 'reasons',
    header: 'Flagged Reasons',
    cell: ({ row }) => (
      <ul className="list-disc space-y-0.5 pl-4 text-sm">
        {row.original.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    ),
  },
  {
    accessorKey: 'timestamp',
    header: 'Detected',
    cell: ({ row }) =>
      new Date(row.original.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
]

export function GpsTrackingPage() {
  const { data: pings, isLoading } = useLivePositions()
  const { data: alerts, isLoading: alertsLoading } = useFakeLocationAlerts()

  const points = useMemo<MapPoint[]>(
    () =>
      (pings ?? []).map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        label: `${p.salesmanName} • ${p.speedKmh} km/h`,
        status: p.status,
      })),
    [pings],
  )

  const counts = useMemo(() => {
    const source = pings ?? []
    return {
      online: source.filter((p) => p.status === 'online').length,
      offline: source.filter((p) => p.status === 'offline').length,
      suspicious: source.filter((p) => p.status === 'suspicious').length,
    }
  }, [pings])

  return (
    <div>
      <PageHeader
        title="GPS Tracking"
        description="Live salesman positions, route monitoring, and fake-location detection."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard label="Salesmen Online" value={counts.online} icon={Radio} hint="live now" />
            <StatCard label="Offline" value={counts.offline} icon={WifiOff} />
            <StatCard label="Suspicious" value={counts.suspicious} icon={ShieldAlert} />
          </>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" /> Live Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[460px] w-full" />
          ) : (
            <SalesmanMap points={points} />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="live" className="mt-6">
        <TabsList>
          <TabsTrigger value="live">Live Positions</TabsTrigger>
          <TabsTrigger value="alerts">
            Fake-Location Alerts{alerts?.length ? ` (${alerts.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <DataTable
            columns={positionColumns}
            data={pings ?? []}
            isLoading={isLoading}
            searchPlaceholder="Search salesman…"
          />
        </TabsContent>

        <TabsContent value="alerts">
          {!alertsLoading && (alerts?.length ?? 0) === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No suspicious activity"
              description="No pings tripped the fake-location heuristics."
            />
          ) : (
            <DataTable
              columns={alertColumns}
              data={alerts ?? []}
              isLoading={alertsLoading}
              searchPlaceholder="Search alerts…"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
