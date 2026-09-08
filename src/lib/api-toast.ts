import { toastsuccessmsg, toasterrormsg } from './toast'
import { getApiErrorMessage, isConflictError } from './api-error'

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

/**
 * Toast a failed save / edit / action.
 *
 * On a 409 the server has already explained the conflict in the user's own
 * terms ("This email address is already in use.") — that message is shown
 * verbatim, because no generic retry copy can say it better. Any other failure
 * keeps the caller's wording, since a 500's message means nothing to the user.
 *
 * Pass `title` to keep the row/record context ("Can't remove Acme Traders");
 * the conflict message then lands in the toast description.
 */
export function toastMutationError(error: unknown, fallback: string, title?: string) {
  if (isConflictError(error)) {
    const message = getApiErrorMessage(error, fallback)
    if (title && title !== message) return toasterrormsg(title, { description: message })
    return toasterrormsg(message)
  }
  return toasterrormsg(title ?? fallback)
}
