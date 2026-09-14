import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Check, IdCard, Phone, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isConflictError } from '@/lib/api-error'
import { toastApiError } from '@/lib/api-toast'
import { useCan } from '@/features/permissions'
import { useMarkReadOnArrival } from '@/features/notifications'
import { RequestDetailError } from '../../components/request-detail-error'
import {
  useProfileEditRequest,
  useReviewProfileEditRequest,
} from '../api/use-profile-edit-requests'

/** An ISO-8601 timestamp as "25 Jun 2026, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return 'N/A'
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
 * One profile edit request, opened by id — the deep-link target behind a
 * notification.
 *
 * APPROVING DOES NOT REWRITE THE PROFILE. The ask is prose; approving records
 * that the change will be made, and the correction itself is then made on the
 * rep's record through the Sales Incharge Master. The screen says so in as many
 * words, because a bare "Approve" makes admins think the edit applied.
 */
export function ProfileEditRequestDetailPage({ id, notificationId }: Props) {
  useMarkReadOnArrival(notificationId)

  const { data: request, isLoading, isError, error, refetch } = useProfileEditRequest(id)
  const { can } = useCan()
  const canApprove = can('profile-edit-request:approve')
  const review = useReviewProfileEditRequest()

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  // Optional on an approval ("done, corrected on the 3rd"), required on a
  // rejection — the same box, two different rules.
  const [approveNote, setApproveNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const closeApprove = () => {
    setConfirmApprove(false)
    setApproveNote('')
  }
  const closeReject = () => {
    setConfirmReject(false)
    setRejectReason('')
  }

  /** A request already answered comes back `409` — say so and re-read it. */
  const onReviewError = (e: unknown, fallback: string) => {
    toastApiError(e, fallback)
    if (isConflictError(e)) void refetch()
  }

  const approve = () => {
    if (!request) return
    review.mutate(
      { id: request.id, review: { status: 'approved', reason: approveNote } },
      {
        onSuccess: () => {
          toast.success(
            "Request approved — now make the correction on the rep's record.",
          )
          closeApprove()
        },
        onError: (e) => onReviewError(e, "Couldn't approve the request."),
      },
    )
  }

  const reject = () => {
    if (!request || rejectReason.trim() === '') return
    review.mutate(
      { id: request.id, review: { status: 'rejected', reason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Request rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) => onReviewError(e, "Couldn't reject the request."),
      },
    )
  }

  const back = (
    <Link to="/requests/profile-edits" className={buttonVariants({ variant: 'outline' })}>
      <ArrowLeft /> All profile edits
    </Link>
  )

  if (isError) {
    return (
      <div>
        <PageHeader title="Profile edit request" actions={back} />
        <RequestDetailError
          error={error}
          entityType="profile_edit_request"
          entityId={id}
          label="profile edit request"
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const isPending = request?.status === 'pending'

  return (
    <div>
      <PageHeader
        title="Profile edit request"
        description="Approving records that you'll make the change — the correction itself is still made on the sales incharge's record."
        actions={back}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {isLoading || !request ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {/* Null once the rep has been removed — the request outlives him. */}
                    {request.salesInchargeName ?? 'Removed sales incharge'}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {request.employeeCode ? (
                      <span className="inline-flex items-center gap-1">
                        <IdCard className="size-3.5" />#{request.employeeCode}
                      </span>
                    ) : null}
                    {request.salesInchargePhone ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Phone className="size-3.5" />
                        {request.salesInchargePhone}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What the rep asked for
              </p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {request.message}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Requested
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {stampLabel(request.requestedAt)}
                </dd>
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
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your note
                  </dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">
                    {request.reviewReason}
                  </dd>
                </div>
              ) : null}
            </dl>

            {canApprove && isPending ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => setConfirmReject(true)}
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
        onOpenChange={(open) => !open && closeApprove()}
        icon={Check}
        title="Approve this request?"
        description="This does NOT change the profile — it records that you'll make the correction. Edit the rep on the Sales Incharge Master afterwards."
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={review.isPending}
        keepOpenOnConfirm
        onConfirm={approve}
      >
        <div className="text-left">
          <label
            htmlFor="profile-edit-detail-approve-note"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Note <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="profile-edit-detail-approve-note"
            maxLength={1000}
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            placeholder="e.g. Done, corrected on the 3rd."
            className="h-20 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this request?"
        description="Your reason is what the rep reads back in the app — and the only thing he can act on."
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={review.isPending}
        confirmDisabled={rejectReason.trim() === ''}
        keepOpenOnConfirm
        onConfirm={reject}
      >
        <div className="text-left">
          <label
            htmlFor="profile-edit-detail-reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="profile-edit-detail-reject-reason"
            autoFocus
            maxLength={1000}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Send the cancelled cheque first."
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
