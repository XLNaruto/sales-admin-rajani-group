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
import {
  useRetailerEditRequest,
  useReviewRetailerEditRequest,
} from '../api/use-retailer-edit-requests'
import { RetailerEditOutlet, RetailerEditRequester } from '../components/retailer-edit-cells'
import { RetailerEditComparison } from '../components/retailer-edit-request-detail-dialog'
import { classifyRetailerEditReviewError, rejectReasonError } from '../lib/review-error'
import { REVIEW_REASON_MAX } from '../schemas'

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
 * One retailer edit request, opened by id — the deep-link target behind a
 * `retailer_edit_request` notification. Same field-by-field comparison as the
 * queue's dialog, with approve / reject inline.
 */
export function RetailerEditRequestDetailPage({ id, notificationId }: Props) {
  useMarkReadOnArrival(notificationId)

  const { data: request, isLoading, isError, error, refetch } = useRetailerEditRequest(
    Number.isFinite(id) ? id : null,
  )
  const { can } = useCan()
  const canApprove = can('retailer-edit-request:approve')
  const review = useReviewRetailerEditRequest()

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [approveNote, setApproveNoteState] = useState('')
  const [rejectReason, setRejectReasonState] = useState('')
  const [serverReasonError, setServerReasonError] = useState<string | null>(null)

  const setApproveNote = (v: string) => {
    setApproveNoteState(v)
    setServerReasonError(null)
  }
  const setRejectReason = (v: string) => {
    setRejectReasonState(v)
    setServerReasonError(null)
  }
  const closeApprove = () => {
    setConfirmApprove(false)
    setApproveNote('')
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
    const { kind, message } = classifyRetailerEditReviewError(e)
    switch (kind) {
      case 'already-answered':
      case 'gone':
        toast.error(message)
        closeApprove()
        closeReject()
        void refetch()
        return
      case 'must-reject':
        toast.error(message)
        closeApprove()
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
      { id: request.id, review: { status: 'approved', reason: approveNote } },
      {
        onSuccess: () => {
          toast.success('Edit approved — the outlet now has the requested details.')
          closeApprove()
        },
        onError: onReviewError,
      },
    )
  }

  const reject = () => {
    if (!request || rejectReasonError(rejectReason)) return
    review.mutate(
      { id: request.id, review: { status: 'rejected', reason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Edit rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: onReviewError,
      },
    )
  }

  const back = (
    <Link to="/requests/retailer-edits" className={buttonVariants({ variant: 'outline' })}>
      <ArrowLeft /> All retailer edits
    </Link>
  )

  if (isError || !Number.isFinite(id)) {
    return (
      <div>
        <PageHeader title="Retailer edit request" actions={back} />
        <RequestDetailError
          error={error}
          entityType="retailer_edit_request"
          entityId={id}
          label="retailer edit request"
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
        title="Retailer edit request"
        description="Approving applies the requested values to the outlet. Rejecting leaves the outlet as it is and sends your reason to the rep."
        actions={back}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {isLoading || !request ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <RetailerEditOutlet request={request} size="lg" />
              <StatusBadge status={request.status} />
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Requested by
                </dt>
                <dd>
                  <RetailerEditRequester request={request} />
                </dd>
              </div>
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
              {request.reviewReason ? (
                <div className="sm:col-span-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {request.status === 'rejected' ? 'Reject reason' : 'Review note'}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">
                    {request.reviewReason}
                  </dd>
                </div>
              ) : null}
            </dl>

            <RetailerEditComparison view={request} />

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
                {/* A deleted outlet can't take the change — rejecting is the only answer. */}
                {request.currentRetailer ? (
                  <Button
                    className="cursor-pointer"
                    onClick={() => setConfirmApprove(true)}
                    disabled={review.isPending}
                  >
                    <Check /> Approve
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={(open) => !open && closeApprove()}
        icon={Check}
        title="Approve this edit?"
        description="The requested details replace the current ones on the outlet, including the full owner list. Fields the rep left empty are cleared."
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={review.isPending}
        keepOpenOnConfirm
        onConfirm={approve}
      >
        <ReasonBox
          id="retailer-edit-detail-approve-note"
          label="Note (optional)"
          value={approveNote}
          onChange={setApproveNote}
          error={serverReasonError}
          placeholder="e.g. Verified on call"
          maxLength={REVIEW_REASON_MAX}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this edit?"
        description="The outlet stays as it is. Your reason is shown to the rep in the app."
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={review.isPending}
        confirmDisabled={clientReasonError !== null}
        keepOpenOnConfirm
        onConfirm={reject}
      >
        <ReasonBox
          id="retailer-edit-detail-reject-reason"
          label="Reason"
          required
          value={rejectReason}
          onChange={setRejectReason}
          error={serverReasonError ?? (rejectReason.length > 0 ? clientReasonError : null)}
          placeholder="e.g. Pincode does not match the shop location"
          maxLength={REVIEW_REASON_MAX}
        />
      </ConfirmDialog>
    </div>
  )
}
