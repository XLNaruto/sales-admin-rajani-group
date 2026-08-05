import { Ban, Check } from 'lucide-react'
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
 * The three flags that **mirror a server refusal**: `allocation_incomplete`
 * refuses publish, the other two refuse approve. These genuinely stop the month,
 * so they are the only ones that read as high.
 */
const BLOCKING_CODES = new Set([
  'allocation_incomplete',
  'schedule_unallocated',
  'schedule_mismatch',
])
/** Nothing allocated at all — publish will fail too, so it belongs with them. */
const HIGH_CODES = new Set([...BLOCKING_CODES, 'no_cities_allocated'])
/**
 * A published month the sales incharge has not started dating is a normal Tuesday, not a
 * fault — never the loudest thing on the row.
 */
const LOW_CODES = new Set(['awaiting_schedule'])

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
 * nothing about whether it is a real problem.
 *
 * A row carrying a blocking flag gets a **slash marker** as well as the count, so
 * "this month cannot move on" is distinguishable at a glance from "this month
 * wants a look". Which transition it blocks is in the tooltip.
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

  const blocking = flags.filter((flag) => BLOCKING_CODES.has(flag.code)).length
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
              {/* The bucket the flag points at — a mismatch on Rajkot and one on
                  Morbi are two different jobs, and the row has no other room. */}
              {(flag.cityName ?? flag.activityName) ? (
                <span className="opacity-70">
                  {' '}
                  · {flag.cityName ?? flag.activityName}
                </span>
              ) : null}
            </span>
          ))}
          {rest > 0 ? <span className="block opacity-70">+{rest} more</span> : null}
          {blocking > 0 ? (
            <span className="mt-1 block font-medium">
              {blocking === 1 ? 'One of these blocks' : `${blocking} of these block`} the
              next step.
            </span>
          ) : null}
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex min-w-7 cursor-default items-center justify-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
          TONE[severity],
        )}
      >
        {blocking > 0 ? <Ban className="size-3 shrink-0" aria-label="Blocking" /> : null}
        {flags.length}
      </span>
    </Hint>
  )
}
