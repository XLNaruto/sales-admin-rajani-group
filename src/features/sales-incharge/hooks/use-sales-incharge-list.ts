import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { encryptParams } from "@/lib/crypto";
import {
  useDeleteSalesIncharge,
  useSalesIncharges,
  useSetSalesInchargeStatus,
} from "../api/use-sales-incharge";
import {
  INITIAL_FILTERS,
  type SalesmanFilters,
} from "../components/salesman-toolbar";
import type {
  SalesIncharge,
  SalesInchargeSortBy,
  SalesInchargeStatus,
} from "../types";

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

  // Filters, sort and pagination are all applied server-side by the endpoint.
  const { data, isLoading, isError } = useSalesIncharges({
    search: filters.search.trim() || undefined,
    status:
      filters.status !== "all"
        ? (filters.status as SalesInchargeStatus)
        : undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy,
    sortOrder: sortBy ? (sort.desc ? "desc" : "asc") : undefined,
  });

  const rows = data?.items ?? [];
  const rowCount = data?.total ?? 0;
  const hasActiveFilters = filters.search !== "" || filters.status !== "all";

  const goToCreate = () => navigate({ to: "/sales-incharge/create" });
  // Edit reuses the create page; the raw id is encrypted into `?data=` so it's
  // never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: "/sales-incharge/create",
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
    isLoading,
    isError,
    hasActiveFilters,
    goToCreate,
    goToEdit,
    changeStatus,
    isSettingStatus: setStatus.isPending,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteSalesIncharge.isPending,
  };
}
