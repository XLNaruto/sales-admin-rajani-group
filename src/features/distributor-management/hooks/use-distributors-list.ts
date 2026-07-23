import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { encryptParams } from "@/lib/crypto";
import { errorStatus, getApiErrorMessage } from "@/lib/api-error";
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from "@/components/data-table";
import {
  useDistributors,
  useDistributorsInfinite,
  useDeleteDistributor,
  useSetDistributorStatus,
  useUpdateDistributorOnboarding,
} from "../api/use-distributors";
import type { DistributorFilters } from "../components/distributor-toolbar";
import type {
  Distributor,
  DistributorLifecycleStatus,
  DistributorSortBy,
} from "../types";

/** Map a table column id → the list endpoint's `sort_by` value. */
const SORT_BY_COLUMN: Record<string, DistributorSortBy> = {
  firmName: "firm_name",
  owner: "owner_name",
  city: "city_id",
  status: "status",
};

/** Empty filter state — also used to reset the toolbar. */
const INITIAL_FILTERS: DistributorFilters = {
  search: "",
  firmType: "all",
  status: "all",
};

/**
 * Orchestrates the distributor list screen: filter state, the list query,
 * derived rows/flags, the delete/approve/reject confirmation flow and
 * navigation. The page consumes this and only renders — no data/handler
 * logic lives in the component.
 */
export function useDistributorsList() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<DistributorFilters>(INITIAL_FILTERS);
  // Server-side pagination + sorting state (mirrors TanStack Table's shapes).
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Any filter/sort change resets to the first page — otherwise you could land
  // on a page that no longer exists for the narrower result set.
  const patchFilters = (patch: Partial<DistributorFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };
  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };
  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const sort = sorting[0];
  const sortBy = sort ? SORT_BY_COLUMN[sort.id] : undefined;

  // "All" selected → lazy/infinite mode; otherwise classic page-by-page.
  const isAll = pagination.pageSize === ALL_PAGE_SIZE;

  // Search, status and firm type are all applied server-side by the endpoint.
  const baseParams = {
    search: filters.search.trim() || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    firmType: filters.firmType !== "all" ? filters.firmType : undefined,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? "desc" : "asc") : undefined,
  } as const;

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError } = useDistributors(
    {
      ...baseParams,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !isAll },
  );

  const infinite = useDistributorsInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  );

  const deleteDistributor = useDeleteDistributor();
  const setStatus = useSetDistributorStatus();
  const setOnboarding = useUpdateDistributorOnboarding();

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? [];
  const infiniteTotal =
    infinite.data?.pages.at(-1)?.total ?? infiniteRows.length;

  const rows = isAll ? infiniteRows : (data?.items ?? []);
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0);
  const listIsLoading = isAll ? infinite.isLoading : isLoading;
  const listIsError = isAll ? infinite.isError : isError;

  const hasActiveFilters =
    filters.search !== "" ||
    filters.firmType !== "all" ||
    filters.status !== "all";

  const [pendingDelete, setPendingDelete] = useState<Distributor | null>(null);
  const [pendingApprove, setPendingApprove] = useState<Distributor | null>(
    null,
  );
  const [pendingReject, setPendingReject] = useState<Distributor | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Inline status change from the list toggle — PATCH the record's status.
  const changeStatus = (id: string, status: DistributorLifecycleStatus) => {
    setStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: () => toast.error("Couldn't update the status."),
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const d = pendingDelete;
    deleteDistributor.mutate(d.id, {
      onSuccess: () => {
        toast.success(`${d.firmName} removed`);
        setPendingDelete(null);
      },
      onError: (error) => {
        // A 409 means a business rule blocks the delete — most commonly the
        // distributor still owns beats (DISTRIBUTOR_HAS_ACTIVE_BEATS). Surface
        // the server's explanation instead of a generic failure, and keep the
        // dialog open so the message stays visible next to the action.
        if (errorStatus(error) === 409) {
          toast.error(`Can't remove ${d.firmName}`, {
            description: getApiErrorMessage(error),
          });
          return;
        }
        toast.error("Couldn't remove the distributor.");
      },
    });
  };

  const confirmApprove = () => {
    if (!pendingApprove) return;
    const d = pendingApprove;
    setOnboarding.mutate(
      { id: d.id, action: "approve" },
      {
        onSuccess: () => {
          toast.success(`${d.firmName} approved`);
          setPendingApprove(null);
        },
        onError: () => toast.error("Couldn't approve the distributor."),
      },
    );
  };

  const confirmReject = () => {
    if (!pendingReject) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    const d = pendingReject;
    setOnboarding.mutate(
      { id: d.id, action: "reject", reason },
      {
        onSuccess: () => {
          toast.success(`${d.firmName} rejected`);
          setPendingReject(null);
          setRejectReason("");
        },
        onError: () => toast.error("Couldn't reject the distributor."),
      },
    );
  };

  const goToCreate = () => navigate({ to: "/distributors/create" });
  // Edit reuses the create page; the raw id is encrypted into `?data=` so it's
  // never exposed in the address bar.
  const goToEdit = (id: string) =>
    navigate({
      to: "/distributors/create",
      search: { data: encryptParams({ id }) },
    });

  return {
    filters,
    patchFilters,
    resetFilters,
    rows,
    rowCount,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    isLoading: listIsLoading,
    isError: listIsError,
    // Infinite ("All") scroll wiring — no-op unless the "All" page size is set.
    onLoadMore: isAll ? () => infinite.fetchNextPage() : undefined,
    hasMore: isAll ? infinite.hasNextPage : false,
    isFetchingMore: isAll ? infinite.isFetchingNextPage : false,
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
    isDeleting: deleteDistributor.isPending,
    isSettingStatus: setStatus.isPending,
    isSettingOnboarding: setOnboarding.isPending,
    goToCreate,
    goToEdit,
  };
}
