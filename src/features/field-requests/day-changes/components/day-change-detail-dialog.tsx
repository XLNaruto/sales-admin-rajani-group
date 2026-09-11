import { format, parseISO } from 'date-fns'
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  Lock,
  Route,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import type { DayChange, DayChangeCurrentEntry, DayChangeEntry } from '../types'

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
  // "N/A", not a dash: an unanswered request is a real state, and a bare rule
  // under a heading reads as a field that failed to load.
  if (!iso) return 'N/A'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

/**
 * One piece of work — proposed, or already on the date.
 *
 * `tone` is what carries the comparison: the same card in red is work an
 * approval drops, in green work it writes, and plain for work that is kept
 * whichever way the request is answered.
 */
function EntryCard({
  entry,
  tone = 'neutral',
  badges,
}: {
  entry: DayChangeEntry
  tone?: 'neutral' | 'removed' | 'added'
  /** Short flags — "visited", "fixed by you", "kept". */
  badges?: string[]
}) {
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border p-3',
        // Dark mode needs more of the tint to read at all — 5% of a colour on
        // a near-black card is indistinguishable from the card.
        tone === 'removed' && 'border-destructive/30 bg-destructive/5 dark:bg-destructive/15',
        tone === 'added' &&
          'border-emerald-600/30 bg-emerald-600/5 dark:border-emerald-500/40 dark:bg-emerald-500/15',
        tone === 'neutral' && 'border-border/60 bg-muted/30',
      )}
    >
      {/* The walking order, toned with the card: a plain white disc on a tinted
          card read as a stray bullet rather than as step 1 of the day. */}
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold leading-none tabular-nums',
          tone === 'removed' &&
            'border-destructive/40 bg-destructive/10 text-destructive dark:border-red-400/50 dark:bg-red-400/15 dark:text-red-300',
          tone === 'added' &&
            'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-400/15 dark:text-emerald-300',
          tone === 'neutral' && 'border-border bg-background text-muted-foreground',
        )}
      >
        {entry.sequence}
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
          {/* Full-strength in every tone: the card's tint already says which
              side it is on, and muting the name made it the dimmest text in the
              dialog against a dark card. */}
          <span className="text-foreground">
            {entry.activityName ?? `Activity #${entry.activityId}`}
          </span>
          {badges?.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {badge}
            </span>
          ))}
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

/** The flags a current entry carries, as short chips. */
function currentBadges(entry: DayChangeCurrentEntry): string[] {
  const badges: string[] = []
  if (entry.visited) badges.push('visited')
  if (entry.fixedByAdmin) badges.push('fixed by you')
  if (!entry.willBeReplaced) badges.push('kept')
  return badges
}

/** One side of the comparison. */
function DiffColumn({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <ClipboardList className="size-3.5" />
        {title} ({count})
      </p>
      {count === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">{children}</ul>
      )}
    </div>
  )
}

/**
 * What the date holds now, beside what it would hold — the comparison the
 * decision actually turns on.
 *
 * Side by side rather than paired row-by-row on purpose: the two lists are not
 * an edit of each other. An `update` REPLACES the un-worked part of the day
 * wholesale, so pairing "entry 1" with "entry 1" would invent a correspondence
 * the server does not make. A `create` has no left-hand side to speak of — the
 * day is kept in full — so it stays a single list.
 */
function DayDiff({ request, replaces }: { request: DayChange; replaces: boolean }) {
  const current = request.currentEntries

  if (!replaces || current.length === 0) {
    return (
      <DiffColumn
        title={replaces ? 'Proposed instead' : 'Proposed in addition'}
        count={request.entries.length}
        empty="Nothing proposed — approving clears the day's un-worked entries."
      >
        {request.entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} tone={replaces ? 'added' : 'neutral'} />
        ))}
      </DiffColumn>
    )
  }

  const dropped = current.filter((entry) => entry.willBeReplaced).length

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <DiffColumn
          title="On the plan now"
          count={current.length}
          empty="The date holds nothing yet."
        >
          {current.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              // Only what the server says it will drop is struck through: a
              // visited entry survives the approval and must not read as lost.
              tone={entry.willBeReplaced ? 'removed' : 'neutral'}
              badges={currentBadges(entry)}
            />
          ))}
        </DiffColumn>

        {/* Turns with the layout: across the two columns on a wide dialog, down
            between them once they stack. */}
        <span className="grid size-7 shrink-0 place-items-center self-center rounded-full border border-border bg-card text-primary shadow-sm">
          <ArrowRight className="size-3.5 rotate-90 sm:rotate-0" />
        </span>

        <DiffColumn
          title="After approving"
          count={request.entries.length}
          empty="Nothing — approving clears the day's un-worked entries."
        >
          {request.entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} tone="added" />
          ))}
        </DiffColumn>
      </div>

      <p className="text-xs text-muted-foreground">
        {dropped === 0
          ? 'Nothing on the date would be dropped — every entry there is already worked or fixed by you.'
          : `Approving drops ${dropped} of ${current.length} ${
              current.length === 1 ? 'entry' : 'entries'
            } and writes ${request.entries.length} in its place.`}
      </p>
    </div>
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
      {/* Wider than the usual dialog: on a replacement it carries two
          columns of work side by side. */}
      <DialogContent className="max-w-3xl" showClose onClose={onClose}>
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

            <DayDiff request={request} replaces={replaces} />

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
