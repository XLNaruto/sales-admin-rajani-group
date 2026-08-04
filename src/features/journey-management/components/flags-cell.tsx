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

/** Codes that mean beats — or a whole month — go unworked. */
const HIGH_CODES = new Set(['no_beats_allocated', 'beat_not_allocated'])
/** Usually deliberate: the office pinned a holiday. Never the loudest thing here. */
const LOW_CODES = new Set(['pinned_on_non_working_day'])

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
 * These **gate nothing**: there is no approval step, so a flagged allocation is as
 * live as a clean one. This is a marker, never a blocking state.
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
        <span className="block max-w-64 space-y-1 text-xs">
          {shown.map((flag, i) => (
            <span key={`${flag.code}-${i}`} className="block">
              {flagCodeLabel(flag.code)}
              {/* The exposure, not just the fact — outlets are what a skipped beat
                  actually costs, and the row has no other room to say it. */}
              {flag.outletCount != null && flag.outletCount > 0 ? (
                <span className="opacity-70"> · {flag.outletCount} outlets</span>
              ) : null}
            </span>
          ))}
          {rest > 0 ? <span className="block opacity-70">+{rest} more</span> : null}
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex min-w-7 cursor-default items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
          TONE[severity],
        )}
      >
        {flags.length}
      </span>
    </Hint>
  )
}
