import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCan } from '@/features/permissions'
import { useMarkReadOnArrival } from '@/features/notifications'
import { ReasonBox } from '../../components/reason-box'
import { RequestDetailError } from '../../components/request-detail-error'
import { useFaceRequest, useReviewFaceRequest } from '../api/use-face-requests'
import { FaceRequestComparison } from '../components/face-request-detail-dialog'
import {
  FaceRequestRequester,
  FaceRequestTypeBadge,
} from '../components/face-request-requester'
import { classifyFaceReviewError, rejectReasonError } from '../lib/review-error'
import { REJECT_REASON_MAX } from '../schemas'

/** An ISO-8601 timestamp as "25 Jun 2026, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

interface Props {
  id: number
  /** Set when a push brought the admin straight here — see `useMarkReadOnArrival`. */
  notificationId?: number
}

/**
 * One face request, opened by id — the deep-link target behind a
 * `sales_incharge_face_request` notification. Same comparison as the queue's
 * dialog, with approve / reject inline.
 */
export function FaceRequestDetailPage({ id, notificationId }: Props) {
  useMarkReadOnArrival(notificationId)

  const { data: request, isLoading, isError, error, refetch } = useFaceRequest(
    Number.isFinite(id) ? id : null,
  )
  const { can } = useCan()
  const canApprove = can('sales-incharge-face-request:approve')
  const review = useReviewFaceRequest()

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReasonState] = useState('')
  const [serverReasonError, setServerReasonError] = useState<string | null>(null)

  const setRejectReason = (v: string) => {
    setRejectReasonState(v)
    setServerReasonError(null)
  }
  const openReject = () => {
    setRejectReason('')
    setConfirmReject(true)
  }
  const closeReject = () => {
    setConfirmReject(false)
    setRejectReason('')
  }

  const onReviewError = (e: unknown) => {
    const { kind, message } = classifyFaceReviewError(e)
    switch (kind) {
      case 'already-answered':
      case 'gone':
        toast.error(message)
        setConfirmApprove(false)
        closeReject()
        void refetch()
        return
      case 'must-reject':
        toast.error(message)
        setConfirmApprove(false)
        openReject()
        return
      case 'reason-invalid':
        setServerReasonError(message)
        return
      default:
        toast.error(message)
    }
  }

  const approve = () => {
    if (!request) return
    review.mutate(
      { id: request.id, review: { status: 'approved' } },
      {
        onSuccess: () => {
          toast.success(
            request.type === 'add'
              ? 'Face approved — it is now registered for attendance.'
              : 'Face approved — the new capture is now live for attendance.',
          )
          setConfirmApprove(false)
        },
        onError: onReviewError,
      },
    )
  }

  const reject = () => {
    if (!request || rejectReasonError(rejectReason)) return
    review.mutate(
      { id: request.id, review: { status: 'rejected', rejectReason } },
      {
        onSuccess: () => {
          toast.success('Face request rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: onReviewError,
      },
    )
  }

  const back = (
    <Link to="/requests/face-requests" className={buttonVariants({ variant: 'outline' })}>
      <ArrowLeft /> All face requests
    </Link>
  )

  if (isError || !Number.isFinite(id)) {
    return (
      <div>
        <PageHeader title="Face request" actions={back} />
        <RequestDetailError
          error={error}
          entityType="sales_incharge_face_request"
          entityId={id}
          label="face request"
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const isPending = request?.status === 'pending'
  const clientReasonError = rejectReasonError(rejectReason)

  return (
    <div>
      <PageHeader
        title="Face request"
        description="Approving makes the requested face live for attendance matching. Rejecting leaves the current face as it is."
        actions={back}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {isLoading || !request ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <FaceRequestRequester request={request} size="lg" />
              <div className="flex items-center gap-2">
                <FaceRequestTypeBadge type={request.type} />
                <StatusBadge status={request.status} />
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Requested
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{stampLabel(request.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Answered
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {stampLabel(request.reviewedAt)}
                </dd>
              </div>
              {request.rejectReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Reject reason
                  </dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">
                    {request.rejectReason}
                  </dd>
                </div>
              ) : null}
            </dl>

            <FaceRequestComparison view={request} />

            {canApprove && isPending ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={openReject}
                  disabled={review.isPending}
                >
                  <X /> Reject
                </Button>
                <Button
                  className="cursor-pointer"
                  onClick={() => setConfirmApprove(true)}
                  disabled={review.isPending}
                >
                  <Check /> Approve
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={(open) => !open && setConfirmApprove(false)}
        icon={Check}
        title="Approve this face?"
        description={
          request?.type === 'add'
            ? 'This registers the face. Attendance punches will be matched against it from now on.'
            : 'This replaces the live face. Attendance punches will be matched against it from now on.'
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={review.isPending}
        keepOpenOnConfirm
        onConfirm={approve}
      />

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this face?"
        description="The current face stays as it is. Your reason is shown to the rep in the app so they know how to re-capture."
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={review.isPending}
        confirmDisabled={clientReasonError !== null}
        keepOpenOnConfirm
        onConfirm={reject}
      >
        <ReasonBox
          id="face-request-detail-reject-reason"
          label="Reason"
          required
          value={rejectReason}
          onChange={setRejectReason}
          error={serverReasonError ?? (rejectReason.length > 0 ? clientReasonError : null)}
          placeholder="e.g. Face not clearly visible, please re-capture in good light."
          maxLength={REJECT_REASON_MAX}
        />
      </ConfirmDialog>
    </div>
  )
}
