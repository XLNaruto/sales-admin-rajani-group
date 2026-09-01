import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPinOff } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { markerBadge } from '@/components/maps/marker-icon'
import { MapLayersControl } from '@/components/maps/map-layers-control'
import { cn } from '@/lib/utils'
import { FIX_VISUALS, FLEET_LEGEND, MOCK_VISUAL } from '../lib/fix-visuals'
import { fixState, toMapPoint } from '../lib/location-format'
import { FleetFixPopup } from './fix-popup'
import type { FleetFix } from '../types'

/** Badge widths: an ordinary marker, and the one the list has focused. */
const PIN_SIZE = 28
const PIN_SIZE_FOCUSED = 38

/** Zoom used when panning to one rep. */
const FOCUS_ZOOM = 16

/** Padding (px) kept around the fleet when the map fits its bounds. */
const FIT_PADDING = 56

/**
 * Google's own shops and transit stops, switched off — every basemap POI is a
 * pin the reader has to rule out before finding the one that belongs to a rep.
 */
const FLEET_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

/**
 * A rep's pin: their freshness colour, or the mock-location red when the handset
 * reported a mock provider — that flag is the reason the field exists, so it
 * outranks freshness on the map.
 */
function fixIcon(fix: FleetFix, focused: boolean): google.maps.Icon {
  const visual = fix.isFakeLocation ? MOCK_VISUAL : FIX_VISUALS[fixState(fix)]
  return markerBadge({
    icon: visual.icon,
    fill: '#ffffff',
    ring: visual.color,
    glyph: visual.color,
    size: focused ? PIN_SIZE_FOCUSED : PIN_SIZE,
    emphasis: focused,
  })
}

/**
 * Where the team is on the tracked day.
 *
 * Written against the Maps JS API directly (via the shared `useGoogleMaps`
 * loader, which carries the project's key) for the same reason the day-trail map
 * is: per-marker symbols, an info window and imperative panning.
 *
 * **Reps with no fix have no marker, and that is not a bug** — there is no
 * coordinate to draw. They are still rows in the list beside this map, which is
 * where "no signal today" gets said. That is also why the marker count and the
 * list's row count differ, and why neither is the team's size.
 */
