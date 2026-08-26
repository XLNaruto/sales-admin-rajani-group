import { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string
  error?: string
  details?: unknown
}

/**
 * A normalised application error that keeps the HTTP `status` around after the
 * raw AxiosError is discarded. Feature `api/` layers throw this (via
 * {@link asApiError}) so the UI can react to specific statuses — e.g. render
 * the Forbidden screen on a 403 — instead of only seeing a message string.
 */
export class ApiError extends Error {
  readonly status?: number
  readonly details?: unknown
  /**
   * The body's machine-readable `error` code (e.g. `JOURNEY_PLAN_DAY_LOCKED`).
   *
   * Kept beside the message because the message is for the user and the code is
   * for the UI: which field to point at, whether to refetch, whether this is the
   * one 400 a screen knows how to explain better than the server can.
   */
  readonly code?: string

  constructor(message: string, status?: number, details?: unknown, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.code = code
  }
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

/**
 * Wrap any thrown error into an {@link ApiError}, preserving the HTTP status
 * (and any `details`) so callers downstream can branch on it. Use this in
 * feature `api/` catch blocks instead of `new Error(getApiErrorMessage(...))`.
 */
export function asApiError(error: unknown, fallback?: string): ApiError {
  const response = error instanceof AxiosError ? error.response : undefined
  const body = response?.data as ApiErrorBody | undefined
  return new ApiError(
    getApiErrorMessage(error, fallback),
    response?.status,
    body?.details,
    body?.error,
  )
}

/** The body's `error` code, if the error carries one. */
export function errorCode(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.code
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    return body?.error
  }
  return undefined
}

/** The HTTP status carried by an error, if any (ApiError or raw AxiosError). */
export function errorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status
  if (error instanceof AxiosError) return error.response?.status
  return undefined
}

/** True when an error represents an HTTP 403 (forbidden / no permission). */
export function isForbiddenError(error: unknown): boolean {
  return errorStatus(error) === 403
}
