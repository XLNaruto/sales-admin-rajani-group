import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  beatDetailSchema,
  beatListResponseSchema,
  type BeatRow,
} from '../schemas'
import type { BeatFormValues } from '../lib/beat-form'
import type { Beat, BeatInput, BeatListParams, BeatListResult } from '../types'

/** Map a validated API row to the client-facing (camelCase) `Beat`. */
function toBeat(row: BeatRow): Beat {
  return {
    id: row.id,
    beatName: row.beat_name,
    beatGrade: row.beat_grade,
    distributorId: row.distributor_id != null ? String(row.distributor_id) : '',
    distributorName: row.distributor_name ?? undefined,
    status: row.status,
  }
}

/** Translate camelCase params into the endpoint's snake_case query string. */
function toQuery(params: BeatListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.page != null) q.page = params.page
  if (params.pageSize != null) q.page_size = params.pageSize
  if (params.search) q.search = params.search
  if (params.grade) q.beat_grade = params.grade
  if (params.status) q.status = params.status
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
function toBody(values: BeatFormValues, status: Beat['status']) {
  return {
    beat_name: values.beatName.trim(),
    beat_grade: values.beatGrade,
    distributor_id: toId(values.distributorId),
    status,
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
    throw new Error(getApiErrorMessage(error, 'Failed to load beats.'))
  }
}

/** A loaded beat mapped for the edit form: form values, status, and the
 *  city/distributor labels so their (lazy) dropdowns can show the current
 *  selection before its page is fetched. */
export interface BeatEditRecord {
  id: string
  values: BeatFormValues
  status: Beat['status']
  distributorName: string | null
}

/** GET /sales-incharge-admin/beats/{id} — a single beat as form-ready values. */
export async function fetchBeat(id: string): Promise<BeatEditRecord> {
  try {
    const raw = await http.get<unknown>(endpoints.BEAT.GET(id))
    const r = beatDetailSchema.parse(raw)
    return {
      id: r.id,
      status: r.status,
      distributorName: r.distributor_name ?? null,
      values: {
        beatName: r.beat_name,
        beatGrade: r.beat_grade,
        distributorId: r.distributor_id != null ? String(r.distributor_id) : '',
      },
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load the beat.'))
  }
}

/** POST /sales-incharge-admin/beats — create a new beat (defaults to active). */
export async function createBeat(input: BeatInput): Promise<void> {
  try {
    await http.post<unknown>(endpoints.BEAT.CREATE, toBody(input, input.status))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to create the beat.'))
  }
}

/** PATCH /sales-incharge-admin/beats/{id} — update an existing beat. */
export async function updateBeat(id: string, input: BeatInput): Promise<void> {
  try {
    await http.patch<unknown>(endpoints.BEAT.UPDATE(id), toBody(input, input.status))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to update the beat.'))
  }
}

/** DELETE /sales-incharge-admin/beats/{id} — permanently remove a beat. */
export async function deleteBeat(id: string): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.BEAT.DELETE(id))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to delete the beat.'))
  }
}
