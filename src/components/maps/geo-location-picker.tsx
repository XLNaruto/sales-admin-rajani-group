import { useEffect, useRef, useState } from 'react'
import { Check, Crosshair, Layers, Loader2, MapPin } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { PlaceSearchInput } from './place-search-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

/** Default map center when nothing is picked yet (Gujarat region). */
const DEFAULT_CENTER = { lat: 22.3, lng: 70.8 }

/** Parse a "lat, lng" string into coordinates, or null if malformed. */
function parseLatLng(value?: string): google.maps.LatLngLiteral | null {
  if (!value) return null
  const [latStr, lngStr] = value.split(',').map((s) => s.trim())
  const lat = Number(latStr)
  const lng = Number(lngStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/** Format coordinates into the stored "lat, lng" string (6 decimals). */
const formatLatLng = (p: google.maps.LatLngLiteral) =>
  `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`

const toLiteral = (p: google.maps.LatLng | google.maps.LatLngLiteral) =>
  typeof (p as google.maps.LatLng).lat === 'function'
    ? { lat: (p as google.maps.LatLng).lat(), lng: (p as google.maps.LatLng).lng() }
    : (p as google.maps.LatLngLiteral)

interface GeoLocationPickerProps {
  /** Stored value as "lat, lng". */
  value?: string
  onChange: (value: string) => void
}

/**
 * Geo-location field: search for a place inline, or open the full "Choose
 * location" map dialog to click/drag a pin. The value is stored as a
 * "lat, lng" string.
 */
export function GeoLocationPicker({ value, onChange }: GeoLocationPickerProps) {
  const [open, setOpen] = useState(false)
  // Address label shown in the search box (from an inline pick or a map pick).
  const [label, setLabel] = useState('')
  const hasValue = Boolean(parseLatLng(value))

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <PlaceSearchInput
          className="flex-1"
          displayValue={label}
          onSelect={({ lat, lng, label }) => {
            onChange(formatLatLng({ lat, lng }))
            setLabel(label)
          }}
          onClear={() => {
            onChange('')
            setLabel('')
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <MapPin className="size-4" /> Pick on map
        </button>
      </div>

      {hasValue ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <MapPin className="size-3.5" />
          {value}
        </span>
      ) : (
        <p className="text-xs text-muted-foreground">
          Search above or pick a point on the map.
        </p>
      )}

      {open ? (
        <LocationDialog
          initial={value}
          onCancel={() => setOpen(false)}
          onSave={(v, address) => {
            onChange(v)
            setLabel(address)
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

/* ----------------------------- The map dialog ---------------------------- */

interface LocationDialogProps {
  initial?: string
  onCancel: () => void
  onSave: (value: string, address: string) => void
}

function LocationDialog({ initial, onCancel, onSave }: LocationDialogProps) {
  const { ready, status } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const [draft, setDraft] = useState(initial ?? '')
  const [address, setAddress] = useState('')
  const [satellite, setSatellite] = useState(false)

  const draftPos = parseLatLng(draft)

  // Reverse-geocode to a human address (needs the Geocoding API; degrades to
  // coords-only if unavailable).
  const reverseGeocode = (p: google.maps.LatLngLiteral) => {
    geocoderRef.current?.geocode({ location: p }, (results, gStatus) => {
      setAddress(gStatus === 'OK' && results?.[0] ? results[0].formatted_address : '')
    })
  }

  /** Drop the pin at a point and record it as the draft. */
  const applyPoint = (p: google.maps.LatLngLiteral, pan = false) => {
    markerRef.current?.setPosition(p)
    if (pan) {
      mapRef.current?.panTo(p)
      mapRef.current?.setZoom(16)
    }
    setDraft(formatLatLng(p))
    reverseGeocode(p)
  }

  // Initialise the map, marker and geocoder on open.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return

    const initialPos = parseLatLng(initial)
    const map = new google.maps.Map(containerRef.current, {
      center: initialPos ?? DEFAULT_CENTER,
      zoom: initialPos ? 15 : 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeId: 'roadmap',
    })
    const marker = new google.maps.Marker({
      map,
      position: initialPos ?? undefined,
      draggable: true,
    })
    geocoderRef.current = new google.maps.Geocoder()

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) applyPoint(toLiteral(e.latLng))
    })
    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      if (pos) applyPoint(toLiteral(pos))
    })

    mapRef.current = map
    markerRef.current = marker
    if (initialPos) reverseGeocode(initialPos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, initial])

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      applyPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true)
    })
  }

  const toggleSatellite = () => {
    const next = !satellite
    setSatellite(next)
    mapRef.current?.setMapTypeId(next ? 'hybrid' : 'roadmap')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent showClose onClose={onCancel} className="flex max-w-5xl flex-col gap-0 p-0">
        <div className="border-b border-border px-6 py-4 pr-12">
          <DialogTitle>Choose location</DialogTitle>
          <DialogDescription>
            Search an address, click the map, drag the pin, or use your current location.
          </DialogDescription>
        </div>

        {/* Toolbar */}
        <div className="flex items-stretch gap-2 px-6 pt-4">
          <PlaceSearchInput
            className="flex-1"
            displayValue={address}
            onSelect={({ lat, lng }) => applyPoint({ lat, lng }, true)}
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm transition-colors hover:bg-accent"
          >
            <Crosshair className="size-4" /> My location
          </button>
          <button
            type="button"
            onClick={toggleSatellite}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent ${
              satellite ? 'border-primary text-primary' : 'border-input'
            }`}
          >
            <Layers className="size-4" /> Satellite
          </button>
        </div>

        {/* Map */}
        <div className="px-6 pt-3">
          <div className="relative h-[55vh] overflow-hidden rounded-lg border border-input">
            {status === 'error' ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                Couldn't load the map. Try again later.
              </div>
            ) : (
              <>
                <div ref={containerRef} className="h-full w-full" />
                {!ready && (
                  <div className="absolute inset-0 grid place-items-center bg-muted/40 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected-location bar */}
        <div className="flex items-center gap-3 px-6 py-4">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">
              {address || (draftPos ? 'Selected location' : 'No location selected yet')}
            </p>
            {draft ? (
              <p className="text-xs text-muted-foreground tabular-nums">{draft}</p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-input px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft, address)}
            disabled={!draftPos}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="size-4" /> Save location
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
