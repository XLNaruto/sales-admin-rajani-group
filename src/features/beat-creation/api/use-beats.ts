import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createBeat, deleteBeat, fetchBeat, fetchBeats, updateBeat } from './beat-api'
import type { BeatInput, BeatListParams } from '../types'

/** GET /sales-incharge-admin/beats — live, server-filtered list. */
export function useBeats(params: BeatListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.beats.list(params as Record<string, unknown>),
    queryFn: () => fetchBeats(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/beats — infinite ("All") variant. Loads one batch of
 * `pageSize` rows per page and appends the next batch as the list is scrolled;
 * drives the DataTable's infinite-scroll mode. `params` should NOT include
 * `page` (the hook owns paging) but may carry search/grade/sort.
 */
export function useBeatsInfinite(
  params: Omit<BeatListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.beats.listInfinite(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => fetchBeats({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/** GET /sales-incharge-admin/beats/{id} — a single beat for the edit form. */
export function useBeat(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.beats.detail(id ?? ''),
    queryFn: () => fetchBeat(id as string),
    enabled: !!id,
  })
}

/** POST /sales-incharge-admin/beats — create, then refresh the list. */
export function useCreateBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BeatInput) => createBeat(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beats.all }),
  })
}

/** PATCH /sales-incharge-admin/beats/{id} — update, then refresh the list. */
export function useUpdateBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BeatInput }) => updateBeat(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.beats.all })
      qc.invalidateQueries({ queryKey: queryKeys.beats.detail(id) })
    },
  })
}

/** DELETE /sales-incharge-admin/beats/{id} — remove, then refresh the list. */
export function useDeleteBeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBeat(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.beats.all }),
  })
}
