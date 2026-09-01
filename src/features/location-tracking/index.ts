/**
 * Location Tracking — the admin's read of the GPS breadcrumb ledger the sales
 * incharge's mobile app writes.
 *
 * Deliberately **not** part of `journey-management`. That feature's Live Map is
 * plan vs. actual — what a rep reported doing, with a route reconstructed from
 * the shops he logged. This one is where the handset physically was, minute by
 * minute. The two will disagree, neither corrects the other, and they are gated
 * by different permissions (`live-day:read` vs `sales-incharge-location:read`).
 *
 * Read-only throughout: the ledger is append-only and written solely by the
 * mobile app.
 */
export { FleetMapPage } from './pages/fleet-map-page'
export { RepTrailPage } from './pages/rep-trail-page'

/* Query hooks — the only way another feature may reach these endpoints. */
export { useFleetLocations, useRepTrail, FLEET_POLL_MS } from './api/use-location-tracking'

/* The permission that gates both screens. There is no `:list` counterpart. */
export { LOCATION_TRACKING_PERMISSION } from './lib/permission'

/* Pure helpers, safe to reuse anywhere. */
export {
  toMapPoint,
  todayTracked,
  shiftTracked,
  trackedDateLabel,
  fixTime,
  fixStamp,
  fixState,
  lastSeenLabel,
  boolParam,
  simplifyPath,
  toKmPrecise,
  STALE_AFTER_MINUTES,
  MOCK_LOCATION_NOTE,
  DISTANCE_NOTE,
} from './lib/location-format'
export { FIX_VISUALS, MOCK_VISUAL, FLEET_LEGEND } from './lib/fix-visuals'

export type {
  FixState,
  FleetFix,
  FleetParams,
  FleetResult,
  FleetSortBy,
  MapPoint,
  RepStatus,
  RepTrail,
  SortOrder,
  TrailPoint,
} from './types'
