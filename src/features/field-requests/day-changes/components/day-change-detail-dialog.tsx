import { format, parseISO } from 'date-fns'
import { Building2, Check, ClipboardList, Lock, Route, UserRound, Users, X } from 'lucide-react'
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
import type { DayChange, DayChangeEntry } from '../types'

/** A `yyyy-MM-dd` plan date as "Tue, 04 Aug 2026" (falls back to the raw value). */
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
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

/** One proposed piece of work, in the order the rep means to walk it. */
function EntryCard({ entry }: { entry: DayChangeEntry }) {
  return (
    <li className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-background text-xs font-medium text-muted-foreground tabular-nums">
        {entry.sequence}
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium text-foreground">
          {entry.activityName ?? `Activity #${entry.activityId}`}
        </p>

        {entry.distributorName || entry.distributorId != null ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" />
            <span className="truncate">
              {entry.distributorName ?? `Distributor #${entry.distributorId}`}
            </span>
          </p>
        ) : null}

        {entry.beatIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Route className="size-3.5 shrink-0 text-muted-foreground" />
            {/* `beatNames` only carries the ids that resolve, so the id is the
                fallback rather than a blank chip. */}
            {entry.beatIds.map((id, i) => (
              <span
                key={id}
                className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                {entry.beatNames[i] ?? `Beat #${id}`}
              </span>
            ))}
          </div>
        ) : null}

        {entry.distributorIds.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            {entry.distributorIds.length} distributor
            {entry.distributorIds.length === 1 ? '' : 's'} to call on
          </p>
        ) : null}

        {entry.jointWorkingSalesInchargeId != null ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="size-3.5 shrink-0" />
            Joint working with #{entry.jointWorkingSalesInchargeId}
          </p>
        ) : null}

        {/* The note that would travel onto the scheduled row — not the ask. */}
        {entry.reason ? (
          <p className="text-xs italic text-muted-foreground">“{entry.reason}”</p>
        ) : null}
      </div>
    </li>
  )
}

interface Props {
  /** The request to show; `null` closes the dialog. */
  request: DayChange | null
  onClose: () => void
  /** Approve/reject, offered only while the request is still open. */
  onApprove: (request: DayChange) => void
  onReject: (request: DayChange) => void
  canApprove: boolean
}

/**
 * The whole ask: the date, what would happen to it, and every piece of work the
 * rep is proposing with activity, distributor and beat names resolved.
 *
 * The list endpoint already sends the entries, so this opens off the row rather
 * than re-reading — there is no by-id read for a day change. The API re-checks
 * everything at review time regardless, so a request another admin has answered
 * in the meantime is refused there with a `409`.
 */
export function DayChangeDetailDialog({
  request,
  onClose,
  onApprove,
  onReject,
  canApprove,
}: Props) {
  const open = request !== null
  const isPending = request?.status === 'pending'
  const replaces = request?.operation === 'update'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xl" showClose onClose={onClose}>
        {/* Room for the close button that DialogContent pins to the corner. */}
        <DialogHeader className="pr-10">
          <DialogTitle>Day change request</DialogTitle>
          <DialogDescription>
            Nothing has been written yet. Approving is the only thing that changes the
            day — {replaces
              ? 'these entries REPLACE the work you allocated'
              : 'these entries are ADDED beside the work already there'}
            .
          </DialogDescription>
        </DialogHeader>

        {!request ? null : (
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {/* Null once the rep has been removed — the request outlives him. */}
                    {request.salesInchargeName ?? 'Removed sales incharge'}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{planDateLabel(request.date)}</span>
                    {request.dayLocked ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3" /> a visit has landed
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Why he is asking
              </p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {request.reason}
              </p>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ClipboardList className="size-3.5" />
                {replaces ? 'Proposed instead' : 'Proposed in addition'} (
                {request.entries.length})
              </p>
              {request.entries.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {/* An `update` with nothing proposed is a request to clear the day. */}
                  Nothing proposed — approving clears the day's un-worked entries.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {request.entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </ul>
              )}
            </div>

            {request.dayLocked ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                A visit has already landed on this day. That is not a refusal — the
                entries he has visited against are kept whichever way you answer, and
                only the un-worked part of the day can move.
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
          </div>
        )}

        <DialogFooter className="mt-6 gap-2 sm:justify-end">
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Close
          </Button>
          {/* Only an open request can be answered. */}
          {canApprove && request && isPending ? (
            <>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={() => onReject(request)}
              >
                <X /> Reject
              </Button>
              <Button className="cursor-pointer" onClick={() => onApprove(request)}>
                <Check /> Approve
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
