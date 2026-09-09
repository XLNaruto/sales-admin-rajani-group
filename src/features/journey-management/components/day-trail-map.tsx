import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Flag, Goal, Loader2, MapPinOff } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { useRoadRoute } from '../hooks/use-road-route'
import { markerBadge } from '@/components/maps/marker-icon'
import { TRAIL_END_ID, TRAIL_START_ID } from '../lib/trail-selection'
import { MapLayersControl } from '@/components/maps/map-layers-control'
import {
  kindStyle,
  NOT_VISITED_STYLE,
  PRODUCTIVE_STYLE,
} from '../lib/visit-kinds'
import { MissPopup, TrailEndPopup, VisitPopup } from './trail-popup'
import type { GeoPoint, OutletMarker, VisitMarker } from '../types'

/** Badge widths: the day's pins, and the one that is currently selected. */
const PIN_SIZE = 28
const PIN_SIZE_SELECTED = 38

/** Zoom used when panning to a single selected call. */
const FOCUS_ZOOM = 16

/** Stacking order of the selected pin — above every other marker on the map. */
const SELECTED_Z = 6

/** Padding (px) kept around the trail when the map fits its bounds. */
const FIT_PADDING = 48

/**
 * Google's own shops, temples and transit stops, switched off.
 *
 * Every basemap POI is a pin the reader has to rule out before finding the one
 * that belongs to the trail — and on a market beat they sit right on top of the
 * outlets we drew. Roads and place names stay: those are what make a route
 * legible. Only applies to the roadmap and terrain views; satellite imagery
 * carries no styled labels.
 */
const TRAIL_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

/** The travelled route: a white casing under a blue line, the way Maps draws one. */
const ROUTE_CASING = '#ffffff'
const ROUTE_COLOR = '#1a73e8'

/** Colour of an un-snapped hop — a straight jump between two stops. */
const STRAIGHT_COLOR = '#64748b'

/**
 * Which way the day ran, as arrowheads along the route.
 *
 * A *closed, filled* symbol from Google's own set — the earlier hand-written open
 * chevron (`M -2.5,-3 L 0.5,0 L -2.5,3`) was stroked so thin that it rendered as
 * a broken white triangle and read as a gap in the line rather than an arrow.
 * White fill with a blue casing is the same treatment the line itself gets, so an
 * arrowhead reads as part of the route at every zoom.
 *
 * Drawn on its own transparent polyline stacked over the blue one: icons on the
 * route line itself punch through its stroke where they sit, which is what
 * produced the gap. Built lazily because `SymbolPath` only exists once the Maps
 * API has loaded.
 */
function directionArrows(): google.maps.IconSequence {
  return {
    icon: {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 2.6,
      fillColor: ROUTE_CASING,
      fillOpacity: 1,
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 1,
      strokeWeight: 1.5,
    },
    // Far enough apart to stay a hint rather than a texture, and offset so the
    // first arrow doesn't land on the start flag.
    offset: '40px',
    repeat: '150px',
  }
}

/** The same arrowhead in the dashed hop's slate grey, so it matches its line. */
function straightArrows(): google.maps.IconSequence {
  return {
    icon: {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 2.4,
      fillColor: ROUTE_CASING,
      fillOpacity: 1,
      strokeColor: STRAIGHT_COLOR,
      strokeOpacity: 1,
      strokeWeight: 1.5,
    },
    offset: '50%',
    repeat: '150px',
  }
}

/** Dash used while the route is only straight lines — reads as "not a road path". */
const STRAIGHT_DASH: google.maps.IconSequence = {
  icon: {
    path: 'M 0,-1 L 0,1',
    strokeColor: STRAIGHT_COLOR,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    scale: 3,
  },
  offset: '0',
  repeat: '14px',
}

/**
 * A visit's pin: the same glyph its legend chip carries, in its kind's colour.
 *
 * A call that booked an order flips to a solid amber badge with the legend's own
 * star — filled reads as "productive" at a glance, which is the one thing a
 * manager scans the map for, and it keeps the kind's colour on the ring.
 */
function visitIcon(visit: VisitMarker, selected: boolean): google.maps.Icon {
  const style = kindStyle(visit.kind)
  const size = selected ? PIN_SIZE_SELECTED : PIN_SIZE
  return visit.productive
    ? markerBadge({
        icon: PRODUCTIVE_STYLE.icon,
        fill: PRODUCTIVE_STYLE.color,
        ring: style.color,
        glyph: '#ffffff',
        size,
        emphasis: selected,
      })
    : markerBadge({
        icon: style.icon,
        fill: '#ffffff',
        ring: style.color,
        glyph: style.color,
        size,
        emphasis: selected,
      })
}

