import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createBeat,
  deleteBeat,
  fetchBeat,
  fetchBeatOptions,
  fetchBeats,
  resolveNearestBeat,
  updateBeat,
} from './beat-api'
import type { BeatInput, BeatListParams, BeatOptionsParams } from '../types'

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

/**
 * GET /sales-incharge-admin/beats/options — scroll-lazy beat dropdown feed for
 * forms on other screens. Always infinite: a beat select pages as it's scrolled,
 * and the master outgrows one page.
 */
export function useBeatOptionsInfinite(
  params: Omit<BeatOptionsParams, 'page'> = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.beats.options(params as Record<string, unknown>),
    queryFn: ({ pageParam }) => fetchBeatOptions({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: options.enabled ?? true,
  })
}

/**
 * GET /sales-incharge-admin/beats/nearest — resolve the beat nearest a pinned
 * coordinate. Idles until both coordinates are present. The answer only changes
 * when the pin moves, so it's cached against the coordinate itself and stays
 * fresh for the length of a form session rather than refetching on every focus.
 */
export function useNearestBeat(
  latitude: string | undefined,
  longitude: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const hasCoords = !!latitude && !!longitude
  return useQuery({
    queryKey: queryKeys.beats.nearest(latitude ?? '', longitude ?? ''),
    queryFn: () => resolveNearestBeat(latitude as string, longitude as string),
    enabled: hasCoords && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    // A failed lookup just means "no suggestion" — don't hammer the endpoint
    // while the user drags the pin around.
    retry: false,
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
