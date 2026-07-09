import type { AxiosRequestConfig } from 'axios'
import { apiClient } from './api-client'

/**
 * Convert a body to FormData when `asForm` is true. A FormData instance is
 * passed through; a plain object is turned into multipart fields (null /
 * undefined values are skipped). The correct multipart boundary header is set
 * automatically by the request interceptor in api-client.
 */
function maybeForm(body: unknown, asForm?: boolean): unknown {
  if (!asForm) return body
  if (body instanceof FormData) return body
  const form = new FormData()
  for (const [key, value] of Object.entries(body ?? {})) {
    if (value != null) form.append(key, value as string | Blob)
  }
  return form
}

export const http = {
  get: <TResponse>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<TResponse>(url, config).then((r) => r.data),

  post: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    asForm?: boolean,
    config?: AxiosRequestConfig,
  ) => apiClient.post<TResponse>(url, maybeForm(body, asForm), config).then((r) => r.data),

  put: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    asForm?: boolean,
    config?: AxiosRequestConfig,
  ) => apiClient.put<TResponse>(url, maybeForm(body, asForm), config).then((r) => r.data),

  patch: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    asForm?: boolean,
    config?: AxiosRequestConfig,
  ) => apiClient.patch<TResponse>(url, maybeForm(body, asForm), config).then((r) => r.data),

  delete: <TResponse>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<TResponse>(url, config).then((r) => r.data),
}
