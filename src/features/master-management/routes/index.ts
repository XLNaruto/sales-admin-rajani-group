/**
 * Route master (`GET /sales-incharge-admin/routes`) — the named delivery routes
 * a warehouse serves. Read-only: the API exposes no writes and there is no
 * admin screen, it only backs the distributor form's "Delivery Route" select.
 */
export { useRoutes } from './api/use-routes'
export { fetchRoutes } from './api/route-api'
export type {
  RouteMasterRow,
  RouteListParams,
  RouteListResult,
  RouteSortBy,
} from './types'
