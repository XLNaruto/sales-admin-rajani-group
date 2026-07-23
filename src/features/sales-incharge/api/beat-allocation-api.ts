import { z } from 'zod'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import type { Beat, BeatGrade } from '@/features/beat-creation'

/* -------------------------------------------------------------------------- *
 * Beat allocation — list the beats allocated to / available for a sales
 * incharge, and add/remove allocations. Backed by
 * GET  …/sales-incharges/{id}/beats            (allocated)
 * GET  …/sales-incharges/{id}/available-beats  (available to allocate)
 * POST …/sales-incharges/{id}/beats { beat_id } (allocate one)
 * DEL  …/sales-incharges/{id}/beats/{beat_id}   (de-allocate one)
 * -------------------------------------------------------------------------- */

/** Query params shared by the two beat lists (page-based pagination + filters). */
export interface BeatAllocationListParams {
  page?: number
  pageSize?: number
  search?: string
  /** Filter by beat grade. */
  grade?: string
  /** Filter to a single distributor's beats. */
  distributorId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** One page of beats (client-facing) with its pagination metadata. */
export interface BeatAllocationListResult {
  items: Beat[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * A row from the allocated / available beat lists. The endpoints return the
 * beat's core fields (`name`/`grade`) plus its resolved distributor — no
 * lifecycle status (only allocatable beats are ever listed).
 */
const beatRowSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  name: z.string(),
  grade: z.string().nullish(),
  distributor_id: z.union([z.number(), z.string()]).nullish(),
  distributor_name: z.string().nullish(),
  city_id: z.union([z.number(), z.string()]).nullish(),
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
    beatName: row.name,
    // `grade` is a free-form string server-side; the display helper falls back
    // to the raw value for anything outside the known grade set.
    beatGrade: (row.grade ?? '') as BeatGrade,
    distributorId: row.distributor_id != null ? String(row.distributor_id) : '',
    distributorName: row.distributor_name ?? undefined,
    // These lists only ever surface active, allocatable beats.
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: BeatAllocationListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.grade) q.grade = params.grade
  if (params.distributorId != null) q.distributor_id = params.distributorId
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** Shared GET + parse for both beat lists (allocated / available). */
async function fetchBeatPage(
  path: string,
  params: BeatAllocationListParams,
  fallbackMessage: string,
): Promise<BeatAllocationListResult> {
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
    throw asApiError(error, fallbackMessage)
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

/** POST to allocate (add) one beat to a sales incharge. */
export async function allocateBeat(
  inchargeId: string,
  beatId: string,
): Promise<void> {
  try {
    await http.post<unknown>(endpoints.BEAT_ALLOCATION.ALLOCATE(inchargeId), {
      beat_id: Number(beatId),
    })
  } catch (error) {
    throw asApiError(error, 'Failed to allocate the beat.')
  }
}

/** DELETE to de-allocate one beat from a sales incharge. */
export async function removeAllocatedBeat(
  inchargeId: string,
  beatId: string,
): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.BEAT_ALLOCATION.REMOVE(inchargeId, beatId))
  } catch (error) {
    throw asApiError(error, 'Failed to remove the beat.')
  }
}
