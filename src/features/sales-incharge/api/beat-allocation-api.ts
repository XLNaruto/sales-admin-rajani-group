import { z } from 'zod'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Beat, BeatGrade } from '@/features/beat-creation'

/* -------------------------------------------------------------------------- *
 * Beat allocation — list the beats allocated to / available for a sales
 * incharge, and add/remove allocations. The endpoint paths in
 * `endpoints.BEAT_ALLOCATION` are intentionally blank until the backend is
 * finalised: every call below guards on the path so the screen still renders
 * (list queries resolve to an empty page; mutations throw a clear error).
 * -------------------------------------------------------------------------- */

/** Query params for the two beat lists (page-based pagination + free search). */
export interface BeatAllocationListParams {
  page?: number
  pageSize?: number
  search?: string
}

/** One page of beats (client-facing) with its pagination metadata. */
export interface BeatAllocationListResult {
  items: Beat[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Tolerant row schema — mirrors the beats list envelope closely enough to map. */
const beatRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  beat_name: z.string(),
  beat_grade: z
    .enum(['urban', 'semi_urban', 'metro', 'non_metro', 'rural'])
    .catch('urban'),
  distributor_id: z.union([z.number(), z.string()]).nullish(),
  distributor_name: z.string().nullish(),
  status: z.enum(['active', 'inactive']).catch('active'),
})

const beatListResponseSchema = z.object({
  beats: z.array(beatRowSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_pages: z.number().optional(),
})

/** Map a validated raw row to the client-facing `Beat`. */
function toBeat(row: z.infer<typeof beatRowSchema>): Beat {
  return {
    id: row.id,
    beatName: row.beat_name,
    beatGrade: row.beat_grade as BeatGrade,
    distributorId: row.distributor_id != null ? String(row.distributor_id) : '',
    distributorName: row.distributor_name ?? undefined,
    status: row.status,
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: BeatAllocationListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  return q
}

/** An empty page — returned when the endpoint path isn't configured yet. */
const emptyResult: BeatAllocationListResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 0,
  totalPages: 1,
}

/** Shared GET + parse for both beat lists (allocated / available). */
async function fetchBeatPage(
  path: string,
  params: BeatAllocationListParams,
  fallbackMessage: string,
): Promise<BeatAllocationListResult> {
  // Endpoint not wired up yet → resolve to an empty page so the UI renders.
  if (!path) return emptyResult
  try {
    const raw = await http.get<unknown>(path, { params: toQuery(params) })
    const res = beatListResponseSchema.parse(raw)
    const items = res.beats.map(toBeat)
    return {
      items,
      total: res.total ?? items.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? items.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallbackMessage))
  }
}

/** GET the beats allocated to a sales incharge. */
export function fetchAllocatedBeats(
  inchargeId: string,
  params: BeatAllocationListParams = {},
): Promise<BeatAllocationListResult> {
  return fetchBeatPage(
    endpoints.BEAT_ALLOCATION.ALLOCATED(inchargeId),
    params,
    'Failed to load allocated beats.',
  )
}

/** GET the beats available to allocate to a sales incharge. */
export function fetchAvailableBeats(
  inchargeId: string,
  params: BeatAllocationListParams = {},
): Promise<BeatAllocationListResult> {
  return fetchBeatPage(
    endpoints.BEAT_ALLOCATION.AVAILABLE(inchargeId),
    params,
    'Failed to load available beats.',
  )
}

/** POST to allocate (add) one or more beats to a sales incharge. */
export async function allocateBeats(
  inchargeId: string,
  beatIds: string[],
): Promise<void> {
  const path = endpoints.BEAT_ALLOCATION.ALLOCATE(inchargeId)
  if (!path) throw new Error('Beat allocation endpoint is not configured yet.')
  try {
    await http.post<unknown>(path, { beat_ids: beatIds })
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to allocate the beat.'))
  }
}

/** DELETE to remove one allocated beat from a sales incharge. */
export async function removeAllocatedBeat(
  inchargeId: string,
  beatId: string,
): Promise<void> {
  const path = endpoints.BEAT_ALLOCATION.REMOVE(inchargeId, beatId)
  if (!path) throw new Error('Beat allocation endpoint is not configured yet.')
  try {
    await http.delete<unknown>(path)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to remove the beat.'))
  }
}
