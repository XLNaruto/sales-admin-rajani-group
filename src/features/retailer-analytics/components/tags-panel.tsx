import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Store } from 'lucide-react'
import { DonutChart } from '@/components/charts'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import { useTagSummary, useTaggedRetailers } from '../api/use-retailer-analytics'
import { formatDate, timeSince } from '../lib/date-labels'
import { TAG_META } from '../lib/retailer-tags'
import type { AnalyticsFilters, AnalyticsRetailer, RetailerTag } from '../types'

/**
 * Report 2 — retailer tags.
 *
 * The cards are the report and the filter at once: each shows a bucket's size
 * with the rule that produced it, and clicking one narrows the table below.
 * That keeps the definition ("Dormant = no order for 3 months") next to the
 * number it explains, so the count can be argued with directly.
 */
export function TagsPanel({ filters }: { filters: AnalyticsFilters }) {
  // 'all' → the whole tagged base; a tag → just that bucket.
  const [selected, setSelected] = useState<RetailerTag | 'all'>('all')

  const { data: tags = [], isLoading: tagsLoading } = useTagSummary(filters)
  const { data: rows = [], isLoading } = useTaggedRetailers(filters, selected)

  const total = tags.reduce((sum, t) => sum + t.count, 0)
  const donutData = tags
    .filter((t) => t.count > 0)
    .map((t) => ({ name: TAG_META[t.tag].label, value: t.count }))

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
        id: 'territory',
        accessorFn: (r) => r.beatName,
        header: 'Beat / City',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="text-sm text-foreground">{row.original.beatName}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.cityName} · {row.original.zoneName}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'activationDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Activated" />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatDate(row.original.activationDate)}
          </span>
        ),
      },
      {
        id: 'lastVisit',
        accessorFn: (r) => r.lastVisitDate ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Visit" />
        ),
        cell: ({ row }) => (
          <SinceCell iso={row.original.lastVisitDate} warnAfterMonths={3} />
        ),
      },
      {
        id: 'lastOrder',
        accessorFn: (r) => r.lastOrderDate ?? '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Order" />
        ),
        cell: ({ row }) => (
          <SinceCell iso={row.original.lastOrderDate} warnAfterMonths={2} />
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
    [],
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Retailer tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tagsLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))
                : tags.map((row) => {
                    const meta = TAG_META[row.tag]
                    const active = selected === row.tag
                    return (
                      <button
                        key={row.tag}
                        type="button"
                        aria-pressed={active}
                        // Clicking the selected card clears it — the card is the
                        // filter, so it has to be able to let go too.
                        onClick={() => setSelected(active ? 'all' : row.tag)}
                        className={cn(
                          'cursor-pointer rounded-xl border p-4 text-left transition-all',
                          meta.className,
                          active
                            ? 'ring-2 ring-primary/40'
                            : 'hover:-translate-y-0.5 hover:shadow-sm',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn('size-2 rounded-full', meta.dotClassName)}
                          />
                          <span className="text-sm font-medium">{meta.label}</span>
                        </div>
                        <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">
                          {row.count}
                          <span className="ml-1.5 text-xs font-normal opacity-70">
                            {row.share.toFixed(1)}%
                          </span>
                        </p>
                        <p className="mt-1 text-xs opacity-80">{meta.rule}</p>
                      </button>
                    )
                  })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tag mix</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length ? (
              <DonutChart data={donutData} height={300} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No retailers in this selection.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selected === 'all' ? (
            <>Showing all {total} retailers</>
          ) : (
            <>
              Showing{' '}
              <span className="font-medium text-foreground">
                {TAG_META[selected].label}
              </span>{' '}
              retailers — {TAG_META[selected].rule.toLowerCase()}
            </>
          )}
        </p>
        {selected !== 'all' && (
          <button
            type="button"
            onClick={() => setSelected('all')}
            className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear tag filter
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="retailers"
        maxHeight="60vh"
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyMessage="No retailers carry this tag for the selected filters."
      />
    </div>
  )
}

/** "3 months ago" plus the exact date, tinted once it crosses the risk line. */
function SinceCell({ iso, warnAfterMonths }: { iso?: string; warnAfterMonths: number }) {
  const label = timeSince(iso)
  const months = iso
    ? (Date.now() - new Date(iso).getTime()) / (30 * 86_400_000)
    : Infinity
  return (
    <div className="leading-tight">
      <p
        className={cn(
          'text-sm',
          months >= warnAfterMonths
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-foreground',
        )}
      >
        {label}
      </p>
      {iso && <p className="text-xs text-muted-foreground tabular-nums">{formatDate(iso)}</p>}
    </div>
  )
}
