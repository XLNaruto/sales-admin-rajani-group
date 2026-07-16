import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { SalesInchargeDetailDialog } from "../components/sales-incharge-detail-dialog";
import { SalesmanToolbar } from "../components/salesman-toolbar";
import { useSalesInchargeList } from "../hooks/use-sales-incharge-list";
import type { SalesIncharge } from "../types";

/** Format a 'yyyy-MM-dd' string as 'dd-MM-yyyy' (falls back to the raw value). */
function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd-MM-yyyy");
  } catch {
    return value;
  }
}

export function SalesInchargePage() {
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
    hasActiveFilters,
    goToCreate,
    goToEdit,
    changeStatus,
    isSettingStatus,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useSalesInchargeList();

  const [viewId, setViewId] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<SalesIncharge>[]>(
    () => [
      {
        id: "index",
        header: "#",
        enableSorting: false,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {pageIndex * pageSize + row.index + 1}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="View details"
              onClick={() => setViewId(row.original.id)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-slate-500/10 text-slate-600 transition-colors hover:bg-slate-500/20 dark:text-slate-300"
            >
              <Eye className="size-4" />
            </button>
            <button
              type="button"
              title="Edit"
              onClick={() => goToEdit(row.original.id)}
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
          </div>
        ),
      },
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sales Incharge" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <UserRound className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">
                {row.original.displayName}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {row.original.phone ?? "—"}
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
        accessorKey: "email",
        // The list endpoint can't sort by email, so keep this column static.
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) =>
          row.original.email ? (
            <span className="text-sm">{row.original.email}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "employeeCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee Code" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.employeeCode ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "designation",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Designation" />
        ),
        cell: ({ row }) =>
          row.original.designation ? (
            <Badge variant="outline" className="font-medium">
              {row.original.designation}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "territory",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Territory" />
        ),
        cell: ({ row }) => row.original.territory ?? "—",
      },
      {
        accessorKey: "dateOfJoining",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date Of Joining" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatDate(row.original.dateOfJoining)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting, isSettingStatus],
  );

  return (
    <div>
      <PageHeader
        title="Sales Incharge"
        description="Manage the sales-incharge team and onboard new members."
        actions={
          <Button className="cursor-pointer" onClick={goToCreate}>
            <Plus /> Create Sales
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="sales incharges"
        maxHeight="70vh"
        pageSize={pagination.pageSize}
        pageSizeOptions={[5, 10, 25, 50]}
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        rowCount={rowCount}
        manualSorting
        sorting={sorting}
        onSortingChange={onSortingChange}
        toolbar={
          <SalesmanToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <UsersRound className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError
                  ? "Couldn't load sales incharges"
                  : "No sales incharges found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? "Something went wrong. Please try again."
                  : hasActiveFilters
                    ? "Try adjusting your filters."
                    : "Add your first sales incharge to get started."}
              </p>
            </div>
            {!hasActiveFilters && !isError && (
              <Button className="cursor-pointer" onClick={goToCreate}>
                <Plus /> Create Sales
              </Button>
            )}
          </div>
        }
      />

      <SalesInchargeDetailDialog id={viewId} onClose={() => setViewId(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Trash2}
        title="Delete this sales incharge?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.displayName}
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
    </div>
  );
}