export function FleetMap({
  fixes,
  focusedId,
  onFocus,
  /** Re-fit the view when this changes — the day, or the page of reps. */
  fitKey,
  isLoading = false,
  className,
  height = 420,
}: {
  fixes: FleetFix[]
  focusedId: string | null
  onFocus: (id: string | null) => void
  fitKey: string
  isLoading?: boolean
  className?: string
  height?: number
}) {
  const { ready, status } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoRef = useRef<google.maps.InfoWindow | null>(null)
  const markersRef = useRef(new Map<string, google.maps.Marker>())
  /**
   * The info window's content node. Created once and handed to Maps, with React
   * portalled into it — so the popup is a real component (themed, with its own
   * queries) rather than a string of HTML built by hand.
   */
  const contentRef = useRef<HTMLDivElement | null>(null)
  if (contentRef.current === null && typeof document !== 'undefined') {
    contentRef.current = document.createElement('div')
  }
  /** Keeps the auto-fit to one per (day, page): a click must not refit the map. */
  const fittedKeyRef = useRef<string | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Only rows carrying a coordinate pair can be drawn. Parsed here, at the
  // drawing boundary — the row keeps its strings.
  const drawable = useMemo(
    () =>
      fixes
        .map((fix) => ({ fix, point: toMapPoint(fix.latitude, fix.longitude) }))
        .filter((entry): entry is { fix: FleetFix; point: google.maps.LatLngLiteral } =>
          entry.point !== null,
        ),
    [fixes],
  )

  // Created once and then mutated; recreating it per render would restart every
  // tile fetch.
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
      styles: FLEET_MAP_STYLE,
    })
    infoRef.current = new google.maps.InfoWindow()
    // Maps' own ✕ closes the window without telling us — clearing the selection
    // here is what lets the same marker be clicked open a second time.
    infoRef.current.addListener('closeclick', () => onFocus(null))
    mapRef.current.addListener('click', () => onFocus(null))
    // Published to state too: the Layers panel is a React child and needs the
    // instance to render against.
    setMap(mapRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Markers. Rebuilt rather than diffed — a page is at most 100 pins, so the
  // simple thing is also the fast one.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const marker of markersRef.current.values()) marker.setMap(null)
    infoRef.current?.close()

    // Built into a local map and published to the ref at the end, so the
    // cleanup tears down exactly the markers this run created.
    const markers = new Map<string, google.maps.Marker>()
    const bounds = new google.maps.LatLngBounds()
    for (const { fix, point } of drawable) {
      const marker = new google.maps.Marker({
        map,
        position: point,
        title: fix.salesInchargeName,
        // A mock-flagged pin sits above the rest: it is what the screen is
        // scanned for.
        zIndex: fix.isFakeLocation ? 4 : fixState(fix) === 'fresh' ? 3 : 2,
        icon: fixIcon(fix, fix.salesInchargeId === focusedId),
      })
      marker.addListener('click', () => onFocus(fix.salesInchargeId))
      markers.set(fix.salesInchargeId, marker)
      bounds.extend(point)
    }
    markersRef.current = markers

    // One fit per day/page. Re-fitting on a selection would yank the map away
    // from wherever the user had panned it.
    if (drawable.length && fittedKeyRef.current !== fitKey) {
      fittedKeyRef.current = fitKey
      if (drawable.length === 1) {
        map.setCenter(bounds.getCenter())
        map.setZoom(14)
      } else {
        map.fitBounds(bounds, FIT_PADDING)
      }
    }

    return () => {
      for (const marker of markers.values()) marker.setMap(null)
    }
  }, [drawable, focusedId, fitKey, onFocus])

  // Pan to (and open) whichever rep the list has focused.
  useEffect(() => {
    const map = mapRef.current
    const info = infoRef.current
    if (!map || !info) return
    if (!focusedId) {
      info.close()
      return
    }
    const marker = markersRef.current.get(focusedId)
    if (!marker) {
      // Focusing a rep with no fix is a legitimate click — there is simply
      // nothing on the map to pan to. The list row says the rest.
      info.close()
      return
    }
    info.setContent(contentRef.current)
    info.open({ map, anchor: marker })
    map.panTo(marker.getPosition() as google.maps.LatLng)
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM)
  }, [focusedId, drawable])

  /** The rep whose popup is open, if their fix can be drawn. */
  const focusedFix =
    drawable.find((entry) => entry.fix.salesInchargeId === focusedId)?.fix ?? null

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

      {/* Rendered into the info window's own node, so the popup lives in the
          React tree — it can run its place lookup and follow the app's theme. */}
      {focusedFix && contentRef.current
        ? createPortal(<FleetFixPopup fix={focusedFix} />, contentRef.current)
        : null}

      {/* Legend — the four things a pin (or its absence) can mean. */}
      <div className="absolute right-3 top-3 z-10 rounded-xl border border-border/60 bg-card/95 p-2.5 text-[11px] shadow-lg backdrop-blur">
        {FLEET_LEGEND.map((visual) => (
          <div key={visual.label} className="flex items-center gap-1.5 py-0.5">
            <span
              className="size-2.5 shrink-0 rounded-full border-2"
              style={{ borderColor: visual.color }}
            />
            <span className="font-medium text-foreground">{visual.label}</span>
          </div>
        ))}
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

      {ready && !isLoading && drawable.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/95 px-5 py-4 text-center shadow-lg backdrop-blur">
            <MapPinOff className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No positions to plot</p>
            <p className="text-xs text-muted-foreground">
              Nobody on this page has reported a position on this day. They are still
              listed below.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
