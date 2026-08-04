import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, Eye, Loader2, Wand2 } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { encryptParams } from '@/lib/crypto'
import { AllocationToolbar } from '../components/allocation-toolbar'
import { CompletionMeter } from '../components/completion-meter'
import { FlagsCell } from '../components/flags-cell'
import { GenerateMonthDialog } from '../components/generate-month-dialog'
import { MonthStrip } from '../components/month-strip'
import { MonthStepper } from '../components/month-stepper'
import { useAllocationList } from '../hooks/use-allocation-list'
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
 * Journey Management → Allocations.
 *
 * One month of allocations, one row per sales incharge: how many beats he was
 * given, how many he has worked, the month itself as a strip, and any warnings.
 *
 * **There is nothing to approve here.** An allocation is live the moment it
 * exists, so there are no status tabs, no bulk-approve and no per-row approve —
 * the worklist is `Completion` sorted ascending, and the Flags column is what you
 * scan. Filtering, sorting and paging all happen server-side.
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
    generatePlans,
    isGenerating,
    activities,
    canGenerate,
  } = useAllocationList()

  const navigate = useNavigate()

  /**
   * Open a row on the allocation screen. The incharge travels alongside the plan
   * id so a month step there can resolve the same person's next month.
   */
  const openPlan = useCallback(
    (plan: JourneyPlan) => {
      navigate({
        to: '/journey/plan',
        search: {
          data: encryptParams({ id: plan.id, inchargeId: plan.inchargeId, month }),
        },
      })
    },
    [navigate, month],
  )

  const [confirmGenerate, setConfirmGenerate] = useState(false)

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
          <Hint label="Open allocation">
            <button
              type="button"
              onClick={() => openPlan(row.original)}
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
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
              {initials(row.original.inchargeName)}
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">{row.original.inchargeName}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{row.original.employeeCode}</span>
                {' · '}
                {row.original.headquarter}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'completion',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Completion" />
        ),
        cell: ({ row }) => (
          <CompletionMeter
            value={row.original.completion}
            worked={row.original.beatsWorked}
            allocated={row.original.beatsAllocated}
          />
        ),
      },
      {
        accessorKey: 'beatsAllocated',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Allocated" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.beatsAllocated}
          </span>
        ),
      },
      {
        accessorKey: 'beatsWorked',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Worked" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.beatsWorked}</span>
        ),
      },
      {
        accessorKey: 'workingDays',
        header: 'Days',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.workingDays}</span>
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

  return (
    <div>
      <PageHeader
        title="Monthly Allocations"
        description={`${total} sales incharge${
          total === 1 ? '' : 's'
        } with an allocation for ${monthLabel} — each one's beat list and how far through it he is.`}
        actions={
          <>
            {canGenerate ? (
              <Hint
                label={
                  isGenerating
                    ? `Allocating ${monthLabel}…`
                    : `Build the ${monthLabel} beat list for every sales incharge without one`
                }
              >
                {/* Wrapped: a disabled button fires no pointer events, so the hint
                    would be lost exactly when it explains the most. */}
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={isGenerating}
                    onClick={() => setConfirmGenerate(true)}
                  >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />} Generate
                    month
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
        itemName="allocations"
        maxHeight="65vh"
        pageSizeOptions={[10, 25, 50]}
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
                {hasActiveFilters
                  ? 'No sales incharge matches that search.'
                  : canGenerate
                    ? `No allocations exist for ${monthLabel} yet — generate the month to start.`
                    : `No allocations exist for ${monthLabel} yet.`}
              </p>
            </div>
          </div>
        }
      />

      <GenerateMonthDialog
        open={confirmGenerate}
        onOpenChange={setConfirmGenerate}
        month={month}
        monthLabel={monthLabel}
        activities={activities}
        isPending={isGenerating}
        // Closed from the success path, not on click: a refused run has to keep
        // the pinned rows on screen next to the toast that explains the refusal.
        onGenerate={(input) => generatePlans(input, () => setConfirmGenerate(false))}
      />
    </div>
  )
}
