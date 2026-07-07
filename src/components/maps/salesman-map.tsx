import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import { env } from '@/config/env'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
  status?: 'online' | 'offline' | 'suspicious'
}

const STATUS_COLOR: Record<string, string> = {
  online: '#16a34a',
  offline: '#94a3b8',
  suspicious: '#dc2626',
}

/**
 * Leaflet map for GPS tracking. Renders salesman positions as coloured
 * circle markers and an optional route polyline.
 */
export function SalesmanMap({
  points,
  route,
  center = [22.3, 70.8],
  zoom = 11,
  height = 460,
}: {
  points: MapPoint[]
  route?: [number, number][]
  center?: [number, number]
  zoom?: number
  height?: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url={env.VITE_MAP_TILE_URL}
          attribution='&copy; OpenStreetMap contributors'
        />
        {route && route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: '#6366f1', weight: 3 }} />
        )}
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pathOptions={{
              color: STATUS_COLOR[p.status ?? 'online'],
              fillColor: STATUS_COLOR[p.status ?? 'online'],
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <strong>{p.label}</strong>
              <br />
              {p.status ?? 'online'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
