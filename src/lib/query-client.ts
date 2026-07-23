import { QueryClient } from '@tanstack/react-query'
import { errorStatus } from './api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Retry transient failures once, but never a 4xx — a 403/404/401 won't
      // fix itself on a retry, and a forbidden call should surface immediately.
      retry: (failureCount, error) => {
        const status = errorStatus(error)
        if (status && status >= 400 && status < 500) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
