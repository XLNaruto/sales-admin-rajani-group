import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchRoutes } from './route-api'
import type { RouteListParams } from '../types'

/**
 * The route master as a dropdown source — one page of up to 100 routes sorted
 * by name. The master rarely changes, so it's cached for 5 minutes.
 */
export function useRoutes(params: RouteListParams = {}) {
  return useQuery({
    queryKey: queryKeys.masters.routes(params as Record<string, unknown>),
    // `page_size` caps at 100; the master is small enough to fetch in one page.
    queryFn: () =>
      fetchRoutes({
        pageSize: 100,
        sortBy: 'name',
        sortOrder: 'asc',
        ...params,
      }),
    staleTime: 5 * 60 * 1000,
  })
}
