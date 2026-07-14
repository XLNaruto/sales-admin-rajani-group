import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DistributorToolbar } from "../components/distributor-toolbar";
import { useDistributorsList } from "../hooks/use-distributors-list";
import { cityName, labelFor } from "../lib/distributor-reference";
import type { Distributor } from "../types";

export function DistributorsPage() {
  const {
    filters,
    patchFilters,
    resetFilters,
    filtered,
    isLoading,
    isError,
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
    isDeleting,
    isSettingStatus,
    goToCreate,
    goToEdit,
  } = useDistributorsList();

  const columns = useMemo<ColumnDef<Distributor>[]>(
    () => [
      {
        id: "index",
        header: "#",
        enableSorting: false,
        cell: ({ row, table }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {table.getSortedRowModel().rows.findIndex((r) => r.id === row.id) + 1}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Edit"
              onClick={goToEdit}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setPendingDelete(row.original)}
              disabled={isDeleting}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
            >
              <Trash2 className="size-4" />
            </button>
            {row.original.status === "pending" && (
              <>
                <button
                  type="button"
                  title="Approve"
                  onClick={() => setPendingApprove(row.original)}
                  disabled={isSettingStatus}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  title="Reject"
                  onClick={() => setPendingReject(row.original)}
                  disabled={isSettingStatus}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                >
                  <X className="size-4" />
                </button>
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
        id: "owner",
        accessorFn: (d) => d.ownerName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Owner" />
        ),
        cell: ({ row }) => {
          const { ownerName, ownerMobile } = row.original;
          if (!ownerName && !ownerMobile)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="leading-tight">
              <p className="text-sm text-foreground">{ownerName || "—"}</p>
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
        cell: ({ row }) => (
          <Badge variant="outline" className="font-medium">
            {labelFor(row.original.firmType)}
          </Badge>
        ),
      },
      {
        id: "city",
        accessorFn: (d) => cityName(d.cityId),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="City" />
        ),
        cell: ({ row }) =>
          row.original.cityId ? (
            cityName(row.original.cityId)
          ) : (
            <span className="text-muted-foreground">—</span>
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
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting, isSettingStatus],
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
        data={filtered}
        isLoading={isLoading}
        itemName="distributors"
        maxHeight="70vh"
        pageSizeOptions={[5, 10, 25, 50]}
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
              will be marked active and can start operating.
            </>
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={isSettingStatus}
        onConfirm={confirmApprove}
      />

      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={(open) => !open && setPendingReject(null)}
        variant="destructive"
        icon={X}
        title="Reject this distributor?"
        description={
          pendingReject ? (
            <>
              <span className="font-medium text-foreground">
                {pendingReject.firmName}
              </span>{" "}
              will be marked rejected.
            </>
          ) : undefined
        }
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isSettingStatus}
        onConfirm={confirmReject}
      />
    </div>
  );
}