/**
 * A planned-but-unreached outlet's pin — a solid slate badge, dashed in white.
 *
 * Filled rather than hollow for the same reason the productive star is: a miss is
 * a thing you scan the map *for*, and an outline pin in a pale grey was reading as
 * part of the basemap. The ring stays dashed — a stop that was planned, not one
 * that happened — but in white, so the dashes carry the shape against both the
 * fill and the tiles under it.
 *
 * Still drawn a little smaller than a call pin, because a miss very often shares a
 * coordinate with one: a shutter found closed is still a call, and its roster entry
 * stays open. The smaller badge on top leaves the call pin's outer ring showing
 * underneath instead of replacing it.
 */
function missIcon(selected: boolean): google.maps.Icon {
  return markerBadge({
    icon: NOT_VISITED_STYLE.icon,
    fill: NOT_VISITED_STYLE.color,
    ring: '#ffffff',
    glyph: '#ffffff',
    dashed: true,
    size: selected ? PIN_SIZE_SELECTED : PIN_SIZE - 4,
    emphasis: selected,
  })
}

/** A punch marker's pin — green flag away, red finish home. */
function endIcon(isStart: boolean, selected: boolean): google.maps.Icon {
  return markerBadge({
    icon: isStart ? Flag : Goal,
    // Green away, red home — the convention every routing map uses.
    fill: isStart ? '#15803d' : '#b91c1c',
    ring: '#ffffff',
    glyph: '#ffffff',
    size: selected ? PIN_SIZE_SELECTED : PIN_SIZE,
    emphasis: selected,
  })
}

/**
 * The day's GPS trail on a Google map.
 *
 * Written against the Maps JS API directly (via the shared `useGoogleMaps`
 * loader, which carries the project's key) rather than through react-leaflet:
 * this map needs per-marker symbols, an info window and imperative panning, and
 * the rest of the portal's real maps — the geo-location picker — already speak
 * this API.
 *
 * The route line is always the *whole* day, even when the legend filters the
 * markers: hiding the path along with the pins would make a filtered map
 * unreadable as a journey. Markers are rebuilt (not diffed) whenever the filtered
 * set changes — a day is at most a few dozen pins, so the simple thing is also
 * the fast thing.
 */
/** One end of the day's trail — where it was punched, when, and roughly where. */
export type TrailEnd = {
  point: GeoPoint
  /** Clock time of the punch, e.g. `09:44 AM`. */
  at: string | null
  /** Reverse-geocoded address, when the punch has one. */
  address: string | null
}

