/**
 * Location-tracking fetchers — the admin's read of the GPS breadcrumb ledger.
 *
 * Two reads, both read-only: the whole team's latest fix on a day
 * (`/locations/live`) and one rep's entire day (`/locations/trail`). The ledger
 * is append-only and written solely by the mobile app; there is no create,
 * update or delete on this surface.
 *
 * Coordinates arrive as strings and are kept as strings — see
 * `lib/location-format.ts` for why, and for where they become numbers.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { boolParam } from '../lib/location-format'
import {
  fleetResponseSchema,
  trailResponseSchema,
  type FleetFixRow,
  type TrailResponse,
} from '../schemas'
import type { FleetFix, FleetParams, FleetResult, RepStatus, RepTrail } from '../types'

const STATUSES: RepStatus[] = ['active', 'invited', 'suspended', 'inactive']

function toStatus(value: string | null | undefined): RepStatus {
  return STATUSES.includes(value as RepStatus) ? (value as RepStatus) : 'inactive'
}

/**
 * One row of the fleet.
 *
 * `hasFix` is the only thing derived here: a rep who never reported comes back
 * with both coordinates null, and every screen needs that as a first-class state
 * rather than a null-check repeated at each render site. Nothing else is
 * recomputed — `is_stale` and `last_seen_minutes_ago` are stamped server-side per
 * response, so a stale response shows stale numbers until the next poll, which
 * is the honest thing for it to show.
 */
function toFix(row: FleetFixRow): FleetFix {
  const hasFix = row.latitude != null && row.longitude != null
  return {
    salesInchargeId: row.sales_incharge_id,
    salesInchargeName: row.sales_incharge_name ?? 'Unnamed rep',
    employeeCode: row.employee_code ?? null,
    status: toStatus(row.status),
    latitude: row.latitude,
    longitude: row.longitude,
    beatId: row.beat_id,
    beatName: row.beat_name ?? null,
    isFakeLocation: row.is_fake_location,
    hasFakeLocation: row.has_fake_location || row.is_fake_location,
    fakeLocationCount: row.fake_location_count,
    recordedAt: row.recorded_at ?? null,
    lastSeenMinutesAgo: row.last_seen_minutes_ago,
    isStale: row.is_stale,
    hasFix,
  }
}

/**
 * GET /locations/live — every rep in the selected company, each with their most
 * recent fix on `tracked_date`.
 *
 * Two things about the envelope that the callers depend on:
 *
 *  - `total` counts **reps**, not fixes. It will exceed the number of markers
 *    the map can draw, and that is correct.
 *  - `beat_id`, `only_stale` and `only_fake` filter on properties of the latest
 *    fix, which the server applies *after* paginating the rep list. A page can
 *    therefore come back short or empty while `total_pages` still reports more
 *    pages — so nothing here stops paginating on a short page, and no caller may
 *    compute a total from the array's length.
 */
export async function fetchFleetLocations(params: FleetParams): Promise<FleetResult> {
  try {
    const raw = await http.get<unknown>(endpoints.LOCATION_TRACKING.LIVE, {
      params: {
        page: params.page,
        page_size: params.pageSize,
        tracked_date: params.trackedDate,
        search: params.search,
        status: params.status,
        beat_id: params.beatId ? Number(params.beatId) : undefined,
        // Strict booleans: the literal string, or the param omitted entirely.
        only_stale: boolParam(params.onlyStale),
        only_fake: boolParam(params.onlyFake),
        sort_by: params.sortBy,
        sort_order: params.sortBy ? (params.sortOrder ?? 'desc') : undefined,
      },
    })
    const res = fleetResponseSchema.parse(raw)
    const items = (res.sales_incharge_locations ?? []).map(toFix)
    return {
      items,
      // Never `items.length`: the array is one page, narrowed further by the
      // fix-level filters, while `total` is the whole team.
      total: res.total ?? 0,
      page: res.page ?? params.page ?? 1,
      pageSize: res.page_size ?? params.pageSize ?? items.length,
      totalPages: res.total_pages ?? 1,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load live locations.')
  }
}

function toTrail(res: TrailResponse): RepTrail {
  return {
    salesInchargeId: res.sales_incharge_id,
    salesInchargeName: res.sales_incharge_name ?? 'Unnamed rep',
    trackedDate: res.tracked_date,
    // Already oldest-first — the order the polyline is drawn in. Not re-sorted.
    points: (res.points ?? [])
      .filter((point) => point.latitude != null && point.longitude != null)
      .map((point) => ({
        id: point.id,
        latitude: point.latitude as string,
        longitude: point.longitude as string,
        beatId: point.beat_id,
        beatName: point.beat_name ?? null,
        isFakeLocation: point.is_fake_location,
        recordedAt: point.recorded_at ?? '',
      })),
    totalPoints: res.total_points,
    distanceMetres: res.distance_metres,
    mockSuspectedCount: res.mock_suspected_count,
    firstSeenAt: res.first_seen_at ?? null,
    lastSeenAt: res.last_seen_at ?? null,
  }
}

/**
 * GET /locations/trail — one rep's whole day, unpaginated by design.
 *
 * A day with nothing on it is a `200` carrying an empty `points` array, not a
 * `404`: "no positions recorded" is an answer, and the caller renders it as an
 * empty state rather than an error. A real `404`
 * (`SALES_INCHARGE_NOT_FOUND`) means the id is not a rep of the selected
 * company — deliberately indistinguishable from one that does not exist at all,
 * so the id cannot be probed.
 */
export async function fetchRepTrail(params: {
  inchargeId: string
  trackedDate: string
}): Promise<RepTrail> {
  try {
    const raw = await http.get<unknown>(endpoints.LOCATION_TRACKING.TRAIL, {
      params: {
        sales_incharge_id: Number(params.inchargeId) || params.inchargeId,
        tracked_date: params.trackedDate,
      },
    })
    return toTrail(trailResponseSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to load the trail.')
  }
}
