import { errorCode, errorStatus, getApiErrorMessage } from '@/lib/api-error'

/** Client-side check for the rejection reason; `null` when valid. */
export function rejectReasonError(reason: string): string | null {
  return reason.trim().length === 0 ? 'Enter a reason — the rep sees it in the app.' : null
}

/**
 * What the screen does with a failed approve / reject, per the documented
 * `error` codes. Branches on the code, never the message.
 *
 * - `already-answered` — another admin got there first; close and refresh.
 * - `gone` — the request no longer exists; close and refresh.
 * - `must-reject` — approving can't apply (the outlet, beat or outlet type it
 *   points at was deleted); the only way out is a rejection with a reason.
 * - `reason-invalid` — the reason failed validation; show it under the box.
 * - `other` — anything else; toast and leave the dialog open to retry.
 */
export type RetailerEditReviewErrorKind =
  | 'already-answered'
  | 'gone'
  | 'must-reject'
  | 'reason-invalid'
  | 'other'

export interface RetailerEditReviewError {
  kind: RetailerEditReviewErrorKind
  message: string
}

export function classifyRetailerEditReviewError(error: unknown): RetailerEditReviewError {
  switch (errorCode(error)) {
    case 'RETAILER_EDIT_REQUEST_NOT_PENDING':
      return {
        kind: 'already-answered',
        message: 'This edit request has already been answered.',
      }
    case 'RETAILER_EDIT_REQUEST_NOT_FOUND':
      return { kind: 'gone', message: 'This edit request no longer exists.' }
    case 'RETAILER_NOT_FOUND':
      return {
        kind: 'must-reject',
        message: "This outlet was deleted, so the change can't be applied. Reject it with a reason.",
      }
    case 'BEAT_NOT_FOUND':
      return {
        kind: 'must-reject',
        message:
          "The beat this request moves the outlet to was deleted, so it can't be approved. Reject it with a reason.",
      }
    case 'OUTLET_TYPE_NOT_FOUND':
      return {
        kind: 'must-reject',
        message:
          "The outlet type in this request was deleted, so it can't be approved. Reject it with a reason.",
      }
    case 'VALIDATION_ERROR':
      return {
        kind: 'reason-invalid',
        message: getApiErrorMessage(error, 'Check the reason and try again.'),
      }
  }

  const status = errorStatus(error)
  if (status === 409) return { kind: 'already-answered', message: getApiErrorMessage(error) }
  if (status === 400) {
    return {
      kind: 'reason-invalid',
      message: getApiErrorMessage(error, 'Check the reason and try again.'),
    }
  }
  return {
    kind: 'other',
    message: getApiErrorMessage(error, "Couldn't answer the edit request."),
  }
}
