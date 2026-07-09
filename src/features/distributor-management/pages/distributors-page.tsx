import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDistributors,
  useDeleteDistributor,
  useSetDistributorStatus,
} from "../api/use-distributors";
import {
  DistributorToolbar,
  INITIAL_FILTERS,
  type DistributorFilters,
} from "../components/distributor-toolbar";
import { cityName, labelFor } from "../lib/distributor-reference";
import type { Distributor } from "../types";

export function DistributorsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDistributors();
  const deleteDistributor = useDeleteDistributor();
  const setStatus = useSetDistributorStatus();

  const [filters, setFilters] = useState<DistributorFilters>(INITIAL_FILTERS);
  const patchFilters = (patch: Partial<DistributorFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      const matchesSearch =
        !q ||
        d.firmName.toLowerCase().includes(q) ||
        d.ownerName.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q);
      const matchesType =
        filters.firmType === "all" || d.firmType === filters.firmType;
      const matchesStatus =
        filters.status === "all" || d.status === filters.status;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data, filters]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.firmType !== "all" ||
    filters.status !== "all";

  const [pendingDelete, setPendingDelete] = useState<Distributor | null>(null);
  const [pendingApprove, setPendingApprove] = useState<Distributor | null>(
    null,
  );
  const [pendingReject, setPendingReject] = useState<Distributor | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const d = pendingDelete;
    deleteDistributor.mutate(d.id, {
      onSuccess: () => toast.success(`${d.firmName} removed`),
      onError: () => toast.error("Couldn't remove the distributor."),
    });
  };

  const confirmApprove = () => {
    if (!pendingApprove) return;
    const d = pendingApprove;
    setStatus.mutate(
      { id: d.id, status: "active" },
      {
        onSuccess: () => toast.success(`${d.firmName} approved`),
        onError: () => toast.error("Couldn't approve the distributor."),
      },
    );
  };

  const confirmReject = () => {
    if (!pendingReject) return;
    const d = pendingReject;
    setStatus.mutate(
      { id: d.id, status: "rejected" },
      {
        onSuccess: () => toast.success(`${d.firmName} rejected`),
        onError: () => toast.error("Couldn't reject the distributor."),
      },
    );
  };

  const columns = useMemo<ColumnDef<Distributor>[]>(
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
              onClick={() => navigate({ to: "/distributors/create" })}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-amber-500/10 text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setPendingDelete(row.original)}
              disabled={deleteDistributor.isPending}
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
                  disabled={setStatus.isPending}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  title="Reject"
                  onClick={() => setPendingReject(row.original)}
                  disabled={setStatus.isPending}
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
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
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
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="text-sm text-foreground">{row.original.ownerName}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {row.original.ownerMobile}
            </p>
          </div>
        ),
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
    [deleteDistributor.isPending, setStatus.isPending],
  );

  return (
    <div>
      <PageHeader
        title="Distributor Management"
        description="Onboard and manage distributors — firm, coverage, business and financial details."
        actions={
          <Button
            className="cursor-pointer"
            onClick={() => navigate({ to: "/distributors/create" })}
          >
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
            onReset={() => setFilters(INITIAL_FILTERS)}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                No distributors found
              </p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters."
                  : "Add your first distributor to get started."}
              </p>
            </div>
            {!hasActiveFilters && (
              <Button
                className="cursor-pointer"
                onClick={() => navigate({ to: "/distributors/create" })}
              >
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
        loading={deleteDistributor.isPending}
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
        loading={setStatus.isPending}
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
        loading={setStatus.isPending}
        onConfirm={confirmReject}
      />
    </div>
  );
}
