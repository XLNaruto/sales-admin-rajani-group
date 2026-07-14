import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useDeleteSalesIncharge,
  useSalesIncharges,
} from "../api/use-sales-incharge";
import {
  INITIAL_FILTERS,
  type SalesmanFilters,
} from "../components/salesman-toolbar";
import type { SalesIncharge, SalesInchargeStatus } from "../types";

/**
 * Orchestrates the sales-incharge list screen: filter state, the live list
 * query (server-filtered), derived flags and navigation. The page consumes
 * this and only renders — no data/handler logic lives in the component.
 */
export function useSalesInchargeList() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<SalesmanFilters>(INITIAL_FILTERS);
  const patchFilters = (patch: Partial<SalesmanFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const resetFilters = () => setFilters(INITIAL_FILTERS);

  // Filters are applied server-side by the list endpoint.
  const { data, isLoading, isError } = useSalesIncharges({
    search: filters.search.trim() || undefined,
    status:
      filters.status !== "all"
        ? (filters.status as SalesInchargeStatus)
        : undefined,
    limit: 100,
  });

  const rows = data?.items ?? [];
  const hasActiveFilters = filters.search !== "" || filters.status !== "all";

  const goToCreate = () => navigate({ to: "/sales-incharge/create" });
  const goToEdit = () => navigate({ to: "/sales-incharge/create" });

  // Delete flow — confirm in a dialog, then DELETE the selected row.
  const deleteSalesIncharge = useDeleteSalesIncharge();
  const [pendingDelete, setPendingDelete] = useState<SalesIncharge | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteSalesIncharge.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.displayName} removed`);
        setPendingDelete(null);
      },
      onError: () => toast.error("Couldn't remove the sales incharge."),
    });
  };

  return {
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
    isDeleting: deleteSalesIncharge.isPending,
  };
}
