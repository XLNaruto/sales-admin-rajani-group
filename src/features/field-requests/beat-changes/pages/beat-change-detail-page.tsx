import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ArrowRight, Check, Lock, Route, UserRound, X } from 'lucide-react'
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
import { useBeatChange, useReviewBeatChange } from '../api/use-beat-changes'

/** A `yyyy-MM-dd` plan date as "Tue, 04 Aug 2026". */
function planDateLabel(date: string): string {
  try {
    // Parsed date-only, so `parseISO` builds a local midnight — no UTC shift.
    return format(parseISO(date), 'EEE, dd MMM yyyy')
  } catch {
    return date
  }
}

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
 * One beat change request, opened by id — the deep-link target behind a
 * notification.
 *
 * A screen of its own rather than the queue with a row highlighted, because a
 * notification names a REQUEST and an answered one is no longer on page 1 of
 * anything. Read fresh on every open: another admin may have answered it
 * between the push and the click, and the API refuses a second answer with a
 * `409` rather than applying it twice.
 */
export function BeatChangeDetailPage({ id, notificationId }: Props) {
  useMarkReadOnArrival(notificationId)

  const { data: request, isLoading, isError, error, refetch } = useBeatChange(id)
  const { can } = useCan()
  const canApprove = can('beat-change:approve')
  const review = useReviewBeatChange()

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const closeReject = () => {
    setConfirmReject(false)
    setRejectReason('')
  }

  /** A stale request is refused, not applied — say so and re-read the record. */
  const onReviewError = (e: unknown, fallback: string) => {
    toastApiError(e, fallback)
    if (isConflictError(e)) void refetch()
  }

  const approve = () => {
    if (!request) return
    review.mutate(
      { id: request.id, review: { status: 'approved' } },
      {
        onSuccess: () => {
          toast.success(
            `Beat change approved — ${request.toBeatName ?? 'the new beat'} now runs on ${planDateLabel(request.planDate)}.`,
          )
          setConfirmApprove(false)
        },
        onError: (e) => onReviewError(e, "Couldn't approve the beat change."),
      },
    )
  }

  const reject = () => {
    if (!request || rejectReason.trim() === '') return
    review.mutate(
      { id: request.id, review: { status: 'rejected', rejectionReason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Beat change rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) => onReviewError(e, "Couldn't reject the beat change."),
      },
    )
  }

  const back = (
    <Link
      to="/requests/beat-changes"
      className={buttonVariants({ variant: 'outline' })}
    >
      <ArrowLeft /> All beat changes
    </Link>
  )

  if (isError) {
    return (
      <div>
        <PageHeader title="Beat change request" actions={back} />
        <RequestDetailError
          error={error}
          entityType="beat_change"
          entityId={id}
          label="beat change request"
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  // A locked day can no longer be changed at all, so approval WILL be refused —
  // the admin is told here rather than being allowed to discover it via a 409.
  const blocked = request?.dayLocked === true
  const isPending = request?.status === 'pending'

  return (
    <div>
      <PageHeader
        title="Beat change request"
        description="What the rep has asked to swap on a planned day. Approving moves the day — the new beat takes the old one's place in the walk."
        actions={back}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {isLoading || !request ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-10 w-full max-w-md" />
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
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {planDateLabel(request.planDate)}
                  </p>
                </div>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 font-medium text-rose-600 dark:text-rose-400">
                <Route className="size-4 shrink-0" />
                {request.fromBeatName ?? `Beat #${request.fromBeatId}`}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Route className="size-4 shrink-0" />
                {request.toBeatName ?? `Beat #${request.toBeatId}`}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Why he is asking
              </p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {request.reason}
              </p>
            </div>

            {blocked && isPending ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>
                  A visit has already landed on this day, so it can no longer be
                  changed — approving would be refused. Reject it with a reason the rep
                  can act on.
                </span>
              </p>
            ) : null}

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
              {request.rejectionReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your reason
                  </dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">
                    {request.rejectionReason}
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
                  disabled={review.isPending || blocked}
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
        onOpenChange={setConfirmApprove}
        icon={Check}
        title="Approve this beat change?"
        description={
          request ? (
            <>
              <span className="font-medium text-foreground">
                {request.toBeatName ?? `Beat #${request.toBeatId}`}
              </span>{' '}
              will take the place of{' '}
              <span className="font-medium text-foreground">
                {request.fromBeatName ?? `Beat #${request.fromBeatId}`}
              </span>{' '}
              on {planDateLabel(request.planDate)}. The old beat's planned stops go with
              it.
            </>
          ) : undefined
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
        title="Reject this beat change?"
        description={
          request ? (
            <>
              The day stays on{' '}
              <span className="font-medium text-foreground">
                {request.fromBeatName ?? `Beat #${request.fromBeatId}`}
              </span>
              . Your reason is what the rep reads back in the app.
            </>
          ) : undefined
        }
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={review.isPending}
        confirmDisabled={rejectReason.trim() === ''}
        keepOpenOnConfirm
        onConfirm={reject}
      >
        <div className="text-left">
          <label
            htmlFor="beat-change-detail-reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="beat-change-detail-reject-reason"
            autoFocus
            maxLength={1000}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why can't this beat be swapped?"
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
