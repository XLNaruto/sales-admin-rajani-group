import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Check, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { BadgeOverflowList } from "@/components/common/badge-overflow-list";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Hint } from "@/components/common/hint";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DistributorDetailDialog } from "../components/distributor-detail-dialog";
import { DistributorToolbar } from "../components/distributor-toolbar";
import { useDistributorsList } from "../hooks/use-distributors-list";
import { labelFor } from "../lib/distributor-reference";
import type { Distributor, DistributorOnboardingStatus } from "../types";

/** Badge tint per onboarding-approval state. */
const ONBOARDING_STYLES: Record<DistributorOnboardingStatus, string> = {
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function DistributorsPage() {
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
    isLoading,
    isError,
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
    rejectReason,
    setRejectReason,
    confirmDelete,
    confirmApprove,
    confirmReject,
    changeStatus,
    isDeleting,
    isSettingStatus,
    isSettingOnboarding,
    goToCreate,
    goToEdit,
  } = useDistributorsList();

  const [viewId, setViewId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Distributor>[]>(
    () => [
      {
        id: "index",
        header: "#",
        enableSorting: false,
        meta: { className: "w-px whitespace-nowrap" },
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          // In infinite ("All") mode pageSize is the sentinel (< 0) and all rows
          // share one running list — fall back to the row's own index.
          const base = pageSize > 0 ? pageIndex * pageSize : 0;
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {base + row.index + 1}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { className: "w-px whitespace-nowrap" },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Hint label="Edit">
              <button
                type="button"
                onClick={() => goToEdit(row.original.id)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
              >
                <Pencil className="size-4" />
              </button>
            </Hint>
            <Hint label="View details">
              <button
                type="button"
                onClick={() => setViewId(row.original.id)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg bg-slate-500/10 text-slate-600 transition-colors hover:bg-slate-500/20 dark:text-slate-300"
              >
                <Eye className="size-4" />
              </button>
            </Hint>
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
            {row.original.onboardingStatus === "pending" && (
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
        accessorKey: "firmName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Distributor" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Building2 className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">
                {row.original.firmName}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.original.code}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => {
          const active = row.original.status === "active";
          return (
            <button
              type="button"
              role="switch"
              aria-checked={active}
              title={active ? "Set inactive" : "Set active"}
              disabled={isSettingStatus}
              onClick={() =>
                changeStatus(row.original.id, active ? "inactive" : "active")
              }
              className="inline-flex min-w-28 cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  active ? "bg-emerald-500" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                    active ? "translate-x-4.5" : "translate-x-0.5",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  active
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {active ? "Active" : "Inactive"}
              </span>
            </button>
          );
        },
      },
      {
        accessorKey: "onboardingStatus",
        header: "Onboarding",
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original.onboardingStatus;
          return (
            <Badge
              variant="outline"
              className={cn("font-medium capitalize", ONBOARDING_STYLES[s])}
            >
              {s}
            </Badge>
          );
        },
      },
      {
        id: "owner",
        accessorFn: (d) => d.ownerName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Owner" />
        ),
        cell: ({ row }) => {
          const { ownerName, ownerMobile } = row.original;
          if (!ownerName && !ownerMobile)
            return <span className="text-muted-foreground">N/A</span>;
          return (
            <div className="leading-tight">
              <p className="text-sm text-foreground">{ownerName || "N/A"}</p>
              {ownerMobile && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {ownerMobile}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "firmType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) =>
          row.original.firmType ? (
            <Badge variant="outline" className="font-medium">
              {labelFor(row.original.firmType)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          ),
      },
      {
        id: "productDivisions",
        header: "Product Divisions",
        enableSorting: false,
        cell: ({ row }) => {
          const names = row.original.productDivisionNames ?? [];
          if (names.length === 0)
            return <span className="text-muted-foreground">N/A</span>;
          return (
            <BadgeOverflowList
              items={names}
              max={2}
              title={`${row.original.firmName} — Product Divisions`}
              itemLabel="divisions"
            />
          );
        },
      },
      {
        id: "city",
        accessorFn: (d) => d.cityName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="City" />
        ),
        cell: ({ row }) =>
          row.original.cityName ? (
            row.original.cityName
          ) : (
            <span className="text-muted-foreground">N/A</span>
          ),
      },
      {
        id: "market",
        accessorFn: (d) => labelFor(d.marketType),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Market" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="text-sm">{labelFor(row.original.marketType)}</span>
            <span className="text-xs text-muted-foreground">
              {labelFor(row.original.marketSystem)}
            </span>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting, isSettingStatus, isSettingOnboarding],
  );

  return (
    <div>
      <PageHeader
        title="Distributor Management"
        description="Onboard and manage distributors — firm, coverage, business and financial details."
        actions={
          <Button className="cursor-pointer" onClick={goToCreate}>
            <Plus /> Add Distributor
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="distributors"
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
          <DistributorToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError
                  ? "Couldn't load distributors"
                  : "No distributors found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? "Something went wrong. Please try again."
                  : hasActiveFilters
                    ? "Try adjusting your filters."
                    : "Add your first distributor to get started."}
              </p>
            </div>
            {!hasActiveFilters && !isError && (
              <Button className="cursor-pointer" onClick={goToCreate}>
                <Plus /> Add Distributor
              </Button>
            )}
          </div>
        }
      />

      <DistributorDetailDialog id={viewId} onClose={() => setViewId(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Trash2}
        title="Delete this distributor?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.firmName}
              </span>{" "}
              will be permanently removed. This action cannot be undone.
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
        title="Approve this distributor?"
        description={
          pendingApprove ? (
            <>
              <span className="font-medium text-foreground">
                {pendingApprove.firmName}
              </span>{" "}
              onboarding request will be approved.
            </>
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={isSettingOnboarding}
        onConfirm={confirmApprove}
      />

      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingReject(null);
            setRejectReason("");
          }
        }}
        variant="destructive"
        icon={X}
        title="Reject this distributor?"
        description={
          pendingReject ? (
            <>
              <span className="font-medium text-foreground">
                {pendingReject.firmName}
              </span>{" "}
              onboarding request will be rejected. Please provide a reason.
            </>
          ) : undefined
        }
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isSettingOnboarding}
        confirmDisabled={rejectReason.trim() === ""}
        keepOpenOnConfirm
        onConfirm={confirmReject}
      >
        <div className="text-left">
          <label
            htmlFor="reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="reject-reason"
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this onboarding request being rejected?"
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
