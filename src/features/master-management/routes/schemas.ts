import { z } from 'zod'

/**
 * A route-master row as `GET /routes` sends it. The audit timestamps are
 * ignored (no screen shows them); `warehouse_name` is the API's resolved label
 * for `warehouse_id`.
 */
export const routeRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  warehouse_id: z.number(),
  warehouse_name: z.string().nullish(),
})

/** The route list envelope (rows + pagination metadata). */
export const routeListResponseSchema = z.object({
  routes: z.array(routeRowSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
})

export type RouteRow = z.infer<typeof routeRowSchema>
export type RouteListResponse = z.infer<typeof routeListResponseSchema>
