import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Info, Navigation, Pause, Play, Route, SatelliteDish, UsersRound } from 'lucide-react'
import { DayStepper } from '@/components/common/day-stepper'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { RefreshControl } from '@/components/common/refresh-control'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { isForbiddenError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { Forbidden } from '@/features/error'
import { isCompanyNotSelected } from '@/features/company'
import { FleetMap } from '../components/fleet-map'
import { FleetStatRail } from '../components/fleet-stat-rail'
import { FleetToolbar } from '../components/fleet-toolbar'
import { MockBadge, SignalBadge } from '../components/signal-badge'
import { useFleetMap } from '../hooks/use-fleet-map'
import { fixStamp } from '../lib/location-format'
import type { FleetFix } from '../types'

interface FleetMapPageProps {
  /** Encrypted `?data=` token carrying `{ date }`. */
  data?: string
}

/**
 * Location Tracking → Live Fleet Map.
 *
 * Where the whole team's handsets physically were on a day, most-recent fix
 * each. This is **not** the Live Map under Journey Management: that screen is
 * plan vs. actual and its route is a reconstruction of the shops a rep logged.
 * This one is the recorded GPS ledger. The two will disagree, and neither
 * corrects the other.
 *
 * There is no socket for this feed — the realtime service cannot fan location
 * pings out to the admin namespace — so the screen polls while the tab is
 * visible and says when it last refreshed.
 */
export function FleetMapPage({ data }: FleetMapPageProps) {
  const {
    trackedDate,
    trackedDateLabel,
    today,
    selectDate,
    prevDate,
    nextDate,
    filters,
    patchFilters,
    resetFilters,
    hasActiveFilters,
    narrowing,
    rows,
    total,
    pageCounts,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    live,
    toggleLive,
    refresh,
    focusedId,
    setFocusedId,
    goToTrail,
  } = useFleetMap(data)

  const columns = useMemo<ColumnDef<FleetFix>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination
          return (
            <span className="text-sm tabular-nums text-muted-foreground">
              {pageIndex * pageSize + row.index + 1}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <Hint label="Open this rep's GPS trail for the selected day">
            <button
              type="button"
              onClick={() => goToTrail(row.original.salesInchargeId)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Route className="size-3.5" />
              Trail
            </button>
          </Hint>
        ),
      },
      {
        accessorKey: 'salesInchargeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rep" />,
        // A name broken across two lines reads as two people at a glance.
        meta: { className: 'min-w-56 whitespace-nowrap' },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setFocusedId(row.original.salesInchargeId)}
            className="flex cursor-pointer flex-col items-start text-left"
          >
            <span className="font-medium text-foreground">
              {row.original.salesInchargeName}
            </span>
            {row.original.employeeCode && (
              <span className="font-mono text-xs text-muted-foreground">
                #{row.original.employeeCode}
              </span>
            )}
          </button>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'signal',
        header: 'Last seen',
        enableSorting: false,
        // Wide enough for the longest chip the label can produce
        // ("~1 hr 13 min ago") on one line — wrapped, it reads as two facts.
        meta: { className: 'w-56 min-w-56 whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <SignalBadge fix={row.original} />
            {row.original.recordedAt && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {fixStamp(row.original.recordedAt)}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'beat',
        header: 'Beat of latest fix',
        enableSorting: false,
        meta: { className: 'min-w-52' },
        cell: ({ row }) =>
          row.original.beatName ? (
            <span className="text-sm">{row.original.beatName}</span>
          ) : (
            // Absent is normal: travelling, outside any beat, or the beat was
            // deleted. Not an error, so it is not styled as one.
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: 'flags',
        header: 'Device',
        enableSorting: false,
        // Hugs the chip, which must stay on one line to read as one flag.
        meta: { className: 'w-px whitespace-nowrap' },
        // The flag is a property of the DAY, not just of the latest fix: a rep
        // who spoofed at noon and reported honestly at 6pm still shows here,
        // in the quieter variant, with the day's count. Reading only the latest
        // fix would have cleared that row silently.
        cell: ({ row }) => {
          const { isFakeLocation, hasFakeLocation, fakeLocationCount } = row.original
          if (!hasFakeLocation) {
            return <span className="text-sm text-muted-foreground">—</span>
          }
          return (
            <MockBadge
              live={isFakeLocation}
              // A single flagged fix is already said by the chip; the number
              // only earns its place once there is more than one.
              count={fakeLocationCount > 1 ? fakeLocationCount : undefined}
            />
          )
        },
      },
    ],
    [goToTrail, setFocusedId],
  )

  // A `403 COMPANY_NOT_SELECTED` is a missing tenant, not a missing permission —
  // the company picker opens for it (see `useOpenCompanyPickerOnError`), so only
  // a genuine denial reaches the access-denied screen.
  if (isForbiddenError(error) && !isCompanyNotSelected(error)) return <Forbidden />

  return (
    <div>
      <PageHeader
        title="Live Fleet Map"
        description="Where each rep's handset last reported on the selected day — the recorded GPS ledger, not the visit route."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* The last-refreshed stamp lives beside the Live toggle rather than
                in the filter card: every figure on this screen is only as fresh
                as the poll that fetched it, and nothing is recomputed between
                polls — `last_seen_minutes_ago` is stamped server-side per
                response, so a stale response keeps showing stale numbers. */}
            <RefreshControl {...refresh} />
            <Hint
              label={
                live
                  ? 'Polling every 45 seconds while this tab is visible. Pause to stop refreshing.'
                  : 'Polling paused — the figures below are frozen at the last refresh.'
              }
            >
              <Button
                variant={live ? 'outline' : 'secondary'}
                className="cursor-pointer gap-2"
                onClick={toggleLive}
              >
                {live ? (
                  <>
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-success" />
                    </span>
                    Live
                    <Pause className="size-3.5" />
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" /> Paused
                  </>
                )}
              </Button>
            </Hint>
            <DayStepper
              date={trackedDate}
              label={trackedDateLabel}
              max={today}
              onPrev={prevDate}
              onNext={nextDate}
              onSelect={selectDate}
            />
          </div>
        }
      />

      <FleetStatRail total={total} counts={pageCounts} narrowing={narrowing} />

      <div className="mt-4">
        <FleetMap
          fixes={rows}
          focusedId={focusedId}
          onFocus={setFocusedId}
          // Re-fit on a new day or a new page of reps, never on a selection.
          fitKey={`${trackedDate}:${pagination.pageIndex}:${pagination.pageSize}`}
          isLoading={isLoading}
        />
      </div>

      {/* The one thing about this endpoint that will mislead a reader who
          doesn't know it: three of the filters narrow the page the server has
          already cut, so a short page is not the end of the results. */}
      {narrowing && (
        <div
          className={cn(
            'mt-4 flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5',
            'text-xs text-muted-foreground',
          )}
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium text-foreground">
              {pageCounts.shown} matching on this page.
            </span>{' '}
            The beat, signal and device filters are applied to each page after the team
            is paged, so a page can be short — or empty — while later pages still hold
            matches. Keep paging.
          </p>
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          itemName="reps"
          maxHeight="60vh"
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          manualPagination
          pagination={pagination}
          onPaginationChange={setPagination}
          rowCount={total}
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          toolbar={
            <FleetToolbar
              filters={filters}
              onChange={patchFilters}
              onReset={resetFilters}
            />
          }
          emptyState={
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                {isError ? (
                  <SatelliteDish className="size-6" />
                ) : narrowing ? (
                  <Navigation className="size-6" />
                ) : (
                  <UsersRound className="size-6" />
                )}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {isError
                    ? "Couldn't load live locations"
                    : narrowing
                      ? 'Nothing matching on this page'
                      : 'No reps on this day'}
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {isError
                    ? 'Something went wrong. Try refreshing.'
                    : narrowing
                      ? 'These filters narrow each page after the team is paged — try the next page before changing them.'
                      : hasActiveFilters
                        ? 'Try adjusting your filters.'
                        : 'Nobody is on the team for the selected company yet.'}
                </p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
