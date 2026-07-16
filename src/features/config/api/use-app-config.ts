import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useConfigStore } from '@/stores/config-store'
import { fetchAppConfig } from './config-api'

/**
 * Loads the client-facing app config once per session and mirrors the media
 * base URL into the global config store, so the pure `mediaUrl()` helper can
 * build image URLs synchronously anywhere in the app.
 *
 * Mounted from the dashboard layout so the base URL is set before any
 * image-bearing page renders. Config rarely changes, so it never goes stale.
 */
export function useAppConfig() {
  const setMediaBaseUrl = useConfigStore((s) => s.setMediaBaseUrl)

  const query = useQuery({
    queryKey: queryKeys.config.app(),
    queryFn: fetchAppConfig,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  useEffect(() => {
    if (query.data?.mediaBaseUrl) setMediaBaseUrl(query.data.mediaBaseUrl)
  }, [query.data?.mediaBaseUrl, setMediaBaseUrl])

  return query
}
