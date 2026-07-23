import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchPermissions, type Permission } from './permissions-api'

/**
 * Loads the current user's permission list once per session. Permissions are
 * server state (they depend on the user + active company), so they live in
 * TanStack Query — never Zustand. Cached aggressively: they only change when
 * the user or company changes, at which point the query is invalidated.
 *
 * Mounted globally from the dashboard layout so the set is warm before any
 * gated menu / button renders.
 */
export function usePermissions() {
  return useQuery({
    queryKey: queryKeys.permissions.list(),
    queryFn: fetchPermissions,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Return type of {@link useCan} — call `can(key)` to test a single permission. */
export interface PermissionChecker {
  /** `true` when the user holds `key`. Unknown/undefined keys → `false`. */
  can: (key?: Permission | null) => boolean
  /** `true` when the user holds ALL of the given keys. */
  canEvery: (...keys: Permission[]) => boolean
  /** `true` when the user holds AT LEAST ONE of the given keys. */
  canSome: (...keys: Permission[]) => boolean
  /** Still loading the permission list (checks return `false` meanwhile). */
  isLoading: boolean
}

/**
 * The reusable permission-check hook. Pass a permission key and it tells you
 * whether the current user has it — the front-end gate for menus and buttons.
 *
 * @example
 * const { can } = useCan()
 * if (can('distributor-master:create')) { ... show the "Add" button ... }
 * {can('distributor-master:delete') && <DeleteButton />}
 */
export function useCan(): PermissionChecker {
  const { data, isLoading } = usePermissions()

  return useMemo(() => {
    // Set for O(1) membership checks regardless of list length.
    const granted = new Set(data ?? [])
    return {
      can: (key) => (key ? granted.has(key) : false),
      canEvery: (...keys) => keys.every((k) => granted.has(k)),
      canSome: (...keys) => keys.some((k) => granted.has(k)),
      isLoading,
    }
  }, [data, isLoading])
}
