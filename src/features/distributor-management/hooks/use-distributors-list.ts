import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useDistributors,
  useDeleteDistributor,
  useSetDistributorStatus,
} from "../api/use-distributors";
import {
  INITIAL_FILTERS,
  type DistributorFilters,
} from "../components/distributor-toolbar";
import type { Distributor } from "../types";

/**
 * Orchestrates the distributor list screen: filter state, the list query,
 * derived rows/flags, the delete/approve/reject confirmation flow and
 * navigation. The page consumes this and only renders — no data/handler
 * logic lives in the component.
 */
export function useDistributorsList() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DistributorFilters>(INITIAL_FILTERS);
  const patchFilters = (patch: Partial<DistributorFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const resetFilters = () => setFilters(INITIAL_FILTERS);

  // search + status are applied server-side by the list endpoint. Firm type has
  // no server param, so it's filtered client-side over the returned rows.
  const { data, isLoading, isError } = useDistributors({
    search: filters.search.trim() || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    limit: 100,
  });

  const deleteDistributor = useDeleteDistributor();
  const setStatus = useSetDistributorStatus();

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (filters.firmType === "all") return items;
    return items.filter((d) => d.firmType === filters.firmType);
  }, [data, filters.firmType]);

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

  const goToCreate = () => navigate({ to: "/distributors/create" });
  const goToEdit = () => navigate({ to: "/distributors/create" });

  return {
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
    isDeleting: deleteDistributor.isPending,
    isSettingStatus: setStatus.isPending,
    goToCreate,
    goToEdit,
  };
}
