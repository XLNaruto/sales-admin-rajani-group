import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import {
  beatDetailSchema,
  beatListResponseSchema,
  beatOptionsResponseSchema,
  nearestBeatResponseSchema,
  type BeatRow,
} from '../schemas'
import type { BeatFormValues } from '../lib/beat-form'
import type {
  Beat,
  BeatDistributor,
  BeatInput,
  BeatListParams,
  BeatListResult,
  BeatOptionsParams,
  BeatOptionsResult,
  NearestBeat,
} from '../types'

/**
 * Normalise the row's distributor shape — expanded `distributors` objects,
 * parallel `distributor_ids`/`distributor_names` arrays, or the legacy single
 * `distributor_id` — into one list. Labels fall back to the id.
 */
function toDistributors(row: BeatRow): BeatDistributor[] {
  if (row.distributors?.length) {
    return row.distributors
      .map((d) => {
        const id = d.distributor_id ?? d.id
        return {
          id: id != null ? String(id) : '',
          name: d.firm_name ?? d.name ?? d.distributor_name ?? (id != null ? String(id) : ''),
        }
      })
      .filter((d) => d.id !== '')
  }
  if (row.distributor_ids?.length) {
    return row.distributor_ids.map((id, i) => ({
      id: String(id),
      name: row.distributor_names?.[i] ?? String(id),
    }))
  }
  if (row.distributor_id != null) {
    const id = String(row.distributor_id)
    return [{ id, name: row.distributor_name ?? id }]
  }
  return []
}

/** Map a validated API row to the client-facing (camelCase) `Beat`. */
function toBeat(row: BeatRow): Beat {
  return {
    id: row.id,
    beatName: row.name,
    beatGrade: row.grade ?? '',
    distributors: toDistributors(row),
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: BeatListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.grade) q.grade = params.grade
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.sortOrder) q.sort_order = params.sortOrder
  return q
}

/** Parse an id-bearing string ("3") to a number, or pass the raw string through. */
function toId(value: string): number | string {
  const n = Number(value)
  return Number.isFinite(n) && value.trim() !== '' ? n : value
}

/** Build the create/update request body from the form values. */
function toBody(values: BeatFormValues) {
  return {
    name: values.beatName.trim(),
    grade: values.beatGrade,
    distributor_ids: values.distributorIds.map(toId),
  }
}

/** GET /sales-incharge-admin/beats — one page of the server-filtered list. */
export async function fetchBeats(params: BeatListParams = {}): Promise<BeatListResult> {
  try {
    const raw = await http.get<unknown>(endpoints.BEAT.LIST, { params: toQuery(params) })
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
    throw asApiError(error, 'Failed to load beats.')
  }
}

/** A loaded beat mapped for the edit form: form values plus the selected
 *  distributors' labels so its (lazy) dropdown can show the current selection
 *  before the pages they live on are fetched. */
export interface BeatEditRecord {
  id: string
  values: BeatFormValues
  distributors: BeatDistributor[]
}

/** Known grades the form offers — anything else falls back to the default. */
const KNOWN_GRADES = ['local', 'rural'] as const

/** Coerce the API's free-form grade to a form grade (defaults to `local`). */
function toFormGrade(grade?: string | null): BeatFormValues['beatGrade'] {
  return (KNOWN_GRADES as readonly string[]).includes(grade ?? '')
    ? (grade as BeatFormValues['beatGrade'])
    : 'local'
}

/** GET /sales-incharge-admin/beats/{id} — a single beat as form-ready values. */
export async function fetchBeat(id: string): Promise<BeatEditRecord> {
  try {
    const raw = await http.get<unknown>(endpoints.BEAT.GET(id))
    const r = beatDetailSchema.parse(raw)
    const distributors = toDistributors(r)
    return {
      id: r.id,
      distributors,
      values: {
        beatName: r.name,
        beatGrade: toFormGrade(r.grade),
        distributorIds: distributors.map((d) => d.id),
      },
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the beat.')
  }
}

/**
 * GET /sales-incharge-admin/beats/options — one page of `id` + name rows for a
 * beat dropdown on another screen. Separate from `fetchBeats` because this one
 * only needs `beat:lookup`, so a form can fill its beat select without holding
 * access to the Beat Master screen.
 */
export async function fetchBeatOptions(
  params: BeatOptionsParams = {},
): Promise<BeatOptionsResult> {
  try {
    const q: Record<string, string | number> = {}
    if (params.page != null) q.page = params.page
    if (params.pageSize != null) q.page_size = params.pageSize
    if (params.search) q.search = params.search
    const raw = await http.get<unknown>(endpoints.BEAT.OPTIONS, { params: q })
    const res = beatOptionsResponseSchema.parse(raw)
    return {
      items: res.beats,
      total: res.total ?? res.beats.length,
      page: res.page ?? 1,
      pageSize: res.page_size ?? res.beats.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load beats.')
  }
}

/**
 * GET /sales-incharge-admin/beats/nearest — the beat nearest a coordinate,
 * decided by a majority vote across the nearest geo-tagged outlets (not a
 * centroid: a beat is a corridor, and a corridor's centroid can land in a field).
 *
 * An unresolved answer comes back as `resolved: false` with a null beat rather
 * than an error, and is passed through as-is — the caller offers a suggestion,
 * it never invents one.
 */
export async function resolveNearestBeat(
  latitude: string | number,
  longitude: string | number,
): Promise<NearestBeat> {
  try {
    const raw = await http.get<unknown>(endpoints.BEAT.NEAREST, {
      params: { latitude, longitude },
    })
    const r = nearestBeatResponseSchema.parse(raw)
    return {
      resolved: r.resolved,
      beatId: r.beat_id != null ? String(r.beat_id) : null,
      beatName: r.beat_name ?? null,
      distanceMetres: r.distance_metres ?? null,
      votes: r.votes ?? 0,
      considered: r.considered ?? 0,
      source: r.source,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to find the nearest beat.')
  }
}

/** POST /sales-incharge-admin/beats — create a new beat. */
export async function createBeat(input: BeatInput): Promise<void> {
  try {
    await http.post<unknown>(endpoints.BEAT.CREATE, toBody(input))
  } catch (error) {
    throw asApiError(error, 'Failed to create the beat.')
  }
}

/** PATCH /sales-incharge-admin/beats/{id} — update an existing beat. */
export async function updateBeat(id: string, input: BeatInput): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.BEAT.UPDATE(id), toBody(input))
  } catch (error) {
    throw asApiError(error, 'Failed to update the beat.')
  }
}

/** DELETE /sales-incharge-admin/beats/{id} — permanently remove a beat. */
export async function deleteBeat(id: string): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.BEAT.DELETE(id))
  } catch (error) {
    throw asApiError(error, 'Failed to delete the beat.')
  }
}
