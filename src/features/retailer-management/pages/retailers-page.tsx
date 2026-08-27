import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Eye, Pencil, Plus, Route, Store, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DraftsButton } from '@/components/common/drafts-button'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { useCan } from '@/features/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isForbiddenError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { Forbidden } from '@/features/error'
import { RetailerBeatDialog } from '../components/retailer-beat-dialog'
import { RetailerDetailDialog } from '../components/retailer-detail-dialog'
import { useOnCompanySwitch } from '@/features/company'
import { RetailerToolbar } from '../components/retailer-toolbar'
import { useRetailersList } from '../hooks/use-retailers-list'
import { RETAILER_DRAFT_KEY } from '../lib/retailer-form'
import type { Retailer, RetailerOnboardingStatus } from '../types'

/** Badge tint per onboarding-approval state. */
const ONBOARDING_STYLES: Record<RetailerOnboardingStatus, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  approved:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

export function RetailersPage() {
  const {
    filters,
    patchFilters,
    resetFilters,
    rows,
    rowCount,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    refresh,
    isLoading,
    isError,
    error,
    onLoadMore,
    hasMore,
    isFetchingMore,
    hasActiveFilters,
    pendingDelete,
    setPendingDelete,
    pendingApprove,
    setPendingApprove,
    pendingReject,
    setPendingReject,
    confirmDelete,
    confirmApprove,
    confirmReject,
    changeStatus,
    isDeleting,
    isSettingStatus,
    isSettingOnboarding,
    goToCreate,
    goToDraft,
    goToEdit,
  } = useRetailersList()

  const [viewId, setViewId] = useState<string | null>(null)
  // Row whose beat mapping is being edited (null → modal closed).
  const [beatTarget, setBeatTarget] = useState<Retailer | null>(null)

  // An open detail dialog is pinned to one tenant's record — close it (and any
  // side dialog) the moment the active company changes underneath it.
  useOnCompanySwitch(() => {
    setViewId(null)
    setBeatTarget(null)
  })
  const { can } = useCan()

  const columns = useMemo<ColumnDef<Retailer>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination
          // In infinite ("All") mode pageSize is the sentinel (< 0) and all rows
          // share one running list — fall back to the row's own index.
          const base = pageSize > 0 ? pageIndex * pageSize : 0
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {base + row.index + 1}
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
          <div className="flex items-center gap-2">
            {can('retailer-master:update') && (
              <Hint label="Edit">
                <button
                  type="button"
                  onClick={() => goToEdit(row.original.id)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
                >
                  <Pencil className="size-4" />
                </button>
              </Hint>
            )}
            <Hint label="View details">
              <button
                type="button"
                onClick={() => setViewId(row.original.id)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg bg-slate-500/10 text-slate-600 transition-colors hover:bg-slate-500/20 dark:text-slate-300"
              >
                <Eye className="size-4" />
              </button>
            </Hint>
            {can('retailer-master:update') && (
              <Hint label="Beat allocate">
                <button
                  type="button"
                  onClick={() => setBeatTarget(row.original)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-violet-600/10 text-violet-600 transition-colors hover:bg-violet-600/20 dark:text-violet-400"
                >
                  <Route className="size-4" />
                </button>
              </Hint>
            )}
            {can('retailer-master:delete') && (
              <Hint label="Delete">
                <button
                  type="button"
                  onClick={() => setPendingDelete(row.original)}
                  disabled={isDeleting}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </Hint>
            )}
            {row.original.onboardingStatus === 'pending' && (
              <>
                <Hint label="Approve">
                  <button
                    type="button"
                    onClick={() => setPendingApprove(row.original)}
                    disabled={isSettingOnboarding}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
                  >
                    <Check className="size-4" />
                  </button>
                </Hint>
                <Hint label="Reject">
                  <button
                    type="button"
                    onClick={() => setPendingReject(row.original)}
                    disabled={isSettingOnboarding}
                    className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                  >
                    <X className="size-4" />
                  </button>
                </Hint>
              </>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'shopName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Retailer" />,
        meta: { className: 'min-w-64' },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Store className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground whitespace-nowrap">
                {row.original.shopName}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Retailer Code" />
        ),
        cell: ({ row }) =>
          row.original.code ? (
            <span className="font-mono text-xs text-foreground">{row.original.code}</span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const active = row.original.status === 'active'
          return (
            <button
              type="button"
              role="switch"
              aria-checked={active}
              title={active ? 'Set inactive' : 'Set active'}
              disabled={isSettingStatus}
              onClick={() => changeStatus(row.original.id, active ? 'inactive' : 'active')}
              className="inline-flex min-w-28 cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                  active ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'inline-block size-4 transform rounded-full bg-white shadow transition-transform',
                    active ? 'translate-x-4.5' : 'translate-x-0.5',
                  )}
                />
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground',
                )}
              >
                {active ? 'Active' : 'Inactive'}
              </span>
            </button>
          )
        },
      },
      {
        accessorKey: 'onboardingStatus',
        header: 'Onboarding',
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original.onboardingStatus
          return (
            <Badge
              variant="outline"
              className={cn('font-medium capitalize', ONBOARDING_STYLES[s])}
            >
              {s}
            </Badge>
          )
        },
      },
      {
        id: 'owner',
        accessorFn: (r) => r.owners[0]?.name,
        header: 'Owner',
        // An outlet can have several owners, so there's no single value for the
        // endpoint to order on — its `sort_by` enum omits the owner columns.
        enableSorting: false,
        cell: ({ row }) => {
          // The first owner stands in for the outlet; the rest are one click
          // away in "view details", so only their count is shown here.
          const [first, ...rest] = row.original.owners
          if (!first) return <span className="text-muted-foreground">N/A</span>
          return (
            <div className="leading-tight">
              <p className="flex items-center gap-1.5 text-sm text-foreground">
                <span className="truncate">{first.name || 'N/A'}</span>
                {rest.length > 0 && (
                  <Hint label={rest.map((o) => o.name || 'Unnamed').join(', ')}>
                    <Badge
                      variant="outline"
                      className="shrink-0 cursor-default px-1.5 py-0 text-[10px] font-medium tabular-nums"
                    >
                      +{rest.length}
                    </Badge>
                  </Hint>
                )}
              </p>
              {first.mobile && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {first.mobile}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: 'outletType',
        accessorFn: (r) => r.outletTypeName,
        header: 'Outlet Type',
        enableSorting: false,
        // Wide enough that the header stays on one line.
        meta: { className: 'min-w-36 whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.outletTypeName ? (
            <Badge variant="outline" className="font-medium">
              {row.original.outletTypeName}
            </Badge>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          ),
      },
      {
        id: 'beat',
        accessorFn: (r) => r.beatName,
        header: 'Beat',
        enableSorting: false,
        cell: ({ row }) => {
          // The beat is auto-assigned from the outlet's coordinates, and the
          // distributors are the firms serving that beat — several when shared.
          const { beatName, distributors } = row.original
          if (!beatName && distributors.length === 0)
            return <span className="text-muted-foreground">N/A</span>
          const names = distributors.map((d) => d.name)
          return (
            <div className="leading-tight">
              <p className="text-sm text-foreground">{beatName || 'N/A'}</p>
              {names.length > 0 && (
                <Hint label={names.join(', ')}>
                  <p className="max-w-40 truncate text-xs text-muted-foreground">
                    {names.join(', ')}
                  </p>
                </Hint>
              )}
            </div>
          )
        },
      },
      {
        id: 'city',
        accessorFn: (r) => r.cityName,
        header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
        cell: ({ row }) =>
          row.original.cityName ? (
            <span className="text-sm text-foreground">{row.original.cityName}</span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting, isSettingStatus, isSettingOnboarding, can],
  )

  // A forbidden list load means no access to this module — show the dedicated
  // Access-denied screen instead of the table.
  if (isForbiddenError(error)) return <Forbidden />

  return (
    <div>
      <PageHeader
        title="Retailer Management"
        description="Onboard and manage retail outlets — shop, owner, territory and beat mapping."
        actions={
          can('retailer-master:create') ? (
            <div className="flex items-center gap-2">
              {/* Renders only while unsubmitted drafts exist. */}
              <DraftsButton
                formKey={RETAILER_DRAFT_KEY}
                onOpen={goToDraft}
                onNew={goToCreate}
                newLabel="retailer"
              />
              <Button className="cursor-pointer" onClick={goToCreate}>
                <Plus /> Add Retailer
              </Button>
            </div>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="retailers"
        maxHeight="70vh"
        pageSizeOptions={[5, 10, 25, 50]}
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        rowCount={rowCount}
        manualSorting
        sorting={sorting}
        onSortingChange={onSortingChange}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        toolbar={
          <RetailerToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Store className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load retailers" : 'No retailers found'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'Add your first retailer to get started.'}
              </p>
            </div>
            {!hasActiveFilters && !isError && can('retailer-master:create') && (
              <Button className="cursor-pointer" onClick={goToCreate}>
                <Plus /> Add Retailer
              </Button>
            )}
          </div>
        }
      />

      <RetailerDetailDialog id={viewId} onClose={() => setViewId(null)} />

      <RetailerBeatDialog retailer={beatTarget} onClose={() => setBeatTarget(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Trash2}
        title="Delete this retailer?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">{pendingDelete.shopName}</span>{' '}
              will be removed from the retailer master and will no longer appear in
              listings or the field app.
            </>
          ) : undefined
        }
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={pendingApprove !== null}
        onOpenChange={(open) => !open && setPendingApprove(null)}
        icon={Check}
        title="Approve this retailer?"
        description={
          pendingApprove ? (
            <>
              <span className="font-medium text-foreground">
                {pendingApprove.shopName}
              </span>{' '}
              onboarding request will be approved.
            </>
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={isSettingOnboarding}
        onConfirm={confirmApprove}
      />

      {/* The onboarding endpoint takes only `{ action }` — no rejection reason. */}
      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={(open) => !open && setPendingReject(null)}
        variant="destructive"
        icon={X}
        title="Reject this retailer?"
        description={
          pendingReject ? (
            <>
              <span className="font-medium text-foreground">{pendingReject.shopName}</span>{' '}
              onboarding request will be rejected and the outlet deactivated. Editing it
              later reopens the request.
            </>
          ) : undefined
        }
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isSettingOnboarding}
        onConfirm={confirmReject}
      />
    </div>
  )
}
