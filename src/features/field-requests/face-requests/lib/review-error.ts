import { errorCode, errorStatus, getApiErrorMessage } from '@/lib/api-error'
import { REJECT_REASON_MAX, REJECT_REASON_MIN } from '../schemas'

/** Client-side mirror of the API's reject-reason rule (3–500, trimmed); `null` when valid. */
export function rejectReasonError(reason: string): string | null {
  const len = reason.trim().length
  if (len < REJECT_REASON_MIN) return `Enter at least ${REJECT_REASON_MIN} characters.`
  if (len > REJECT_REASON_MAX) return `Keep it to ${REJECT_REASON_MAX} characters or fewer.`
  return null
}

/**
 * What the panel does with a failed approve / reject, per the documented
 * `error` codes. Branches on the code, never the message.
 *
 * - `already-answered` — another admin got there first; close and refresh.
 * - `gone` — the request no longer exists here; close and refresh.
 * - `must-reject` — approving can't apply (the face it edits is gone, or the
 *   rep already has one); the only way out is a rejection with a reason.
 * - `reason-invalid` — the reject reason failed validation; show it on the box.
 * - `other` — anything else; toast and leave the dialog open to retry.
 */
export type FaceReviewErrorKind =
  | 'already-answered'
  | 'gone'
  | 'must-reject'
  | 'reason-invalid'
  | 'other'

export interface FaceReviewError {
  kind: FaceReviewErrorKind
  message: string
}

export function classifyFaceReviewError(error: unknown): FaceReviewError {
  const code = errorCode(error)
  const status = errorStatus(error)

  switch (code) {
    case 'SALES_INCHARGE_FACE_REQUEST_NOT_PENDING':
      return {
        kind: 'already-answered',
        message: 'This face request has already been answered.',
      }
    case 'SALES_INCHARGE_FACE_REQUEST_NOT_FOUND':
      return {
        kind: 'gone',
        message: 'This face request no longer exists in the selected company.',
      }
    case 'SALES_INCHARGE_FACE_NOT_FOUND':
      return {
        kind: 'must-reject',
        message:
          "The face this request edits no longer exists, so it can't be approved. Reject it with a reason.",
      }
    case 'SALES_INCHARGE_FACE_ALREADY_REGISTERED':
      return {
        kind: 'must-reject',
        message:
          "This rep already has a registered face, so this add can't be approved. Reject it with a reason.",
      }
    case 'VALIDATION_ERROR':
      return {
        kind: 'reason-invalid',
        message: getApiErrorMessage(error, 'Enter a reason of 3–500 characters.'),
      }
  }

  // Older/odd responses without a code still carry a meaningful status.
  if (status === 409) {
    return { kind: 'already-answered', message: getApiErrorMessage(error) }
  }
  return {
    kind: 'other',
    message: getApiErrorMessage(error, "Couldn't answer the face request."),
  }
}

/**
 * What the dialog does with a failed face delete, per the documented `error`
 * codes. Branches on the code, never the message.
 *
 * - `request-pending` — the rep has a face request waiting; answer it first.
 * - `gone` — no live face any more (or no such rep here); close and refresh.
 * - `other` — anything else; toast and leave the confirm open to retry.
 */
export type FaceDeleteErrorKind = 'request-pending' | 'gone' | 'other'

export interface FaceDeleteError {
  kind: FaceDeleteErrorKind
  message: string
  /** The pending request blocking the delete, when the API names it. */
  faceRequestId?: number
}

function pendingRequestId(error: unknown): number | undefined {
  const details = (error as { details?: unknown } | null)?.details
  if (details && typeof details === 'object' && 'face_request_id' in details) {
    const id = (details as { face_request_id: unknown }).face_request_id
    return typeof id === 'number' ? id : undefined
  }
  return undefined
}

export function classifyFaceDeleteError(error: unknown): FaceDeleteError {
  switch (errorCode(error)) {
    case 'SALES_INCHARGE_FACE_REQUEST_PENDING': {
      const faceRequestId = pendingRequestId(error)
      return {
        kind: 'request-pending',
        faceRequestId,
        message: faceRequestId
          ? `This rep has a face request waiting (#${faceRequestId}). Approve or reject it first.`
          : 'This rep has a face request waiting. Approve or reject it first.',
      }
    }
    case 'SALES_INCHARGE_FACE_NOT_FOUND':
      return {
        kind: 'gone',
        message: 'This rep has no live face — it may already have been deleted.',
      }
    case 'SALES_INCHARGE_NOT_FOUND':
      return {
        kind: 'gone',
        message: 'This sales incharge no longer exists in the selected company.',
      }
  }
  if (errorStatus(error) === 409) {
    return { kind: 'request-pending', message: getApiErrorMessage(error) }
  }
  return {
    kind: 'other',
    message: getApiErrorMessage(error, "Couldn't delete the face."),
  }
}
