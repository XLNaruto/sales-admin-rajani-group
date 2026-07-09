import { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string
  error?: string
}

/** Pull a human-readable message out of any thrown error (Axios or otherwise). */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    return data?.message || data?.error || error.message || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}
