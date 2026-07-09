import { toastsuccessmsg, toasterrormsg } from './toast'
import { getApiErrorMessage } from './api-error'

/** Prefer the server's `message` field; fall back to a caller-supplied string. */
export function getApiSuccessMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export function toastApiSuccess(data: unknown, fallback: string) {
  return toastsuccessmsg(getApiSuccessMessage(data, fallback))
}

export function toastApiError(error: unknown, fallback: string) {
  return toasterrormsg(getApiErrorMessage(error, fallback))
}
