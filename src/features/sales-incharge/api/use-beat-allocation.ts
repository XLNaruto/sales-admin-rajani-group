import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  allocateBeats,
  fetchAllocatedBeats,
  fetchAvailableBeats,
  removeAllocatedBeat,
  type BeatAllocationListParams,
} from './beat-allocation-api'

/** GET the beats allocated to a sales incharge — paged + searchable. */
export function useAllocatedBeats(
  inchargeId: string | undefined,
  params: BeatAllocationListParams = {},
) {
  return useQuery({
    queryKey: queryKeys.beatAllocation.allocated(
      inchargeId ?? '',
      params as Record<string, unknown>,
    ),
    queryFn: () => fetchAllocatedBeats(inchargeId as string, params),
    placeholderData: keepPreviousData,
    enabled: !!inchargeId,
  })
}

/** GET the beats available to allocate to a sales incharge — paged + searchable. */
export function useAvailableBeats(
  inchargeId: string | undefined,
  params: BeatAllocationListParams = {},
) {
  return useQuery({
    queryKey: queryKeys.beatAllocation.available(
      inchargeId ?? '',
      params as Record<string, unknown>,
    ),
    queryFn: () => fetchAvailableBeats(inchargeId as string, params),
    placeholderData: keepPreviousData,
    enabled: !!inchargeId,
  })
}

/** POST to allocate beats, then refresh both lists for this incharge. */
export function useAllocateBeats(inchargeId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (beatIds: string[]) => allocateBeats(inchargeId as string, beatIds),
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
