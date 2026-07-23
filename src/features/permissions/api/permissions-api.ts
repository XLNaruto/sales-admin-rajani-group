import { z } from 'zod'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'

/**
 * A single permission the current user holds, in `resource:action` form
 * (e.g. `distributor-master:list`, `sales-incharge:create`). Kept as a plain
 * string so the server can add new permissions without a client release.
 */
export type Permission = string

/** Shape of `GET /sales-incharge-admin/permissions`. */
const permissionsResponseSchema = z.object({
  items: z.array(z.string()),
})

/**
 * GET /sales-incharge-admin/permissions — the flat list of permission keys the
 * authenticated user is granted for the active company. This is the single
 * source of truth for every menu / button visibility check in the app.
 */
export async function fetchPermissions(): Promise<Permission[]> {
  try {
    const raw = await http.get<unknown>(endpoints.PERMISSIONS.GET)
    return permissionsResponseSchema.parse(raw).items
  } catch (error) {
    throw asApiError(error, 'Failed to load permissions.')
  }
}
