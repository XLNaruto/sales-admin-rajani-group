import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchMyProfile } from './profile-api'

/**
 * GET /sales-incharge-admin/me — the current user's profile. Cached for a
 * minute since it rarely changes within a session.
 */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: fetchMyProfile,
    staleTime: 60 * 1000,
  })
}
