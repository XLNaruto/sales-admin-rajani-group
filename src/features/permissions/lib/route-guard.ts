import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ApiError } from '@/lib/api-error'
import { fetchPermissions, type Permission } from '../api/permissions-api'

/**
 * Route-level permission gate — the server-side counterpart to `useCan()`.
 *
 * Hiding a sidebar link stops discovery, not access: the route still resolves
 * if the URL is typed directly. Call this from a route's `beforeLoad` so an
 * unauthorised visit is blocked before the page renders — it throws an
 * {@link ApiError} with status 403, which the router's `defaultErrorComponent`
 * turns into the Forbidden screen.
 *
 * Reads the same cached permission list `usePermissions()` populates (fetching
 * it once if the guard runs before the layout mounted), so there's no extra
 * request on navigation.
 *
 * Pass one key, or an array to allow access when the user holds ANY of them
 * (e.g. a combined create/edit route needs create OR update).
 *
 * @example
 * export const Route = createFileRoute('/_authenticated/distributors')({
 *   beforeLoad: ({ context }) =>
 *     requirePermission(context.queryClient, 'distributor-master:list'),
 *   component: Outlet,
 * })
 */
export async function requirePermission(
  queryClient: QueryClient,
  permission: Permission | Permission[],
): Promise<void> {
  const items = await queryClient.ensureQueryData({
    queryKey: queryKeys.permissions.list(),
    queryFn: fetchPermissions,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const required = Array.isArray(permission) ? permission : [permission]
  const allowed = required.some((key) => items.includes(key))

  if (!allowed) {
    throw new ApiError('You do not have permission to access this page.', 403)
  }
}
