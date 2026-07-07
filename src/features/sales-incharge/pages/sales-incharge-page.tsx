import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";

/** Format a 'yyyy-MM-dd' string as 'dd-MM-yyyy' (falls back to the raw value). */
function formatDate(value: string) {
  try {
    return format(parseISO(value), "dd-MM-yyyy");
  } catch {
    return value;
  }
}
import { useDeleteSalesman, useSalesmen } from "../api/use-sales-incharge";
import {
  INITIAL_FILTERS,
  SalesmanToolbar,
  type SalesmanFilters,
} from "../components/salesman-toolbar";
import type { Salesman } from "../types";

export function SalesInchargePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useSalesmen();
  const deleteSalesman = useDeleteSalesman();

  const [filters, setFilters] = useState<SalesmanFilters>(INITIAL_FILTERS);
  const patchFilters = (patch: Partial<SalesmanFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (data ?? []).filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.mobile.includes(q);
      const matchesDesignation =
        filters.designation === "all" || s.designation === filters.designation;
      const matchesStatus =
        filters.status === "all" || s.status === filters.status;
      return matchesSearch && matchesDesignation && matchesStatus;
    });
  }, [data, filters]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.designation !== "all" ||
    filters.status !== "all";

  const [pendingDelete, setPendingDelete] = useState<Salesman | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const s = pendingDelete;
    deleteSalesman.mutate(s.id, {
      onSuccess: () => toast.success(`${s.name} removed`),
      onError: () => toast.error("Couldn't remove the salesman."),
    });
  };

  const columns = useMemo<ColumnDef<Salesman>[]>(
    () => [
      {
        id: "index",
        header: "#",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.index + 1}
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
              onClick={() => navigate({ to: "/sales-incharge/create" })}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-amber-500/10 text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setPendingDelete(row.original)}
              disabled={deleteSalesman.isPending}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Salesman" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "employerCompany",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employer Company" />
        ),
      },
      {
        accessorKey: "designation",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Designation" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-medium">
            {row.original.designation}
          </Badge>
        ),
      },
      {
        accessorKey: "mobile",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Mobile" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.mobile}</span>
        ),
      },
      {
        accessorKey: "dateOfJoining",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date Of Joining" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDate(row.original.dateOfJoining)}</span>
        ),
      },
      {
        id: "salary",
        accessorFn: (s) => s.basicSalary + s.allowance,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Salary" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(row.original.basicSalary + row.original.allowance)}
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
    [deleteSalesman.isPending],
  );

  return (
    <div>
      <PageHeader
        title="Sales Incharge"
        description="Manage the salesman team and onboard new members."
        actions={
          <Button
            className="cursor-pointer"
            onClick={() => navigate({ to: "/sales-incharge/create" })}
          >
            <Plus /> Create Sales
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        itemName="salesmen"
        maxHeight="70vh"
        pageSizeOptions={[5, 10, 25, 50]}
        toolbar={
          <SalesmanToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={() => setFilters(INITIAL_FILTERS)}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <UsersRound className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">No salesmen found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters."
                  : "Add your first salesman to get started."}
              </p>
            </div>
            {!hasActiveFilters && (
              <Button
                className="cursor-pointer"
                onClick={() => navigate({ to: "/sales-incharge/create" })}
              >
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
        title="Delete this salesman?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.name}
              </span>{" "}
              will be permanently removed. This action cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        loading={deleteSalesman.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
