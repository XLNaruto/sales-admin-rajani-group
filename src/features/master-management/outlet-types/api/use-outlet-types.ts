import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createOutletType,
  deleteOutletType,
  fetchOutletType,
  fetchOutletTypes,
  updateOutletType,
} from './outlet-type-api'
import type { OutletTypeInput, OutletTypeListParams } from '../types'

/** GET /sales-incharge-admin/outlet-types — live, server-filtered list. */
export function useOutletTypeList(
  params: OutletTypeListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.masters.outletTypes(params as Record<string, unknown>),
    queryFn: () => fetchOutletTypes(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/outlet-types — infinite ("All") variant. Loads one
 * batch per page and appends the next as the list is scrolled; drives the
 * DataTable's infinite-scroll mode. `params` should NOT include `page` (the
 * hook owns paging) but may carry search/sort.
 */
export function useOutletTypesInfinite(
  params: Omit<OutletTypeListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.masters.outletTypesInfinite(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => fetchOutletTypes({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * The master as a dropdown source — every type in one page, sorted by name.
 * This is what the retailer form's "Outlet Type" select consumes; it rarely
 * changes, so it's cached for 5 minutes.
 */
export function useOutletTypes(params: OutletTypeListParams = {}) {
  return useQuery({
    queryKey: queryKeys.masters.outletTypes(params as Record<string, unknown>),
    // The master is small enough to fetch in one page (`page_size` caps at 100).
    queryFn: () =>
      fetchOutletTypes({
        pageSize: 100,
        sortBy: 'type_name',
        sortOrder: 'asc',
        ...params,
      }),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * GET /sales-incharge-admin/outlet-types/{id} — a single outlet type. The list
 * screen seeds its edit form from the row it already holds, so this is for
 * callers that arrive with only an id.
 */
export function useOutletType(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.masters.outletType(id ?? 0),
    queryFn: () => fetchOutletType(id as number),
    enabled: id != null,
  })
}

/** POST /sales-incharge-admin/outlet-types — create, then refresh the list. */
export function useCreateOutletType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: OutletTypeInput) => createOutletType(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.all }),
  })
}

/** PATCH /sales-incharge-admin/outlet-types/{id} — update, then refresh. */
export function useUpdateOutletType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: OutletTypeInput }) =>
      updateOutletType(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.all }),
  })
}

/** DELETE /sales-incharge-admin/outlet-types/{id} — remove, then refresh. */
export function useDeleteOutletType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteOutletType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.masters.all }),
  })
}