export function DayTrailMap({
  /** Where the day was punched in — drawn as a green flag. */
  start,
  /** Where the day was punched out — drawn as a red finish marker. */
  end,
  /** Every call of the day, in punch order — the route line. */
  route,
  /** Calls the active filter keeps — the markers actually drawn. */
  visits,
  /** Planned stops never reached, when the filter shows them. */
  misses,
  selectedId,
  onSelect,
  /** Road distance of the drawn route, once Directions has snapped all of it. */
  onRoadDistance,
  className,
}: {
  start: TrailEnd | null
  end: TrailEnd | null
  route: VisitMarker[]
  visits: VisitMarker[]
  misses: OutletMarker[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onRoadDistance?: (km: number | null) => void
  className?: string
}) {
  const { ready, status } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const infoRef = useRef<google.maps.InfoWindow | null>(null)
  /** The info window's content node — the popup is portalled into it (below). */
  const contentRef = useRef<HTMLDivElement | null>(null)
  if (contentRef.current === null && typeof document !== 'undefined') {
    contentRef.current = document.createElement('div')
  }
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([])
  /** Visit markers by id, so a selection can pan to and open one. */
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  /** Keeps the auto-fit to one per trail — a selection must not refit the map. */
  const fittedKeyRef = useRef<string | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Source → destination: punch-in, every call in punch order, punch-out.
  const stops = useMemo(
    () => [
      ...(start ? [start.point] : []),
      ...route.map((v) => v.point),
      ...(end ? [end.point] : []),
    ],
    [start, end, route],
  )
  const { segments, snapped, meters, loading: routing } = useRoadRoute(stops, ready)

  // Only report a distance for a fully snapped route: a part-dashed trail would
  // undercount, and a number that quietly means "most of the day" is worse than
  // no number at all.
  useEffect(() => {
    onRoadDistance?.(snapped ? Math.round(meters / 100) / 10 : null)
  }, [snapped, meters, onRoadDistance])

  // The map itself is created once and then mutated; recreating it per render
  // would restart every tile fetch.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 22.3, lng: 70.8 },
      zoom: 7,
      // Plain roadmap by default: named roads are what make a trail readable.
      // Base map and overlays are switched from our own Layers panel, so the
      // stock control stays off.
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      styles: TRAIL_MAP_STYLE,
    })
    infoRef.current = new google.maps.InfoWindow()
    // Maps' own ✕ closes the window without telling us — clearing the selection
    // here is what lets the same pin be clicked open a second time.
    infoRef.current.addListener('closeclick', () => onSelect(null))
    mapRef.current.addListener('click', () => onSelect(null))
    // Published to state as well as the ref: the Layers panel is a React child
    // and needs the instance to re-render against.
    setMap(mapRef.current)
    // `onSelect` is stable enough for this one-shot init; re-running would
    // rebuild the map on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Markers + route line. Rebuilt whenever the drawn set changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Built into locals and published to the refs at the end, so the cleanup
    // tears down exactly the overlays this run created.
    const overlays: (google.maps.Marker | google.maps.Polyline)[] = []
    const markers = new Map<string, google.maps.Marker>()
    for (const overlay of overlaysRef.current) overlay.setMap(null)
    infoRef.current?.close()

    const bounds = new google.maps.LatLngBounds()
    const extend = (point: GeoPoint) => bounds.extend(point)

    // Each stretch draws in its own style, so a day that is mostly road-snapped
    // still reads as a road route with a couple of dashed gaps.
    for (const segment of segments) {
      if (segment.path.length > 1) {
        if (segment.snapped) {
          // Three stacked lines: the white casing gives the blue route an outline
          // against the basemap, and the arrowheads ride an invisible line on top
          // so they sit over an unbroken stroke.
          overlays.push(
            new google.maps.Polyline({
              map,
              path: segment.path,
              geodesic: false,
              strokeColor: ROUTE_CASING,
              strokeOpacity: 0.95,
              strokeWeight: 8,
              zIndex: 1,
            }),
            new google.maps.Polyline({
              map,
              path: segment.path,
              geodesic: false,
              strokeColor: ROUTE_COLOR,
              strokeOpacity: 0.95,
              strokeWeight: 5,
              zIndex: 2,
            }),
            new google.maps.Polyline({
              map,
              path: segment.path,
              geodesic: false,
              strokeOpacity: 0,
              zIndex: 3,
              icons: [directionArrows()],
            }),
          )
        } else {
          // No road path for this hop: dashes make it obvious the line is a
          // straight jump between stops rather than something anyone drove. It
          // still carries arrows — direction is a property of the whole day, not
          // only of the stretches Directions could snap.
          overlays.push(
            new google.maps.Polyline({
              map,
              path: segment.path,
              geodesic: false,
              strokeOpacity: 0,
              zIndex: 1,
              icons: [STRAIGHT_DASH],
            }),
            new google.maps.Polyline({
              map,
              path: segment.path,
              geodesic: false,
              strokeOpacity: 0,
              zIndex: 3,
              icons: [straightArrows()],
            }),
          )
        }
      }
      for (const point of segment.path) extend(point)
    }

    // Punch-in and punch-out. Both are clickable like every other pin, and go
    // through the same selection channel — so clicking the flag highlights its
    // timeline row too, rather than only opening a bubble here.
    for (const [id, trailEnd] of [
      [TRAIL_START_ID, start],
      [TRAIL_END_ID, end],
    ] as const) {
      if (!trailEnd) continue
      const isStart = id === TRAIL_START_ID
      const marker = new google.maps.Marker({
        map,
        position: trailEnd.point,
        title: isStart ? 'Day start' : 'Day end',
        zIndex: 5,
        icon: endIcon(isStart, id === selectedId),
      })
      marker.addListener('click', () => onSelect(id))
      overlays.push(marker)
      markers.set(id, marker)
      extend(trailEnd.point)
    }

    // Above plain call pins (2), below the productive stars (4): a closed-shutter
    // call and its still-open roster entry are the same shop at the same
    // coordinate, and at zIndex 1 the dashed pin was drawn entirely underneath —
    // the NOT VISITED list would count two outlets the map appeared not to have.
    for (const outlet of misses) {
      const marker = new google.maps.Marker({
        map,
        position: outlet.point,
        title: `${outlet.name} — not visited`,
        zIndex: 3,
        icon: missIcon(outlet.id === selectedId),
      })
      marker.addListener('click', () => onSelect(outlet.id))
      overlays.push(marker)
      markers.set(outlet.id, marker)
      extend(outlet.point)
    }

    for (const visit of visits) {
      const marker = new google.maps.Marker({
        map,
        position: visit.point,
        title: `${visit.at ?? `#${visit.daySequence}`} · ${visit.outlet}`,
        zIndex: visit.productive ? 4 : 2,
        icon: visitIcon(visit, visit.id === selectedId),
      })
      marker.addListener('click', () => onSelect(visit.id))
      overlays.push(marker)
      markers.set(visit.id, marker)
      extend(visit.point)
    }

    overlaysRef.current = overlays
    markersRef.current = markers

    // Fit once per drawn set: switching the legend filter is a request to look at
    // *that* slice, so the viewport follows the pins it just changed. Selection is
    // excluded from this effect, so clicking a call still only pans.
    const key = [
      snapped,
      route.length,
      visits.map((visit) => visit.id).join(','),
      misses.map((outlet) => outlet.id).join(','),
    ].join('|')
    if (!bounds.isEmpty() && fittedKeyRef.current !== key) {
      fittedKeyRef.current = key
      map.fitBounds(bounds, FIT_PADDING)
    }

    return () => {
      for (const overlay of overlays) overlay.setMap(null)
      markers.clear()
    }
    // `selectedId` is handled below; including it here would rebuild every
    // marker on each selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, segments, snapped, route, visits, misses, onSelect, start, end])

  // Selection: restyle the pins, pan to the chosen call and open its bubble.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Restyle every pin, and lift whichever one is selected clear of the stack:
    // outlets that share a coordinate (a closed shutter and its open roster
    // entry) would otherwise hide the very pin the selection is pointing at.
    for (const visit of visits) {
      const marker = markersRef.current.get(visit.id)
      if (!marker) continue
      const selected = visit.id === selectedId
      marker.setIcon(visitIcon(visit, selected))
      marker.setZIndex(selected ? SELECTED_Z : visit.productive ? 4 : 2)
    }
    for (const outlet of misses) {
      const marker = markersRef.current.get(outlet.id)
      if (!marker) continue
      const selected = outlet.id === selectedId
      marker.setIcon(missIcon(selected))
      marker.setZIndex(selected ? SELECTED_Z : 3)
    }
    for (const [id, trailEnd] of [
      [TRAIL_START_ID, start],
      [TRAIL_END_ID, end],
    ] as const) {
      const marker = trailEnd && markersRef.current.get(id)
      if (!marker) continue
      const selected = id === selectedId
      marker.setIcon(endIcon(id === TRAIL_START_ID, selected))
      marker.setZIndex(selected ? SELECTED_Z : 5)
    }

    if (!selectedId) {
      infoRef.current?.close()
      return
    }

    // Every kind of pin opens the same way: pan, zoom in if we are further out
    // than a street view of the stop, and hand the info window the node the
    // popup is portalled into. Which popup that is, is decided in the render
    // below — this effect only has to place the window.
    const marker = markersRef.current.get(selectedId)
    if (!marker) return
    const point =
      selectedId === TRAIL_START_ID
        ? start?.point
        : selectedId === TRAIL_END_ID
          ? end?.point
          : (misses.find((outlet) => outlet.id === selectedId)?.point ??
            visits.find((visit) => visit.id === selectedId)?.point)
    if (!point) return

    map.panTo(point)
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM)
    infoRef.current?.setContent(contentRef.current)
    infoRef.current?.open({ map, anchor: marker })
  }, [selectedId, visits, misses, start, end])

  /** Which popup the open bubble is showing. */
  const popup = (() => {
    if (!selectedId) return null
    if (selectedId === TRAIL_START_ID || selectedId === TRAIL_END_ID) {
      const isStart = selectedId === TRAIL_START_ID
      const trailEnd = isStart ? start : end
      return trailEnd ? <TrailEndPopup isStart={isStart} trailEnd={trailEnd} /> : null
    }
    const miss = misses.find((outlet) => outlet.id === selectedId)
    if (miss) return <MissPopup outlet={miss} />
    const visit = visits.find((v) => v.id === selectedId)
    return visit ? <VisitPopup visit={visit} /> : null
  })()

  return (
    <div className={className}>
      {status === 'error' ? (
        <div className="grid h-full place-items-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <MapPinOff className="mx-auto size-6" />
          Couldn’t load the map. Check the Maps key and try again.
        </div>
      ) : (
        <div className="relative h-full w-full">
          <div ref={containerRef} className="h-full w-full" />
          {!ready ? (
            <div className="absolute inset-0 grid place-items-center bg-muted/40 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : null}
          <MapLayersControl map={map} />
          {/* The popup lives in the React tree, portalled into the info window's
              own node, so it can look the stop's place up and follow the theme. */}
          {popup && contentRef.current
            ? createPortal(popup, contentRef.current)
            : null}
          {ready && routing ? (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-background/90 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <Loader2 className="size-3.5 animate-spin" />
              Building road route…
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
