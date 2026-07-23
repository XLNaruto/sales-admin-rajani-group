import type { ReactNode } from 'react'
import { useCan } from '../api/use-permissions'
import type { Permission } from '../api/permissions-api'

interface CanProps {
  /** Show children only when the user holds this permission. */
  permission?: Permission
  /**
   * Show children only when the user holds these permissions. `mode="every"`
   * (default) requires all; `mode="some"` requires at least one.
   */
  anyOf?: Permission[]
  mode?: 'every' | 'some'
  /** Rendered when the check passes. */
  children: ReactNode
  /** Rendered when the check fails (defaults to nothing). */
  fallback?: ReactNode
}

/**
 * Declarative permission gate — the JSX counterpart to {@link useCan}.
 *
 * @example
 * <Can permission="distributor-master:create">
 *   <Button onClick={goToCreate}>Add Distributor</Button>
 * </Can>
 */
export function Can({ permission, anyOf, mode = 'every', children, fallback = null }: CanProps) {
  const { can, canEvery, canSome } = useCan()

  const allowed = anyOf
    ? mode === 'some'
      ? canSome(...anyOf)
      : canEvery(...anyOf)
    : can(permission)

  return <>{allowed ? children : fallback}</>
}
