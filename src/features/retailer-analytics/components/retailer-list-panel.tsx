import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPin, Route, Store } from 'lucide-react'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompact, formatCurrency } from '@/lib/utils'
import { useGroupRetailers, useRetailerListGroups } from '../api/use-retailer-analytics'
import { formatDate, timeSince } from '../lib/date-labels'
import { TAG_META } from '../lib/retailer-tags'
import type { AnalyticsFilters, AnalyticsRetailer, ListDimension } from '../types'

/**
 * Report 3 — beat-wise / city-wise retailer lists.
 *
 * Master–detail rather than one flat table: the rail on the left is the report
 * (how many outlets each beat/city holds and how many are still transacting),
 * and the table is the roster for whichever one is selected — which is how the
 * list is actually used, one route at a time.
 */
export function RetailerListPanel({ filters }: { filters: AnalyticsFilters }) {
  const [dimension, setDimension] = useState<ListDimension>('beat')
  const [selected, setSelected] = useState<string | null>(null)

  const { data: groups = [], isLoading: groupsLoading } = useRetailerListGroups(
    dimension,
    filters,
  )
  const { data: rows = [], isLoading } = useGroupRetailers(dimension, selected, filters)

  // Keep a valid selection as the filters/grouping change — a stale beat id
  // would leave the table empty with no obvious reason why.
  useEffect(() => {
    if (groups.length === 0) {
      if (selected !== null) setSelected(null)
      return
    }
    if (!selected || !groups.some((g) => g.id === selected)) setSelected(groups[0].id)
  }, [groups, selected])

  const activeGroup = groups.find((g) => g.id === selected)

  const columns = useMemo<ColumnDef<AnalyticsRetailer>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'shopName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Retailer" />,
        meta: { className: 'min-w-60' },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Store className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">{row.original.shopName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {row.original.code}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'owner',
        accessorFn: (r) => r.ownerName,
        header: 'Owner',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="text-sm text-foreground">{row.original.ownerName}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {row.original.mobile}
            </p>
          </div>
        ),
      },
      {
        id: 'area',
        accessorFn: (r) => r.cityName,
        header: dimension === 'beat' ? 'City' : 'Beat',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {dimension === 'beat' ? row.original.cityName : row.original.beatName}
          </span>
        ),
      },
      {
        id: 'tag',
        accessorFn: (r) => r.tag,
        header: 'Tag',
        enableSorting: false,
        cell: ({ row }) => {
          const meta = TAG_META[row.original.tag]
          return (
            <Badge variant="outline" className={cn('font-medium', meta.className)}>
              {meta.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'activationDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Activated" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatDate(row.original.activationDate)}
          </span>
        ),
      },
      {
        id: 'lastOrder',
        accessorFn: (r) => r.lastOrderDate ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Order" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {timeSince(row.original.lastOrderDate)}
          </span>
        ),
      },
      {
        accessorKey: 'sales',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sales" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {row.original.sales ? formatCurrency(row.original.sales) : '—'}
          </span>
        ),
      },
    ],
    [dimension],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by</span>
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { value: 'beat', label: 'Beat', icon: Route },
              { value: 'city', label: 'City', icon: MapPin },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDimension(value)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                dimension === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              {dimension === 'beat' ? 'Beats' : 'Cities'}
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                {groups.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {groupsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))
            ) : groups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing matches the selected filters.
              </p>
            ) : (
              groups.map((group) => {
                const active = group.id === selected
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(group.id)}
                    className={cn(
                      'w-full cursor-pointer rounded-lg border p-3 text-left transition-colors',
                      active
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/60 hover:bg-muted/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="leading-tight">
                        <p className="text-sm font-medium text-foreground">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{group.parent}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        {group.retailers}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                      {group.activeRetailers} active ·{' '}
                      {group.sales ? `₹${formatCompact(group.sales)}` : 'no sales'}
                    </p>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {activeGroup && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="font-heading text-lg font-semibold">{activeGroup.name}</h3>
              <p className="text-sm text-muted-foreground">
                {activeGroup.parent} · {activeGroup.retailers} retailers ·{' '}
                {activeGroup.activeRetailers} active ·{' '}
                {formatCurrency(activeGroup.sales)}
              </p>
            </div>
          )}
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            itemName="retailers"
            maxHeight="60vh"
            pageSize={10}
            pageSizeOptions={[10, 25, 50]}
            emptyMessage="No retailers in this selection."
          />
        </div>
      </div>
    </div>
  )
}
