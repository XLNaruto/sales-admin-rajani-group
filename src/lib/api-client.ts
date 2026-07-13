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
  baseURL: env.VITE_API_URL,
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

// On 401: refresh once (single-flight, in auth-refresh.ts) and replay the
// original request; if refresh fails, clear the session so the router redirects.
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
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }
    }

    if (status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)
