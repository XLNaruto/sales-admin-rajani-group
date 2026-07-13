import axios from 'axios'
import { env } from '@/config/env'
import { endpoints } from '@/lib/endpoints'
import { useAuthStore } from '@/stores/auth-store'

/** Proactively refresh a bit before the ~15-min access token expires. */
export const REFRESH_INTERVAL_MS = 25 * 60 * 1000

export const REFRESH_URL = `${env.VITE_APP_API_URL}${endpoints.AUTH.REFRESH_TOKEN}`

interface RefreshResponse {
  access_token: string
  refresh_token?: string
}

// Bare client (no interceptors) so refreshing can't recurse through the 401
// handler that calls it.
const refreshClient = axios.create({
  baseURL: env.VITE_APP_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

let inFlight: Promise<string> | null = null

/**
 * Exchange the refresh token for a fresh access token, rotating the refresh
 * token when the server returns one. Single-flight: concurrent callers share
 * one in-flight request so we only hit /auth/refresh once.
 */
export function refreshAccessToken(): Promise<string> {
  if (inFlight) return inFlight

  const { refreshToken } = useAuthStore.getState()
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token available'))
  }

  inFlight = refreshClient
    .post<RefreshResponse>(endpoints.AUTH.REFRESH_TOKEN, {
      refresh_token: refreshToken,
    })
    .then((res) => {
      const { access_token, refresh_token: rotated } = res.data
      useAuthStore.getState().setTokens(access_token, rotated)
      return access_token
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

let timer: ReturnType<typeof setInterval> | null = null

/** Start a background timer that keeps the access token fresh while signed in. */
export function startTokenRefreshScheduler(): () => void {
  stopTokenRefreshScheduler()

  timer = setInterval(() => {
    const { token, refreshToken } = useAuthStore.getState()
    if (!token || !refreshToken) return
    refreshAccessToken().catch(() => {
      useAuthStore.getState().logout()
    })
  }, REFRESH_INTERVAL_MS)

  return stopTokenRefreshScheduler
}

export function stopTokenRefreshScheduler() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
