import { Check } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { flagCodeLabel } from '../lib/journey-metrics'
import type { FlagSeverity, JourneyPlan } from '../types'

/** Chip colour by worst severity — a low-only plan shouldn't shout red. */
const TONE = {
  high: 'bg-destructive/12 text-destructive',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-muted text-muted-foreground',
} as const

/** Codes that mean a beat (or a whole day) goes uncovered. */
const HIGH_CODES = new Set(['beat_under_covered', 'day_missing_beat'])

/**
 * How loudly the row should read. The queue row carries codes rather than facts,
 * so the code is all there is to judge on — the exposure behind each one is in the
 * plan detail.
 */
function worstSeverity(codes: string[]): FlagSeverity | null {
  if (!codes.length) return null
  if (codes.some((code) => HIGH_CODES.has(code))) return 'high'
  return codes.length > 1 ? 'medium' : 'low'
}

/** How many codes the tooltip lists before collapsing into "+n more". */
const LIST_LIMIT = 5

/**
 * Flag count for a plan, with the reasons on hover — the count alone tells a
 * reviewer nothing about whether it's a real problem. `flagCount` is the total
 * *including* the server's rolled-up remainder, so it can exceed the code list.
 */
export function FlagsCell({ plan }: { plan: JourneyPlan }) {
  const severity = plan.flagCount > 0 ? (worstSeverity(plan.flagCodes) ?? 'medium') : null

  if (!severity) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" />
        Clean
      </span>
    )
  }

  const shown = plan.flagCodes.slice(0, LIST_LIMIT)
  const rest = plan.flagCodes.length - shown.length

  return (
    <Hint
      side="left"
      label={
        <span className="block max-w-64 space-y-1 text-xs">
          {shown.length ? (
            shown.map((code) => (
              <span key={code} className="block">
                {flagCodeLabel(code)}
              </span>
            ))
          ) : (
            <span className="block">Open the plan to see what was flagged.</span>
          )}
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
        {plan.flagCount}
      </span>
    </Hint>
  )
}
