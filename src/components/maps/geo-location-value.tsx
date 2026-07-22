import { useEffect, useState } from 'react'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { reverseGeocode } from '@/lib/reverse-geocode'

/** Parse a "lat, lng" string into coordinates, or null if malformed. */
function parseLatLng(value?: string | null): google.maps.LatLngLiteral | null {
  if (!value) return null
  const [latStr, lngStr] = value.split(',').map((s) => s.trim())
  const lat = Number(latStr)
  const lng = Number(lngStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

interface GeoLocationValueProps {
  /** Stored value as "lat, lng". */
  value?: string | null
}

/**
 * Read-only display of a stored geo-location: reverse-geocodes the coordinates
 * to a place name (shown above the raw "lat, lng"). Falls back to just the
 * coordinates while the name loads or when geocoding is unavailable.
 */
export function GeoLocationValue({ value }: GeoLocationValueProps) {
  const { ready } = useGoogleMaps()
  const [name, setName] = useState('')
  const parsed = parseLatLng(value)

  useEffect(() => {
    if (!ready || !parsed) return
    let active = true
    reverseGeocode(parsed).then((addr) => {
      if (active) setName(addr)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value])

  if (!parsed) return <>—</>

  return (
    <span className="block">
      {name && <span className="block break-words">{name}</span>}
      <span className="block text-xs text-muted-foreground tabular-nums">
        {value}
      </span>
    </span>
  )
}
