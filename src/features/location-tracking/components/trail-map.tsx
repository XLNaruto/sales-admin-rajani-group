import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Circle, Flag, Goal, Loader2, MapPinOff, ShieldAlert } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { markerBadge } from '@/components/maps/marker-icon'
import { MapLayersControl } from '@/components/maps/map-layers-control'
import { cn } from '@/lib/utils'
import { MOCK_VISUAL } from '../lib/fix-visuals'
import { fixTime, toMapPoint } from '../lib/location-format'
import { TrailPointPopup } from './fix-popup'
import type { TrailPoint } from '../types'

const PIN_SIZE = 22
const PIN_SIZE_SELECTED = 34
const END_PIN_SIZE = 30
const FOCUS_ZOOM = 17
const FIT_PADDING = 56

/** The recorded trail: a white casing under a blue line, the way Maps draws one. */
const TRAIL_CASING = '#ffffff'
const TRAIL_COLOR = '#1a73e8'

const TRAIL_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

/** Which way the day ran, as arrowheads riding an invisible line over the route. */
function directionArrows(): google.maps.IconSequence {
  return {
    icon: {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 2.6,
      fillColor: TRAIL_CASING,
      fillOpacity: 1,
      strokeColor: TRAIL_COLOR,
      strokeOpacity: 1,
      strokeWeight: 1.5,
    },
    offset: '40px',
    repeat: '150px',
  }
}

/**
 * One rep's recorded day, drawn in the order it was recorded.
 *
 * `points` arrives oldest-first and is drawn exactly as given — the polyline IS
 * the sequence, so re-sorting it would draw a different day. `path` may be a
 * thinned copy for very long days; every point stays inspectable in the timeline
 * beside the map, and **every mock-flagged point is drawn regardless of the
 * thinning**, since those are the ones the map exists to point at.
 *
 * The line is a straight-hop trail between fixes, not a road route: nothing here
 * snaps it to the road network, because inventing the stretch between two
 * samples would be inventing evidence.
 */
