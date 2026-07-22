import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { encryptParams } from "@/lib/crypto";
import { ALL_PAGE_SIZE, INFINITE_BATCH_SIZE } from "@/components/data-table";
import {
  useDeleteSalesIncharge,
  useSalesIncharges,
  useSalesInchargesInfinite,
  useSetSalesInchargeStatus,
} from "../api/use-sales-incharge";
import type { SalesmanFilters } from "../components/salesman-toolbar";
import type {
  SalesIncharge,
  SalesInchargeSortBy,
  SalesInchargeStatus,
} from "../types";

/** Empty filter state — also used to reset the toolbar. */
const INITIAL_FILTERS: SalesmanFilters = { search: "", status: "all" };

/** Map a table column id → the list endpoint's `sort_by` value. */
const SORT_BY_COLUMN: Record<string, SalesInchargeSortBy> = {
  displayName: "display_name",
  employeeCode: "employee_code",
  designation: "designation_id",
  territory: "territory",
  dateOfJoining: "date_of_joining",
};

/**
 * Orchestrates the sales-incharge list screen: filter state, the live list
 * query (server-filtered), derived flags and navigation. The page consumes
 * this and only renders — no data/handler logic lives in the component.
 */
export function useSalesInchargeList() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<SalesmanFilters>(INITIAL_FILTERS);
  // Server-side pagination + sorting state (mirrors TanStack Table's shapes).
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Any filter/sort change resets to the first page — otherwise you could land
  // on a page that no longer exists for the narrower result set.
  const patchFilters = (patch: Partial<SalesmanFilters>) => {
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

  // Shared server-side filter/sort params (page/size differ per mode).
  const baseParams = {
    search: filters.search.trim() || undefined,
    status:
      filters.status !== "all"
        ? (filters.status as SalesInchargeStatus)
        : undefined,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? "desc" : "asc") : undefined,
  } as const;

  // Only one of the two queries is enabled at a time (based on `isAll`).
  const { data, isLoading, isError } = useSalesIncharges(
    {
      ...baseParams,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !isAll },
  );

  const infinite = useSalesInchargesInfinite(
    { ...baseParams, pageSize: INFINITE_BATCH_SIZE },
    { enabled: isAll },
  );

  const infiniteRows = infinite.data?.pages.flatMap((p) => p.items) ?? [];
  const infiniteTotal =
    infinite.data?.pages.at(-1)?.total ?? infiniteRows.length;

  const rows = isAll ? infiniteRows : (data?.items ?? []);
  const rowCount = isAll ? infiniteTotal : (data?.total ?? 0);
  const listIsLoading = isAll ? infinite.isLoading : isLoading;
  const listIsError = isAll ? infinite.isError : isError;
  const hasActiveFilters = filters.search !== "" || filters.status !== "all";

  const goToCreate = () => navigate({ to: "/sales-incharge/create" });
  // Edit reuses the create page; the raw id is encrypted into `?data=` so it's
  // never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: "/sales-incharge/create",
      search: { data: encryptParams({ id }) },
    });
  // Beat allocation reuses the same encrypted-id token pattern as edit.
  const goToBeatAllocation = (id: number) =>
    navigate({
      to: "/sales-incharge/beat-allocation",
      search: { data: encryptParams({ id }) },
    });

  // Inline status change — PUT the record with the new status (all other fields
  // preserved). Refetch on success keeps the row's badge in sync.
  const setStatus = useSetSalesInchargeStatus();
  const changeStatus = (id: number, status: SalesInchargeStatus) => {
    setStatus.mutate(
      { id, status },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: () => toast.error("Couldn't update the status."),
      },
    );
  };

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
    goToCreate,
    goToEdit,
    goToBeatAllocation,
    changeStatus,
    isSettingStatus: setStatus.isPending,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteSalesIncharge.isPending,
  };
}
