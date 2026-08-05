/**
 * Live-day fetchers — the field day as it actually happened.
 *
 * Two reads: a window of day summaries (the month grid) and one day in full (the
 * trail screen). Coordinates arrive as strings because they are `numeric`
 * columns; they are parsed to numbers here and *only* here, at the map's
 * boundary, where a float is what the drawing API needs.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { liveDetailSchema, liveSummariesSchema, type LiveDetailRow } from '../schemas'
import { dayOfMonth, timeOfDay } from '../lib/journey-format'
import type {
  DayCounters,
  DayVisit,
  GeoPoint,
  LiveDayDetail,
  LiveMonthResult,
  RepDayStatus,
  VisitKind,
  VisitMarker,
} from '../types'

const STATUSES: RepDayStatus[] = [
  'worked',
  'official_work',
  'leave',
  'holiday',
  'weekly_off',
  'not_started',
]

function toStatus(value: string): RepDayStatus {
  return STATUSES.includes(value as RepDayStatus)
    ? (value as RepDayStatus)
    : 'not_started'
}

const EMPTY_COUNTERS: DayCounters = {
  sc: 0,
  tc: 0,
  inTurn: 0,
  ovt: 0,
  to: 0,
  pc: 0,
  ovc: 0,
}

/** Counters are displayed, never recomputed — this only renames the fields. */
function toCounters(
  raw:
    | {
        sc: number
        tc: number
        in_turn: number
        ovt: number
        to: number
        pc: number
        ovc: number
      }
    | null
    | undefined,
): DayCounters {
  if (!raw) return EMPTY_COUNTERS
  return {
    sc: raw.sc,
    tc: raw.tc,
    inTurn: raw.in_turn,
    ovt: raw.ovt,
    to: raw.to,
    pc: raw.pc,
    ovc: raw.ovc,
  }
}

/** A coordinate pair, or null when either half is missing. */
function toPoint(lat: string | null, lng: string | null): GeoPoint | null {
  if (lat == null || lng == null) return null
  const point = { lat: Number(lat), lng: Number(lng) }
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null
}

/** `call_type` on the wire → the legend's marker vocabulary. */
const CALL_TYPES: Record<string, VisitKind> = {
  in_turn: 'in-turn',
  telephonic: 'telephonic',
  ovt: 'ovt',
  ovc: 'ovc',
  joint_working: 'joint-working',
  distributor: 'distributor',
  official_work: 'official-work',
}

function toKind(callType: string | null | undefined): VisitKind {
  return CALL_TYPES[callType ?? ''] ?? 'in-turn'
}

/**
 * GET /live-day/summaries — every date in the window. Not paginated and capped
 * at 31 days server-side (a longer range is silently clamped), so the cards are
 * paged client-side.
 */
export async function fetchLiveMonth(params: {
  inchargeId: string
  fromDate: string
  toDate: string
}): Promise<LiveMonthResult> {
  try {
    const raw = await http.get<unknown>(endpoints.LIVE_DAY.SUMMARIES, {
      params: {
        sales_incharge_id: Number(params.inchargeId) || params.inchargeId,
        from_date: params.fromDate,
        to_date: params.toDate,
      },
    })
    const res = liveSummariesSchema.parse(raw)
    const t = res.totals
    return {
      days: res.rep_day_summaries.map((day) => ({
        date: day.date,
        day: dayOfMonth(day.date),
        status: toStatus(day.status),
        activityCode: day.activity_code ?? null,
        activityName: day.activity_name ?? null,
        beatId: day.beat_id,
        beatName: day.beat_name ?? null,
        counters: toCounters(day.counters),
        distanceMetres: day.distance_metres,
        mockSuspectedCount: day.mock_suspected_count,
        dayStartAt: day.day_start_at ?? null,
        dayEndAt: day.day_end_at ?? null,
        dayStartAddress: day.day_start_address ?? null,
      })),
      totals: {
        days: t?.days ?? 0,
        daysOnField: t?.days_on_field ?? 0,
        offDays: t?.off_days ?? 0,
        gpsFlaggedDays: t?.gps_flagged_days ?? 0,
        totalCalls: t?.total_calls ?? 0,
        productiveCalls: t?.productive_calls ?? 0,
        productivityPercentage: t?.productivity_percentage ?? 0,
        avgCallsPerDay: t?.avg_calls_per_day ?? 0,
        distanceMetres: t?.distance_metres ?? 0,
      },
    }
  } catch (error) {
    throw asApiError(error, 'Failed to load the month.')
  }
}

