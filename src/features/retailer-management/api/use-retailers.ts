import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createRetailer,
  deleteRetailer,
  fetchRetailer,
  fetchRetailerDetail,
  fetchRetailers,
  setRetailerBeat,
  setRetailerStatus,
  updateRetailer,
  updateRetailerOnboarding,
} from './retailer-api'
import type {
  RetailerCreateInput,
  RetailerLifecycleStatus,
  RetailerListParams,
  RetailerOnboardingAction,
  RetailerUpdateInput,
} from '../types'

/**
 * GET /sales-incharge-admin/retailers — live, server-filtered list. Params
 * (page/page_size/search/status/sort) are forwarded verbatim to the endpoint.
 */
export function useRetailers(
  params: RetailerListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.retailers.list(params as Record<string, unknown>),
    queryFn: () => fetchRetailers(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/retailers — infinite ("All") variant. Loads one
 * batch of `pageSize` rows per page and appends the next batch as the list is
 * scrolled; drives the DataTable's infinite-scroll mode. `params` should NOT
 * include `page` (the hook owns paging) but may carry search/status/sort.
 */
export function useRetailersInfinite(
  params: Omit<RetailerListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.retailers.listInfinite(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => fetchRetailers({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/** GET /sales-incharge-admin/retailers/{id} — full record for the edit form. */
export function useRetailer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.retailers.detail(id ?? ''),
    queryFn: () => fetchRetailer(id as string),
    enabled: !!id,
  })
}

/**
 * GET /sales-incharge-admin/retailers/{id} — read-only, display-ready record
 * for the "view details" modal (camelCase, media URL resolved).
 */
export function useRetailerDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.retailers.detailView(id ?? ''),
    queryFn: () => fetchRetailerDetail(id as string),
    enabled: !!id,
  })
}

/** POST /sales-incharge-admin/retailers — presign + upload the photo, then create. */
export function useCreateRetailer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RetailerCreateInput) => createRetailer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.retailers.all }),
  })
}

/** PATCH /sales-incharge-admin/retailers/{id} — upload a new photo, then update. */
export function useUpdateRetailer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RetailerUpdateInput) => updateRetailer(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.retailers.all })
      qc.invalidateQueries({ queryKey: queryKeys.retailers.detail(input.id) })
    },
  })
}

/** PATCH /sales-incharge-admin/retailers/{id}/status — change status, then refresh. */
export function useSetRetailerStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RetailerLifecycleStatus }) =>
      setRetailerStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.retailers.all }),
  })
}

/**
 * PATCH /sales-incharge-admin/retailers/{id}/beat — allocate the outlet to a
 * beat (`null` unassigns), then refresh the list and that record's detail. Beats
 * are also invalidated since their retailer coverage changes.
 */
export function useSetRetailerBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, beatId }: { id: string; beatId: string | null }) =>
      setRetailerBeat(id, beatId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.retailers.all })
      qc.invalidateQueries({ queryKey: queryKeys.retailers.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.beats.all })
    },
  })
}

/** PATCH /sales-incharge-admin/retailers/{id}/onboarding — approve/reject, then refresh. */
export function useUpdateRetailerOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RetailerOnboardingAction }) =>
      updateRetailerOnboarding(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.retailers.all }),
  })
}

/** DELETE /sales-incharge-admin/retailers/{id} — remove, then refresh the list. */
export function useDeleteRetailer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRetailer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.retailers.all }),
  })
}
