import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createDistributor,
  deleteDistributor,
  fetchDistributor,
  fetchDistributorDetail,
  fetchDistributors,
  setDistributorStatus,
  updateDistributor,
  updateDistributorOnboarding,
} from "./distributor-api";
import {
  fetchProductDivisions,
  type ProductDivisionListParams,
} from "./product-division-api";
import type {
  DistributorCreateInput,
  DistributorLifecycleStatus,
  DistributorListParams,
  DistributorOnboardingAction,
  DistributorUpdateInput,
} from "../types";

/**
 * GET /sales-incharge-admin/distributors — live, server-filtered list.
 * Params (page/page_size/search/status/sort) are forwarded verbatim to the
 * endpoint.
 */
export function useDistributors(
  params: DistributorListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.distributors.list(params as Record<string, unknown>),
    queryFn: () => fetchDistributors(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/**
 * GET /sales-incharge-admin/distributors — infinite ("All") variant. Loads one
 * batch of `pageSize` rows per page and appends the next batch as the list is
 * scrolled; drives the DataTable's infinite-scroll mode. `params` should NOT
 * include `page` (the hook owns paging) but may carry search/status/sort.
 */
export function useDistributorsInfinite(
  params: Omit<DistributorListParams, "page"> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.distributors.listInfinite(
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) =>
      fetchDistributors({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  });
}

/**
 * GET /sales-incharge-admin/product-divisions — the product-division master used
 * to populate the distributor form's "Product Divisions" multi-select. Rarely
 * changes, so it's cached for 5 minutes; a large page_size fetches the full
 * (small) list in one go.
 */
export function useProductDivisions(params: ProductDivisionListParams = {}) {
  return useQuery({
    queryKey: queryKeys.distributors.productDivisions(
      params as Record<string, unknown>,
    ),
    queryFn: () => fetchProductDivisions({ pageSize: 100, sortBy: "name", ...params }),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /sales-incharge-admin/distributors/{id} — full record for the edit form. */
export function useDistributor(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.distributors.detail(id ?? ""),
    queryFn: () => fetchDistributor(id as string),
    enabled: !!id,
  });
}

/**
 * GET /sales-incharge-admin/distributors/{id} — read-only, display-ready record
 * for the "view details" modal (camelCase, media URLs resolved).
 */
export function useDistributorDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.distributors.detailView(id ?? ""),
    queryFn: () => fetchDistributorDetail(id as string),
    enabled: !!id,
  });
}

/** POST /sales-incharge-admin/distributors — presign + upload images, then create. */
export function useCreateDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DistributorCreateInput) => createDistributor(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}

/** PATCH /sales-incharge-admin/distributors/{id} — upload new images, then update. */
export function useUpdateDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DistributorUpdateInput) => updateDistributor(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all });
      qc.invalidateQueries({
        queryKey: queryKeys.distributors.detail(input.id),
      });
    },
  });
}

/** PATCH /sales-incharge-admin/distributors/{id}/status — change status, then refresh. */
export function useSetDistributorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: DistributorLifecycleStatus;
    }) => setDistributorStatus(id, status),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}

/** PATCH /sales-incharge-admin/distributors/{id}/onboarding — approve/reject, then refresh. */
export function useUpdateDistributorOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: DistributorOnboardingAction;
      reason?: string;
    }) => updateDistributorOnboarding(id, action, reason),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}

/** DELETE /sales-incharge-admin/distributors/{id} — remove, then refresh the list. */
export function useDeleteDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDistributor(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}
