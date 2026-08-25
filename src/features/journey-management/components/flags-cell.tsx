import { Check } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { flagCodeLabel } from '../lib/journey-metrics'
import type { FlagSeverity, PlanFlag } from '../types'

/** Chip colour by worst severity — a low-only row shouldn't shout red. */
const TONE = {
  high: 'bg-destructive/12 text-destructive',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-muted text-muted-foreground',
} as const

/**
 * **Nothing here blocks a transition any more.** A partial allocation is the
 * normal state, so publish no longer wants the counts to add up and approve no
 * longer re-checks them — the row's job is to say what is worth a look, and how
 * much.
 *
 * A month with no distributor at all is the one thing that certainly needs the
 * admin: nothing about it says where the sales incharge is meant to sell.
 */
const HIGH_CODES = new Set(['no_distributors_allocated'])
/**
 * The two that are ordinary facts about a healthy month: a published month he has
 * not started, and the days he filled in himself. Never the loudest thing on the
 * row.
 */
const LOW_CODES = new Set(['awaiting_schedule', 'schedule_unallocated'])

/** How loudly the row should read, from the codes the server sent. */
function worstSeverity(flags: PlanFlag[]): FlagSeverity | null {
  if (!flags.length) return null
  if (flags.some((flag) => HIGH_CODES.has(flag.code))) return 'high'
  if (flags.every((flag) => LOW_CODES.has(flag.code))) return 'low'
  return 'medium'
}

/** How many flags the tooltip lists before collapsing into "+n more". */
const LIST_LIMIT = 5

/**
 * The row's warnings, with the reasons on hover — the count alone tells an admin
 * nothing about whether any of it is a real problem.
 *
 * There is no blocking marker: none of these stops the month, and a slash that
 * implied otherwise would send an admin looking for a gate that is not there.
 * Severity alone carries how much attention the row wants.
 */
export function FlagsCell({ flags }: { flags: PlanFlag[] }) {
  const severity = worstSeverity(flags)

  if (!severity) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" />
        Clean
      </span>
    )
  }

  const shown = flags.slice(0, LIST_LIMIT)
  const rest = flags.length - shown.length

  return (
    <Hint
      side="left"
      label={
        <span className="block max-w-72 space-y-1 text-xs">
          {shown.map((flag, i) => (
            <span key={`${flag.code}-${i}`} className="block">
              {flagCodeLabel(flag.code)}
              {/* The bucket the flag points at — a mismatch on Halvad Traders and
                  one on Morbi Agencies are two different jobs, and the row has no
                  other room. */}
              {(flag.distributorName ?? flag.cityName ?? flag.activityName) ? (
                <span className="opacity-70">
                  {' '}
                  · {flag.distributorName ?? flag.cityName ?? flag.activityName}
                </span>
              ) : null}
            </span>
          ))}
          {rest > 0 ? <span className="block opacity-70">+{rest} more</span> : null}
          <span className="mt-1 block opacity-70">
            Advisory — none of these stops the month.
          </span>
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex min-w-7 cursor-default items-center justify-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
          TONE[severity],
        )}
      >
        {flags.length}
      </span>
    </Hint>
  )
}
