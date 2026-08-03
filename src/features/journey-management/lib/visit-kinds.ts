/**
 * The day trail's marker vocabulary — one entry per legend chip.
 *
 * Colours are literal hex rather than theme tokens because Google Maps draws
 * markers on a canvas: a CSS variable can't reach it. They're kept here, next to
 * the labels, so the legend swatch, the timeline dot and the marker on the map
 * are guaranteed to be the same colour rather than three hand-matched copies.
 *
 * The palette is chosen against the map's own light tiles (the map keeps its
 * roadmap styling in both themes), and every colour is distinguishable from its
 * neighbours in shape *and* hue — a filter you can't read is not a filter.
 */
import {
  Ban,
  Briefcase,
  Footprints,
  Phone,
  Signpost,
  Star,
  Store,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import type { TrailFilter, VisitKind } from '../types'

export interface TrailMarkerStyle {
  key: TrailFilter
  label: string
  color: string
  /**
   * The same colour lifted for a dark surface. `color` is tuned against the
   * map's light tiles, which leaves the deeper hues (navy OVT, violet
   * distributor) almost unreadable on a dark chip — so UI that sits on the app's
   * background uses this instead. The map itself always uses `color`.
   */
  darkColor: string
  /** Star markers are the "productive" overlay; everything else is a dot. */
  shape: 'dot' | 'star'
  /**
   * Legend glyph. Colour alone separates nine categories only for people who
   * see all nine hues — the icon carries the same distinction on its own, and
   * survives the chip being greyed out at a count of zero.
   */
  icon: LucideIcon
}

const KIND_STYLES: Record<VisitKind, TrailMarkerStyle> = {
  'in-turn': {
    key: 'in-turn',
    label: 'In turn',
    color: '#0f766e',
    darkColor: '#5eead4',
    shape: 'dot',
    icon: Footprints,
  },
  telephonic: {
    key: 'telephonic',
    label: 'Telephonic',
    color: '#2dd4bf',
    darkColor: '#2dd4bf',
    shape: 'dot',
    icon: Phone,
  },
  ovt: {
    key: 'ovt',
    label: 'OVT',
    color: '#1e3a8a',
    darkColor: '#93c5fd',
    shape: 'dot',
    icon: Signpost,
  },
  ovc: {
    key: 'ovc',
    label: 'OVC',
    color: '#dc2626',
    darkColor: '#fca5a5',
    shape: 'dot',
    icon: Store,
  },
  'joint-working': {
    key: 'joint-working',
    label: 'Joint working',
    color: '#a16207',
    darkColor: '#fcd34d',
    shape: 'dot',
    icon: Users,
  },
  distributor: {
    key: 'distributor',
    label: 'Distributor',
    color: '#7c3aed',
    darkColor: '#c4b5fd',
    shape: 'dot',
    icon: Warehouse,
  },
  'official-work': {
    key: 'official-work',
    label: 'Official work',
    color: '#db2777',
    darkColor: '#f9a8d4',
    shape: 'dot',
    icon: Briefcase,
  },
}

/**
 * Roster outlets the day never reached — a solid slate badge with a "no entry"
 * glyph.
 *
 * Was a hollow slate-400 dot carrying `CircleDashed`, and it disappeared: a pale
 * outline glyph inside an already-dashed ring is two dashed circles fighting each
 * other at 24px, on light map tiles, with no fill to separate it from the road
 * underneath. A miss is one of the two things a manager actually looks for, so it
 * gets the same treatment as the productive star — filled, with a white glyph —
 * and the slate is darkened to slate-600 so white on it stays readable.
 */
export const NOT_VISITED_STYLE: TrailMarkerStyle = {
  key: 'not-visited',
  label: 'Not visited',
  color: '#475569',
  darkColor: '#cbd5e1',
  shape: 'dot',
  icon: Ban,
}

/** Calls that booked an order — drawn over their own kind's dot as a star. */
export const PRODUCTIVE_STYLE: TrailMarkerStyle = {
  key: 'productive',
  label: 'Productive',
  color: '#d97706',
  darkColor: '#fbbf24',
  shape: 'star',
  icon: Star,
}

/** Legend order — the kinds a manager scans first come first. */
export const TRAIL_LEGEND: TrailMarkerStyle[] = [
  KIND_STYLES['in-turn'],
  KIND_STYLES.telephonic,
  KIND_STYLES.ovt,
  KIND_STYLES.ovc,
  KIND_STYLES['joint-working'],
  NOT_VISITED_STYLE,
  KIND_STYLES.distributor,
  KIND_STYLES['official-work'],
  PRODUCTIVE_STYLE,
]

export function kindStyle(kind: VisitKind): TrailMarkerStyle {
  return KIND_STYLES[kind]
}

export function kindLabel(kind: VisitKind): string {
  return KIND_STYLES[kind].label
}

/** Every visit kind, in legend order — the counting order too. */
export const VISIT_KINDS: VisitKind[] = [
  'in-turn',
  'telephonic',
  'ovt',
  'ovc',
  'joint-working',
  'distributor',
  'official-work',
]
