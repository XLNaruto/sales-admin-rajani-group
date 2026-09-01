/**
 * Query hooks for the two location-tracking reads.
 *
 * **There is no WebSocket for this.** The realtime service cannot fan location
 * pings out to the admin namespace, so the fleet screen polls — on an interval
 * while the tab is visible, paused when it is not. Nothing here is recomputed
 * between polls: `last_seen_minutes_ago` and `is_stale` are stamped server-side
 * per response, so a stale response keeps showing stale numbers (and the screen
 * shows when it was last refreshed) rather than counting up on its own.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchFleetLocations, fetchRepTrail } from './location-tracking-api'
import type { FleetParams } from '../types'

/** Default poll cadence, in ms. 30–60s is the sensible band for this feed. */
export const FLEET_POLL_MS = 45_000

/**
 * GET /locations/live — one page of the fleet's latest fixes.
 *
 * `refetchIntervalInBackground` stays false (the default is spelled out here
 * because it is load-bearing): the interval pauses while the tab is hidden and
 * resumes on return, so a backgrounded dashboard does not poll all night.
 */
export function useFleetLocations(
  params: FleetParams,
  options: { enabled?: boolean; pollMs?: number | false } = {},
) {
  const pollMs = options.pollMs ?? FLEET_POLL_MS
  return useQuery({
    queryKey: queryKeys.locationTracking.fleet(params as Record<string, unknown>),
    queryFn: () => fetchFleetLocations(params),
    enabled: options.enabled ?? true,
    // The page shouldn't blank between polls or while a filter is being typed.
    placeholderData: keepPreviousData,
    refetchInterval: pollMs === false ? false : pollMs,
    refetchIntervalInBackground: false,
  })
}

/**
 * GET /locations/trail — one rep's whole day.
 *
 * Not polled: a past day cannot change, and today's trail is read as a finished
 * artefact rather than watched. The screen's refresh control is the way to pull
 * a newer read.
 */
export function useRepTrail(params: {
  inchargeId: string | undefined
  trackedDate: string
}) {
  return useQuery({
    queryKey: queryKeys.locationTracking.trail(
      params.inchargeId ?? '',
      params.trackedDate,
    ),
    queryFn: () =>
      fetchRepTrail({
        inchargeId: params.inchargeId as string,
        trackedDate: params.trackedDate,
      }),
    enabled: Boolean(params.inchargeId && params.trackedDate),
  })
}
