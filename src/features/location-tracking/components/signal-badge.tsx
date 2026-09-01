import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import { FIX_VISUALS, MOCK_DAY_VISUAL, MOCK_VISUAL } from '../lib/fix-visuals'
import { fixState, lastSeenLabel } from '../lib/location-format'
import type { FleetFix } from '../types'

/**
 * The freshness of a rep's latest fix, as a chip.
 *
 * A rep with nothing reported today gets its own chip rather than being hidden:
 * "nobody has heard from Ramesh today" is the most important thing this screen
 * says, and it has no marker on the map to say it with.
 */
export function SignalBadge({ fix, className }: { fix: FleetFix; className?: string }) {
  const state = fixState(fix)
  const visual = FIX_VISUALS[state]
  const Icon = visual.icon

  return (
    <Hint label={visual.hint}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
          visual.chip,
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        {state === 'no-signal' ? visual.label : lastSeenLabel(fix)}
      </span>
    </Hint>
  )
}

/**
 * The device's mock-location report.
 *
 * Worded as *reported* on purpose: the flag is what the handset said about
 * itself, and the panel stores it as sent. It is not a fraud verdict.
 *
 * Two states, never merged: `live` is the LATEST fix carrying the flag (the loud
 * one — the marker on the map is spoofed right now), while the quiet variant
 * means only earlier fixes carried it. `count` is the whole day's tally, so a
 * rep who spoofed once and a rep who spoofed forty times don't read alike.
 */
export function MockBadge({
  live = true,
  count,
  className,
}: {
  /** True when the latest fix itself is flagged. False = earlier fixes only. */
  live?: boolean
  /** Fixes flagged across the tracked day. Shown when it says more than the chip. */
  count?: number
  className?: string
}) {
  const visual = live ? MOCK_VISUAL : MOCK_DAY_VISUAL
  const Icon = visual.icon

  return (
    <Hint
      label={
        count && count > 0
          ? `${visual.hint} ${count} of today’s fixes ${count === 1 ? 'is' : 'are'} flagged.`
          : visual.hint
      }
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
          visual.chip,
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        {live ? 'Fake location' : 'Fake earlier today'}
        {count != null && count > 0 && (
          <span className="rounded-full bg-current/15 px-1.5 tabular-nums">{count}</span>
        )}
      </span>
    </Hint>
  )
}
