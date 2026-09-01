/**
 * One definition of how a fix reads — colour, label and the sentence that
 * explains it — shared by the map markers, the list chips and the legend.
 *
 * The wording matters as much as the colour here. `is_stale` is a display hint,
 * not an accusation (a rep in a signal dead zone trips it), and
 * `is_fake_location` is the handset's *own* report of a mock provider, so both
 * are described in terms of what was observed rather than what it might mean.
 */
import { CircleDot, CircleSlash, Radio, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { FixState } from '../types'

export interface FixVisual {
  label: string
  /** One-line explanation — used as the chip's tooltip and in the legend. */
  hint: string
  icon: LucideIcon
  /** Hex, for the map marker (the SDK draws on a canvas, not in CSS). */
  color: string
  /** Tailwind classes for the list chip. */
  chip: string
}

export const FIX_VISUALS: Record<FixState, FixVisual> = {
  fresh: {
    label: 'Live',
    hint: 'Reported within the last 15 minutes.',
    icon: Radio,
    color: '#16a34a',
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  stale: {
    label: 'Stale',
    hint: 'Last fix is more than 15 minutes old — this also happens in a signal dead zone.',
    icon: CircleDot,
    color: '#94a3b8',
    chip: 'border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-300',
  },
  'no-signal': {
    label: 'No signal today',
    hint: 'Nothing has been reported by this handset on this day — there is no position to place on the map.',
    icon: CircleSlash,
    color: '#f59e0b',
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
}

/** The mock-location flag's own visual — deliberately the loudest on the screen. */
export const MOCK_VISUAL: FixVisual = {
  label: 'Fake location',
  hint: 'Fake location reported by the device. This is the handset’s own report, stored as sent — not a verdict.',
  icon: ShieldAlert,
  color: '#dc2626',
  chip: 'border-destructive/40 bg-destructive/10 text-destructive',
}

/**
 * The same flag seen anywhere in the DAY rather than on the latest fix.
 *
 * Deliberately quieter than `MOCK_VISUAL`: the handset is reporting honestly
 * *now*, so the row is a history to look at, not a live alarm. Kept as a
 * separate visual so the two can never be read as the same statement.
 */
export const MOCK_DAY_VISUAL: FixVisual = {
  label: 'Fake earlier today',
  hint: 'Some of this rep’s fixes today were reported with a mock location, though the latest one was not. Open the trail to see which.',
  icon: ShieldAlert,
  color: '#f97316',
  chip: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

/** The map legend, in the order it reads. */
export const FLEET_LEGEND: FixVisual[] = [
  FIX_VISUALS.fresh,
  FIX_VISUALS.stale,
  MOCK_VISUAL,
  FIX_VISUALS['no-signal'],
]
