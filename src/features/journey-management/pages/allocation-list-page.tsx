import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, CalendarPlus, Eye, Loader2 } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { encryptParams } from '@/lib/crypto'
import { AllocationToolbar } from '../components/allocation-toolbar'
import { CompletionMeter } from '../components/completion-meter'
import { CreatePlanDialog } from '../components/create-plan-dialog'
import { FlagsCell } from '../components/flags-cell'
import { MonthStrip } from '../components/month-strip'
import { MonthStepper } from '../components/month-stepper'
import { StatusChip } from '../components/status-chip'
import { useAllocationList } from '../hooks/use-allocation-list'
import { PLAN_STATUS_LABEL } from '../lib/plan-status'
import type { JourneyPlan } from '../types'

/** Two-letter initials for the row avatar. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Journey Management → Journey Plans.
 *
 * One month of plans, one row per sales incharge: where each sits in the chain,
 * how much of the month the sales incharge has dated, how much he has actually worked, the
 * month itself as a strip, and any warnings.
 *
 * **Two percentages, not one**, because the interesting question changes as the
 * month progresses: *Scheduling* is what matters before approval, *Completion*
 * after it. Showing one number labelled "progress" would mean different things on
 * different rows of the same table.
 *
 * The worklist is the **Submitted** tab — the only state waiting on the admin.
 * Filtering, sorting and paging all happen server-side, and sorting by status uses
 * chain order rather than alphabetical.
 */
