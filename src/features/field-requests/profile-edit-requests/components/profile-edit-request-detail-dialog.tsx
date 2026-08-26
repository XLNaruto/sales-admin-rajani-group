import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, IdCard, Phone, UserRound, X } from 'lucide-react'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useProfileEditRequest } from '../api/use-profile-edit-requests'
import type { ProfileEditRequest } from '../types'

/** An ISO-8601 timestamp as "25 Jun 2026, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

/** A labelled read-only field. Spans both columns when `wide`. */
function Field({
  label,
  value,
  wide,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{value ?? 'N/A'}</dd>
    </div>
  )
}

interface Props {
  /** The request to show; `null` closes the dialog. */
  request: ProfileEditRequest | null
  onClose: () => void
  /** Approve/reject, offered only while the request is still open. */
  onApprove: (request: ProfileEditRequest) => void
  onReject: (request: ProfileEditRequest) => void
  canApprove: boolean
}

/**
 * The full ask, the rep who made it, and the answer if it has one.
 *
 * Re-reads the request by id on open rather than trusting the row behind it:
 * another admin may have answered it while the queue sat on screen, and the API
 * refuses a second answer with a `409`. The row is still used as the initial
 * paint so the dialog never opens empty.
 */
export function ProfileEditRequestDetailDialog({
  request,
  onClose,
  onApprove,
  onReject,
  canApprove,
}: Props) {
  const open = request !== null
  const { data, isLoading, isError, error } = useProfileEditRequest(request?.id ?? null)

  // Prefer the freshly-read record; fall back to the row while it loads.
  const view = data ?? request
  const isPending = view?.status === 'pending'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg" showClose onClose={onClose}>
        {/* Room for the close button that DialogContent pins to the corner. */}
        <DialogHeader className="pr-10">
          <DialogTitle>Profile edit request</DialogTitle>
          <DialogDescription>
            Approving records that you'll make the change — the correction itself is
            still made on the sales incharge's record.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Couldn't load this request."}
          </p>
        ) : !view ? null : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {view.salesInchargeName ?? 'Removed sales incharge'}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {view.employeeCode ? (
                      <span className="inline-flex items-center gap-1">
                        <IdCard className="size-3.5" />#{view.employeeCode}
                      </span>
                    ) : null}
                    {view.salesInchargePhone ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Phone className="size-3.5" />
                        {view.salesInchargePhone}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {/* A stale badge here would be the one thing worth getting wrong,
                  so it waits for the re-read rather than showing the row's. */}
              {isLoading && !data ? (
                <Skeleton className="h-6 w-20 rounded-full" />
              ) : (
                <StatusBadge status={view.status} />
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What the rep asked for
              </p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {view.message}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Requested" value={stampLabel(view.requestedAt)} />
              <Field label="Answered" value={stampLabel(view.reviewedAt)} />
              {view.reviewReason ? (
                <Field label="Your note" value={view.reviewReason} wide />
              ) : null}
            </dl>
          </div>
        )}

        <DialogFooter className="mt-6 gap-2 sm:justify-end">
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Close
          </Button>
          {/* Only an open request can be answered — and only once the re-read
              has confirmed it is still open. */}
          {canApprove && view && isPending && !isLoading ? (
            <>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={() => onReject(view)}
              >
                <X /> Reject
              </Button>
              <Button className="cursor-pointer" onClick={() => onApprove(view)}>
                <Check /> Approve
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
