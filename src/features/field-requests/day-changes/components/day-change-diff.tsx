/**
 * The day-change comparison — what the date holds now beside what it would
 * hold.
 *
 * Lives on its own because two screens answer the same question: the queue's
 * dialog and the notification deep-link page. A screen showing only the
 * proposal is asking the admin to approve a replacement without showing what is
 * being replaced, so neither of them is allowed to drift from the other.
 */
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Route,
  UserRound,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DayChange, DayChangeCurrentEntry, DayChangeEntry } from '../types'

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

        {entry.beats.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Route className="size-3.5 shrink-0 text-muted-foreground" />
            {/* A beat that has since been removed comes back without a name, so
                the id is the fallback rather than a blank chip. */}
            {entry.beats.map((beat) => (
              <span
                key={beat.id}
                className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                {beat.name ?? `Beat #${beat.id}`}
              </span>
            ))}
          </div>
        ) : null}

        {entry.visitDistributors.length > 0 ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0 translate-y-px" />
            {/* Named rather than counted: "3 distributors to call on" told the
                admin nothing he could weigh the ask against. */}
            <span className="min-w-0">
              {entry.visitDistributors
                .map((d) => d.name ?? `Distributor #${d.id}`)
                .join(', ')}
            </span>
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
export function DayDiff({ request, replaces }: { request: DayChange; replaces: boolean }) {
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
