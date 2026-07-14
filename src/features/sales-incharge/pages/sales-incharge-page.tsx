import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
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
    isLoading,
    isError,
    hasActiveFilters,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useSalesInchargeList();

  const columns = useMemo<ColumnDef<SalesIncharge>[]>(
    () => [
      {
        id: "index",
        header: "#",
        enableSorting: false,
        cell: ({ row, table }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {table.getSortedRowModel().rows.findIndex((r) => r.id === row.id) +
              1}
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
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting],
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
        pageSizeOptions={[5, 10, 25, 50]}
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
