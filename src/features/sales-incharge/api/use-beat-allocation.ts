import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  allocateBeat,
  fetchAllocatedBeats,
  fetchAvailableBeats,
  removeAllocatedBeat,
  type BeatAllocationListParams,
} from './beat-allocation-api'

/** GET the beats allocated to a sales incharge — paged + searchable. */
export function useAllocatedBeats(
  inchargeId: string | undefined,
  params: BeatAllocationListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.beatAllocation.allocated(
      inchargeId ?? '',
      params as Record<string, unknown>,
    ),
    queryFn: () => fetchAllocatedBeats(inchargeId as string, params),
    placeholderData: keepPreviousData,
    enabled: !!inchargeId && (options.enabled ?? true),
  })
}

/** GET the beats available to allocate to a sales incharge — paged + searchable. */
export function useAvailableBeats(
  inchargeId: string | undefined,
  params: BeatAllocationListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.beatAllocation.available(
      inchargeId ?? '',
      params as Record<string, unknown>,
    ),
    queryFn: () => fetchAvailableBeats(inchargeId as string, params),
    placeholderData: keepPreviousData,
    enabled: !!inchargeId && (options.enabled ?? true),
  })
}

/**
 * Infinite ("All") variants of the two lists. One batch of `pageSize` rows per
 * page, appended as the panel is scrolled; drives the DataTable's infinite-
 * scroll mode. `params` must NOT carry `page` (the hook owns paging).
 */
export function useAllocatedBeatsInfinite(
  inchargeId: string | undefined,
  params: Omit<BeatAllocationListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.beatAllocation.allocatedInfinite(
      inchargeId ?? '',
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) =>
      fetchAllocatedBeats(inchargeId as string, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!inchargeId && (options.enabled ?? true),
  })
}

export function useAvailableBeatsInfinite(
  inchargeId: string | undefined,
  params: Omit<BeatAllocationListParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.beatAllocation.availableInfinite(
      inchargeId ?? '',
      params as Record<string, unknown>,
    ),
    queryFn: ({ pageParam }) =>
      fetchAvailableBeats(inchargeId as string, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!inchargeId && (options.enabled ?? true),
  })
}

/** POST to allocate one beat, then refresh both lists for this incharge. */
export function useAllocateBeat(inchargeId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (beatId: string) => allocateBeat(inchargeId as string, beatId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.beatAllocation.all }),
  })
}

/** DELETE an allocated beat, then refresh both lists for this incharge. */
export function useRemoveAllocatedBeat(inchargeId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (beatId: string) => removeAllocatedBeat(inchargeId as string, beatId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.beatAllocation.all }),
  })
}