export function TrailMap({
  path,
  points,
  selectedId,
  onSelect,
  /** Re-fit the view when this changes — the rep, or the day. */
  fitKey,
  isLoading = false,
  className,
  height = 460,
}: {
  path: TrailPoint[]
  points: TrailPoint[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  fitKey: string
  isLoading?: boolean
  className?: string
  height?: number
}) {
  const { ready, status } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoRef = useRef<google.maps.InfoWindow | null>(null)
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([])
  const markersRef = useRef(new Map<string, google.maps.Marker>())
  /** The info window's content node — React is portalled into it (see below). */
  const contentRef = useRef<HTMLDivElement | null>(null)
  if (contentRef.current === null && typeof document !== 'undefined') {
    contentRef.current = document.createElement('div')
  }
  const fittedKeyRef = useRef<string | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  /** Drawn markers: the thinned path, plus every mock hit, plus the two ends. */
  const drawn = useMemo(() => {
    const byId = new Map<string, TrailPoint>()
    for (const point of path) byId.set(point.id, point)
    for (const point of points) if (point.isFakeLocation) byId.set(point.id, point)
    const first = points[0]
    const last = points[points.length - 1]
    if (first) byId.set(first.id, first)
    if (last) byId.set(last.id, last)
    return [...byId.values()]
  }, [path, points])

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 22.3, lng: 70.8 },
      zoom: 7,
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      styles: TRAIL_MAP_STYLE,
    })
    infoRef.current = new google.maps.InfoWindow()
    // Maps' own ✕ closes the window without telling us — clearing the selection
    // here is what lets the same marker be clicked open a second time.
    infoRef.current.addListener('closeclick', () => onSelect(null))
    mapRef.current.addListener('click', () => onSelect(null))
    setMap(mapRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const overlay of overlaysRef.current) overlay.setMap(null)
    overlaysRef.current = []
    markersRef.current.clear()
    infoRef.current?.close()

    const overlays: (google.maps.Marker | google.maps.Polyline)[] = []
    const bounds = new google.maps.LatLngBounds()

    const line = path
      .map((point) => toMapPoint(point.latitude, point.longitude))
      .filter((point): point is google.maps.LatLngLiteral => point !== null)

    if (line.length > 1) {
      overlays.push(
        new google.maps.Polyline({
          map,
          path: line,
          geodesic: false,
          strokeColor: TRAIL_CASING,
          strokeOpacity: 0.95,
          strokeWeight: 8,
          zIndex: 1,
        }),
        new google.maps.Polyline({
          map,
          path: line,
          geodesic: false,
          strokeColor: TRAIL_COLOR,
          strokeOpacity: 0.95,
          strokeWeight: 5,
          zIndex: 2,
        }),
        new google.maps.Polyline({
          map,
          path: line,
          geodesic: false,
          strokeOpacity: 0,
          zIndex: 3,
          icons: [directionArrows()],
        }),
      )
    }
    for (const point of line) bounds.extend(point)

    const firstId = points[0]?.id
    const lastId = points[points.length - 1]?.id

    for (const point of drawn) {
      const position = toMapPoint(point.latitude, point.longitude)
      if (!position) continue
      const selected = point.id === selectedId
      const isFirst = point.id === firstId
      const isLast = point.id === lastId && points.length > 1

      const icon = point.isFakeLocation
        ? markerBadge({
            icon: ShieldAlert,
            fill: MOCK_VISUAL.color,
            ring: '#ffffff',
            glyph: '#ffffff',
            size: selected ? PIN_SIZE_SELECTED : END_PIN_SIZE,
            emphasis: selected,
          })
        : isFirst || isLast
          ? markerBadge({
              icon: isFirst ? Flag : Goal,
              fill: '#ffffff',
              ring: isFirst ? '#16a34a' : '#dc2626',
              glyph: isFirst ? '#16a34a' : '#dc2626',
              size: selected ? PIN_SIZE_SELECTED : END_PIN_SIZE,
              emphasis: selected,
            })
          : markerBadge({
              // A plain breadcrumb carries no glyph of its own — a dot on the
              // line is all it means.
              icon: Circle,
              fill: TRAIL_COLOR,
              ring: '#ffffff',
              glyph: TRAIL_COLOR,
              size: selected ? PIN_SIZE_SELECTED : PIN_SIZE,
              emphasis: selected,
            })

      const marker = new google.maps.Marker({
        map,
        position,
        title: fixTime(point.recordedAt) ?? undefined,
        // Mock hits sit above the ordinary breadcrumbs; the selection above all.
        zIndex: selected ? 8 : point.isFakeLocation ? 6 : isFirst || isLast ? 5 : 4,
        icon,
      })
      marker.addListener('click', () => onSelect(point.id))
      overlays.push(marker)
      markersRef.current.set(point.id, marker)
      bounds.extend(position)
    }

    overlaysRef.current = overlays

    if (line.length && fittedKeyRef.current !== fitKey) {
      fittedKeyRef.current = fitKey
      if (line.length === 1) {
        map.setCenter(bounds.getCenter())
        map.setZoom(15)
      } else {
        map.fitBounds(bounds, FIT_PADDING)
      }
    }

    return () => {
      for (const overlay of overlays) overlay.setMap(null)
    }
  }, [drawn, path, points, selectedId, fitKey, onSelect])

  // Pan to (and open) whichever point the timeline has selected.
  useEffect(() => {
    const map = mapRef.current
    const info = infoRef.current
    if (!map || !info) return
    if (!selectedId) {
      info.close()
      return
    }
    const marker = markersRef.current.get(selectedId)
    if (!marker) return
    info.setContent(contentRef.current)
    info.open({ map, anchor: marker })
    map.panTo(marker.getPosition() as google.maps.LatLng)
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM)
  }, [selectedId, points])

  /** The point whose popup is open. */
  const selectedPoint = points.find((point) => point.id === selectedId) ?? null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-card',
        className,
      )}
      style={{ height }}
    >
      <div ref={containerRef} className="size-full" />
      <MapLayersControl map={map} />

      {/* The popup lives in the React tree, portalled into the info window's own
          node, so it can look the position's place up and follow the theme. */}
      {selectedPoint && contentRef.current
        ? createPortal(<TrailPointPopup point={selectedPoint} />, contentRef.current)
        : null}

      <div className="absolute right-3 top-3 z-10 rounded-xl border border-border/60 bg-card/95 p-2.5 text-[11px] shadow-lg backdrop-blur">
        <LegendRow color="#16a34a" label="First fix" />
        <LegendRow color="#1a73e8" label="Recorded fix" />
        <LegendRow color="#dc2626" label="Fake location" />
        <p className="mt-1.5 max-w-[10rem] border-t border-border/60 pt-1.5 text-muted-foreground">
          GPS trail (recorded) — not a road route.
        </p>
      </div>

      {(!ready || isLoading) && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-background/70 text-sm text-muted-foreground backdrop-blur-[1px]">
          {status === 'error' ? (
            <span>Map could not be loaded.</span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading map…
            </span>
          )}
        </div>
      )}

      {ready && !isLoading && points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/95 px-5 py-4 text-center shadow-lg backdrop-blur">
            <MapPinOff className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No positions recorded on this date
            </p>
            <p className="text-xs text-muted-foreground">
              The handset reported nothing on this day.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span
        className="size-2.5 shrink-0 rounded-full border-2"
        style={{ borderColor: color }}
      />
      <span className="font-medium text-foreground">{label}</span>
    </div>
  )
}