function toDetail(r: LiveDetailRow): LiveDayDetail {
  const timeline: DayVisit[] = (r.timeline ?? []).map((visit) => ({
    id: `visit-${visit.visit_id}`,
    daySequence: visit.day_sequence,
    at: timeOfDay(visit.at),
    outlet: visit.party_name ?? 'Unnamed outlet',
    beatName: visit.beat_name ?? null,
    kind: toKind(visit.call_type),
    productive: Boolean(visit.is_productive),
    orderValue: visit.order_value,
    dwellSeconds: visit.dwell_seconds,
    reason: visit.reason ?? null,
    point: toPoint(visit.latitude, visit.longitude),
  }))

  // The route's own points, in OPTIMISED order. `sequence` numbers the pins and
  // `day_sequence` numbers the timeline; they disagree when the sales incharge backtracked,
  // and nothing here tries to make them agree.
  const routePoints: VisitMarker[] = (r.route?.points ?? [])
    .map((point) => {
      const at = toPoint(point.latitude, point.longitude)
      if (!at) return null
      const marker: VisitMarker = {
        id: point.visit_id
          ? `visit-${point.visit_id}`
          : `stop-${point.journey_plan_stop_id}`,
        daySequence: point.day_sequence,
        at: timeOfDay(point.at),
        outlet: point.party_name ?? 'Unnamed outlet',
        beatName: null,
        kind: 'in-turn',
        productive: Boolean(point.is_productive),
        orderValue: null,
        dwellSeconds: null,
        reason: null,
        point: at,
      }
      return marker
    })
    .filter((point): point is VisitMarker => point !== null)

  const attendance = r.attendance
  const facets = r.facets

  return {
    date: r.date,
    status: toStatus(r.status),
    counters: toCounters(r.counters),
    // The beats he took, in his own order. There is no assigned/selected pair any
    // more: nothing assigns beats to dates, so every one of these is his choice.
    beats: (r.beats ?? []).map((beat) => ({
      id: beat.id,
      name: beat.name ?? `Beat ${beat.id}`,
    })),
    // The server sends `true` on a day with no beats at all, so a missing value
    // must not read as a deviation.
    onAllocation: r.on_allocation ?? true,
    totalDistanceMetres: r.total_distance_metres,
    mockSuspectedCount: r.mock_suspected_count,
    // Entirely null when the phone never checked in — and everything else in the
    // response is still populated, so the screen must render regardless.
    attendance: {
      dayStartAt: attendance?.day_start_at ?? null,
      dayEndAt: attendance?.day_end_at ?? null,
      elapsedSeconds: attendance?.elapsed_seconds ?? null,
      workingSeconds: attendance?.working_seconds ?? null,
      breakSeconds: attendance?.break_seconds ?? null,
      sessionCount: attendance?.session_count ?? null,
      checkIn: toPoint(
        attendance?.check_in_latitude ?? null,
        attendance?.check_in_longitude ?? null,
      ),
      checkOut: toPoint(
        attendance?.check_out_latitude ?? null,
        attendance?.check_out_longitude ?? null,
      ),
      dayStartAddress: attendance?.day_start_address ?? null,
      dayEndAddress: attendance?.day_end_address ?? null,
    },
    timeline,
    route: {
      drawable: Boolean(r.route?.drawable),
      state: r.route?.state ?? 'no_mapped_points',
      origin: toPoint(
        r.route?.origin?.latitude ?? null,
        r.route?.origin?.longitude ?? null,
      ),
      distanceMetres: r.route?.distance_metres ?? null,
      points: routePoints,
    },
    notVisited: (r.not_visited ?? []).map((stop) => ({
      id: `stop-${stop.stop_id}`,
      name: stop.party_name ?? 'Unnamed outlet',
      stopType: stop.stop_type ?? 'retailer',
      plannedSequence: stop.planned_sequence,
      point: toPoint(stop.latitude, stop.longitude),
    })),
    facets: {
      inTurn: facets?.in_turn ?? 0,
      telephonic: facets?.telephonic ?? 0,
      ovt: facets?.ovt ?? 0,
      ovc: facets?.ovc ?? 0,
      jointWorking: facets?.joint_working ?? 0,
      notVisited: facets?.not_visited ?? 0,
      distributor: facets?.distributor ?? 0,
      officialWork: facets?.official_work ?? 0,
      productive: facets?.productive ?? 0,
    },
  }
}

/** GET /live-day/detail — one day's counters, attendance, timeline and route. */
export async function fetchLiveDay(params: {
  inchargeId: string
  date: string
}): Promise<LiveDayDetail> {
  try {
    const raw = await http.get<unknown>(endpoints.LIVE_DAY.DETAIL, {
      params: {
        sales_incharge_id: Number(params.inchargeId) || params.inchargeId,
        date: params.date,
      },
    })
    return toDetail(liveDetailSchema.parse(raw))
  } catch (error) {
    throw asApiError(error, 'Failed to load the day.')
  }
}
