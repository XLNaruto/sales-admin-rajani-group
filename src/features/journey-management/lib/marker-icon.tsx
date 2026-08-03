import { renderToStaticMarkup } from 'react-dom/server'
import type { LucideIcon } from 'lucide-react'

/**
 * Lucide glyphs as Google Maps marker icons.
 *
 * Maps draws markers on a canvas, so a React icon can't simply be rendered into
 * one — but it *can* be rendered to SVG markup and handed over as a data URI.
 * Doing that keeps the legend chip and the pin it explains on one definition
 * (`visit-kinds.ts`) instead of a lucide component on one side and a hand-copied
 * SVG path on the other, which is exactly the pair that drifts.
 *
 * Markup is generated once per distinct badge and cached: a day redraws its pins
 * on every filter change, and re-serialising the same nine icons each time is
 * pure waste.
 */

const cache = new Map<string, string>()

export type BadgeSpec = {
  icon: LucideIcon
  /** Circle fill — a solid fill is what marks a call as productive. */
  fill: string
  /** Circle outline; also the ring that lifts the pin off the basemap. */
  ring: string
  /** Glyph colour. */
  glyph: string
  /** Full badge width in px. */
  size: number
  /** Ring drawn as dashes — used for outlets the day never reached. */
  dashed?: boolean
  /** Thicker ring, for the selected pin. */
  emphasis?: boolean
}

function dataUri(spec: BadgeSpec): string {
  const { icon: Icon, fill, ring, glyph, size, dashed, emphasis } = spec
  const stroke = emphasis ? 3 : 2
  const radius = size / 2 - stroke / 2
  const glyphSize = Math.round(size * 0.52)
  const offset = (size - glyphSize) / 2

  const markup = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill={fill}
        stroke={ring}
        strokeWidth={stroke}
        strokeDasharray={dashed ? '3 3' : undefined}
      />
      <g transform={`translate(${offset} ${offset})`}>
        <Icon size={glyphSize} color={glyph} strokeWidth={2.25} />
      </g>
    </svg>,
  )
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`
}

/** A badge as a Maps icon, anchored on its own centre so it sits on the point. */
export function markerBadge(spec: BadgeSpec): google.maps.Icon {
  const key = [
    iconKey(spec.icon),
    spec.fill,
    spec.ring,
    spec.glyph,
    spec.size,
    spec.dashed ? 'd' : '',
    spec.emphasis ? 'e' : '',
  ].join('|')

  let url = cache.get(key)
  if (!url) {
    url = dataUri(spec)
    cache.set(key, url)
  }
  return {
    url,
    scaledSize: new google.maps.Size(spec.size, spec.size),
    anchor: new google.maps.Point(spec.size / 2, spec.size / 2),
  }
}

/** Icons are distinguished by their component identity; the name is the label. */
function iconKey(icon: LucideIcon): string {
  return icon.displayName ?? icon.name ?? 'icon'
}
