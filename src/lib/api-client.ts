import axios, { type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/auth-store'
import { refreshAccessToken } from './auth-refresh'

/**
 * Single axios instance for the whole app.
 * Feature `api/` layers use this; components never import it directly.
 */
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const apiClient = axios.create({
  baseURL: env.VITE_APP_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let the browser set the multipart boundary for FormData bodies.
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

/**
 * Clear the session and bounce to sign-in. The interceptor runs outside React,
 * so the router's `beforeLoad` guards won't fire until the next navigation —
 * we redirect here so a 401 can't leave the app sitting on a page in a
 * signed-out (tokenless) state, which would make every following request 401.
 * A hard redirect (not a router push) guarantees all in-memory state is reset,
 * and we guard against a redirect loop when already on the login screen.
 */
function forceSignOut() {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

// On 401: refresh once (single-flight, in auth-refresh.ts) and replay the
// original request. If the refresh fails — or on any 401 that can't be retried
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as RetriableConfig | undefined
    const status = error?.response?.status
    const canRetry =
      status === 401 &&
      original != null &&
      !original._retry &&
      Boolean(useAuthStore.getState().refreshToken)

    if (canRetry) {
      original._retry = true
      try {
        const token = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${token}`
        return apiClient(original)
      } catch {
        forceSignOut()
        return Promise.reject(error)
      }
    }

    if (status === 401) {
      forceSignOut()
    }
    return Promise.reject(error)
  },
)
