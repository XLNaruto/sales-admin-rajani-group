import {
  keepPreviousData,
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
} from "./distributor-api";
import type {
  DistributorCreateInput,
  DistributorLifecycleStatus,
  DistributorListParams,
  DistributorUpdateInput,
} from "../types";

/**
 * GET /sales-incharge-admin/distributors — live, server-filtered list.
 * Params (page/page_size/search/status/sort) are forwarded verbatim to the
 * endpoint.
 */
export function useDistributors(params: DistributorListParams = {}) {
  return useQuery({
    queryKey: queryKeys.distributors.list(params as Record<string, unknown>),
    queryFn: () => fetchDistributors(params),
    placeholderData: keepPreviousData,
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

/** DELETE /sales-incharge-admin/distributors/{id} — remove, then refresh the list. */
export function useDeleteDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDistributor(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.distributors.all }),
  });
}