export function AllocationListPage() {
  const {
    month,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    selectMonth,
    rows,
    total,
    isLoading,
    isFetching,
    refetch,
    updatedAt,
    filters,
    patchFilters,
    resetFilters,
    hasActiveFilters,
    pagination,
    setPagination,
    sorting,
    setSorting,
    createPlan,
    isCreating,
    canCreate,
  } = useAllocationList()

  const navigate = useNavigate()

  /**
   * Open a row on the plan screen. The incharge travels alongside the plan id so a
   * month step there can resolve the same person's next month.
   */
  const openPlan = useCallback(
    (id: string, inchargeId: string) => {
      navigate({
        to: '/journey/plan',
        search: { data: encryptParams({ id, inchargeId, month }) },
      })
    },
    [navigate, month],
  )

  const [creating, setCreating] = useState(false)

  const columns = useMemo<ColumnDef<JourneyPlan>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination
          return (
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
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
          <Hint label="Open plan">
            <button
              type="button"
              onClick={() => openPlan(row.original.id, row.original.inchargeId)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-slate-500/10 text-slate-600 transition-colors hover:bg-slate-500/20 dark:text-slate-300"
            >
              <Eye className="size-4" />
            </button>
          </Hint>
        ),
      },
      {
        accessorKey: 'inchargeName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sales Incharge" />
        ),
        // Wide enough that names and the code · HQ sub-line stay on one line.
        meta: { className: 'w-64 min-w-64' },
        cell: ({ row }) => {
          // Either half of the sub-line can be missing (no employee code, no
          // territory). Drop what's absent — and the separator with it — rather
          // than printing a dash the reader has to decode.
          const { employeeCode, headquarter } = row.original
          return (
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                {initials(row.original.inchargeName)}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate font-medium text-foreground">
                  {row.original.inchargeName}
                </p>
                {employeeCode || headquarter ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {employeeCode ? (
                      <span className="font-mono tabular-nums">{employeeCode}</span>
                    ) : null}
                    {employeeCode && headquarter ? ' · ' : null}
                    {headquarter}
                  </p>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        // Sorted server-side in CHAIN order (draft → published → submitted →
        // approved), which is what makes it a worklist rather than an index.
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusChip status={row.original.status} />,
      },
      {
        accessorKey: 'schedulingPercentage',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Scheduling" />
        ),
        cell: ({ row }) => (
          // Routinely over 100%, and that is correct: the admin allocates part of
          // the month and the sales incharge dates the rest himself.
          <CompletionMeter
            value={row.original.schedulingPercentage}
            done={row.original.daysScheduled}
            total={row.original.daysAllocated}
            ariaLabel="Days scheduled of days allocated"
            emptyLabel="Nothing allocated"
            emptyHint="No days are allocated for this month, so nothing says what the sales incharge is meant to be doing."
          />
        ),
      },
      {
        accessorKey: 'completionPercentage',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Completion" />
        ),
        cell: ({ row }) => (
          <CompletionMeter
            value={row.original.completionPercentage}
            done={row.original.daysWorked}
            total={row.original.daysScheduled}
            ariaLabel="Days worked of days scheduled"
            emptyLabel="Not scheduled"
            emptyHint="The sales incharge has not dated any day yet, so there is nothing to have worked."
          />
        ),
      },
      {
        accessorKey: 'daysAllocated',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Allocated" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.daysAllocated}
          </span>
        ),
      },
      {
        id: 'distributors',
        header: 'Distributors',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.distributorsAllocated}
          </span>
        ),
      },
      {
        id: 'strip',
        header: 'Month',
        enableSorting: false,
        cell: ({ row }) => (
          // Props are stable references off the plan, so `MonthStrip`'s memo holds
          // and unchanged rows skip re-rendering ~31 pillars each.
          <MonthStrip strip={row.original.monthStrip} month={month} />
        ),
      },
      {
        id: 'flags',
        header: () => <span className="block text-right">Flags</span>,
        enableSorting: false,
        meta: { className: 'text-right' },
        cell: ({ row }) => <FlagsCell flags={row.original.flags} />,
      },
    ],
    [month, openPlan],
  )

  const scope = filters.status ? PLAN_STATUS_LABEL[filters.status].toLowerCase() : null

  return (
    <div>
      <PageHeader
        // Matches the sidebar label, so arriving here confirms where you clicked.
        title="Monthly Plans"
        description={
          scope
            ? `${total} ${scope} plan${total === 1 ? '' : 's'} for ${monthLabel}.`
            : `${total} sales incharge${
                total === 1 ? '' : 's'
              } with a plan for ${monthLabel} — where each one is in the cycle, and how far through the month he is.`
        }
        actions={
          <>
            {canCreate ? (
              <Hint
                label={
                  isCreating
                    ? `Opening ${monthLabel}…`
                    : `Open an empty ${monthLabel} draft for one sales incharge — he cannot see a draft until you publish it`
                }
              >
                {/* Wrapped: a disabled button fires no pointer events, so the hint
                    would be lost exactly when it explains the most. */}
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={isCreating}
                    onClick={() => setCreating(true)}
                  >
                    {isCreating ? <Loader2 className="animate-spin" /> : <CalendarPlus />}{' '}
                    Create plan
                  </Button>
                </span>
              </Hint>
            ) : null}
            <MonthStepper
              month={month}
              label={monthLabel}
              onPrev={goPrevMonth}
              onNext={goNextMonth}
              onSelect={selectMonth}
            />
          </>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="plans"
        maxHeight="65vh"
        pageSizeOptions={[5,10, 25, 50]}
        // Server-side everything: the response is one page, in the server's order.
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        rowCount={total}
        manualSorting
        sorting={sorting}
        onSortingChange={setSorting}
        toolbar={
          <AllocationToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={{ onRefresh: refetch, isFetching, updatedAt }}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <CalendarCheck className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">Nothing here</p>
              <p className="text-sm text-muted-foreground">
                {filters.status
                  ? `No plan for ${monthLabel} is ${scope}.`
                  : hasActiveFilters
                    ? 'No sales incharge matches that search.'
                    : canCreate
                      ? `No plans exist for ${monthLabel} yet — create one to start.`
                      : `No plans exist for ${monthLabel} yet.`}
              </p>
            </div>
          </div>
        }
      />

      <CreatePlanDialog
        open={creating}
        onOpenChange={setCreating}
        monthLabel={monthLabel}
        isPending={isCreating}
        // Closed from the success path, not on click: a refused create — usually
        // because he already has a plan — has to keep the chosen name on screen
        // next to the toast explaining it. Straight onto the new draft, since
        // opening one is only ever the first half of the job.
        onCreate={(inchargeId) =>
          createPlan(inchargeId, (plan) => {
            setCreating(false)
            openPlan(plan.id, plan.inchargeId)
          })
        }
      />
    </div>
  )
}
