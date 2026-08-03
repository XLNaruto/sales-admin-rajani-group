import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarCheck, Check, ClipboardCheck, Eye, Loader2, Wand2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { encryptParams } from '@/lib/crypto'
import { cn } from '@/lib/utils'
import { ApprovalQueueToolbar } from '../components/approval-queue-toolbar'
import { CoverageMeter } from '../components/coverage-meter'
import { FlagsCell } from '../components/flags-cell'
import { MonthRhythm } from '../components/month-rhythm'
import { MonthStepper } from '../components/month-stepper'
import { RunSummary } from '../components/run-summary'
import { useApprovalQueue } from '../hooks/use-approval-queue'
import type { ApprovalStatus, JourneyPlan } from '../types'

/** Two-letter initials for the row avatar. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Journey Management → Approval Queue.
 *
 * One month of solver-generated journey plans, one row per sales incharge, with
 * enough signal in the row (coverage, rhythm, flags) to approve without opening
 * anything.
 *
 * Filtering, sorting and paging all happen server-side, and the cards above the
 * table read the response's period-wide `summary` — so the numbers stay correct
 * while the table below them narrows.
 */
export function ApprovalQueuePage() {
  const {
    month,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    selectMonth,
    rows,
    summary,
    total,
    periodTotal,
    isLoading,
    isFetching,
    refetch,
    updatedAt,
    segment,
    setSegment,
    segmentCounts,
    filters,
    patchFilters,
    resetFilters,
    hasActiveFilters,
    pagination,
    setPagination,
    sorting,
    setSorting,
    approvePlan,
    approveAllClean,
    isBulkApproving,
    cleanCount,
    generatePlans,
    isGenerating,
    canApprove,
    canGenerate,
  } = useApprovalQueue()

  const navigate = useNavigate()

  /**
   * Open a row on the Journey Plan detail screen. The incharge travels alongside
   * the plan id because a re-solve mints a new id — the detail screen resolves
   * `(incharge, month)` when the id it was handed is stale.
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

  const [confirmBulk, setConfirmBulk] = useState(false)
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  /** Row awaiting single-plan approval confirmation — `null` closes the dialog. */
  const [confirmPlan, setConfirmPlan] = useState<JourneyPlan | null>(null)

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
        cell: ({ row }) => {
          const plan = row.original
          return (
            <div className="flex items-center gap-2">
              <Hint label="Open plan">
                <button
                  type="button"
                  onClick={() => openPlan(plan)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-slate-500/10 text-slate-600 transition-colors hover:bg-slate-500/20 dark:text-slate-300"
                >
                  <Eye className="size-4" />
                </button>
              </Hint>
              {/* No approve grant, no control — a disabled button would only
                  advertise an action this admin can never take. Same for an
                  already-approved plan: the status column already says so. */}
              {canApprove && plan.status !== 'approved' ? (
                <Hint
                  label={
                    plan.status === 'superseded'
                      ? 'Superseded by a re-solve'
                      : 'Approve plan'
                  }
                >
                  <button
                    type="button"
                    disabled={plan.status === 'superseded'}
                    onClick={() => setConfirmPlan(plan)}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400"
                  >
                    <Check className="size-4" />
                  </button>
                </Hint>
              ) : null}
            </div>
          )
        },
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
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={STATUS_LABEL[row.original.status]} />,
      },
      {
        accessorKey: 'coverage',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Coverage" />,
        cell: ({ row }) => <CoverageMeter value={row.original.coverage} />,
      },
      {
        accessorKey: 'workingDays',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Days" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.workingDays}</span>
        ),
      },
      {
        accessorKey: 'beats',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Beats" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.beats}</span>
        ),
      },
      {
        id: 'rhythm',
        header: 'Month Rhythm',
        enableSorting: false,
        cell: ({ row }) => (
          // Props are stable references off the plan, so `MonthRhythm`'s memo holds
          // and unchanged rows skip re-rendering ~31 pillars each.
          <MonthRhythm rhythm={row.original.rhythm} month={month} />
        ),
      },
      {
        id: 'flags',
        header: () => <span className="block text-right">Flags</span>,
        enableSorting: false,
        meta: { className: 'text-right' },
        cell: ({ row }) => <FlagsCell plan={row.original} />,
      },
    ],
    [month, canApprove, openPlan],
  )

  return (
    <div>
      <PageHeader
        title="Approval Queue"
        // The period's count, not the filtered one — the table below reports that.
        description={`${periodTotal} journey plans for ${monthLabel} — review coverage and flags, then approve.`}
        actions={
          <>
            {canGenerate ? (
              <Hint
                label={
                  isGenerating
                    ? `Planning ${monthLabel}…`
                    : `Run the solver for every sales incharge with no ${monthLabel} plan`
                }
              >
                {/* Wrapped: a disabled button fires no pointer events, so the
                    hint would be lost exactly when it explains the most. */}
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
            {canApprove ? (
              <Hint
                label={
                  isBulkApproving
                    ? 'Approving…'
                    : cleanCount
                      ? `Approve all ${cleanCount} pending ${monthLabel} plans with no solver flags`
                      : 'Nothing to approve — no pending plan this month is flag-free'
                }
              >
                <span className="inline-flex">
                  <Button
                    className={cn('cursor-pointer', !cleanCount && 'opacity-60')}
                    disabled={!cleanCount || isBulkApproving}
                    onClick={() => setConfirmBulk(true)}
                  >
                    <ClipboardCheck /> Approve {cleanCount} clean
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

      <RunSummary summary={summary} />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="journey plans"
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
          <ApprovalQueueToolbar
            segment={segment}
            onSegmentChange={setSegment}
            segmentCounts={segmentCounts}
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
              <p className="font-medium text-foreground">Nothing in this slice</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your filters.'
                  : canGenerate
                    ? `No journey plans exist for ${monthLabel} yet — generate the month to start.`
                    : `No journey plans exist for ${monthLabel} yet.`}
              </p>
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        icon={ClipboardCheck}
        title={`Approve ${cleanCount} clean plans?`}
        description={
          <>
            Every plan for <span className="font-medium text-foreground">{monthLabel}</span>{' '}
            awaiting approval with no solver flags will be approved. Flagged plans are
            refused by the server, so they are left untouched.
          </>
        }
        confirmLabel="Approve all clean"
        onConfirm={approveAllClean}
      />

      <ConfirmDialog
        open={confirmGenerate}
        onOpenChange={setConfirmGenerate}
        icon={Wand2}
        title={`Generate plans for ${monthLabel}?`}
        description={
          <>
            The solver plans the month for every sales incharge who doesn&rsquo;t already
            have a plan for it. Anyone who does is skipped — an existing plan is never
            replaced by this.
          </>
        }
        confirmLabel="Generate"
        onConfirm={generatePlans}
      />

      <ConfirmDialog
        open={confirmPlan !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmPlan(null)
        }}
        icon={Check}
        title="Approve this plan?"
        description={
          confirmPlan ? (
            <>
              <span className="font-medium text-foreground">{confirmPlan.inchargeName}</span>
              &rsquo;s {monthLabel} plan will be approved and published
              {confirmPlan.flagCount ? ' — note it still carries solver flags.' : '.'}
            </>
          ) : null
        }
        confirmLabel="Approve"
        onConfirm={() => {
          if (!confirmPlan) return
          approvePlan(confirmPlan)
          setConfirmPlan(null)
        }}
      />
    </div>
  )
}

/**
 * Display text for the status badge. StatusBadge colours by the lowercased,
 * hyphenated form — `Approved` → success, `Pending` → warning, and `Draft` /
 * `Superseded` fall through to the neutral variant.
 *
 * There is deliberately no "Sent back": the server's enum has no such state.
 */
const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  superseded: 'Superseded',
}
