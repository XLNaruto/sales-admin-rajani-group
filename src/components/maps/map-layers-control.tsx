import { useEffect, useState } from 'react'
import { Layers, Map as MapIcon, Mountain, Satellite } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The map's Layers panel — the base map the trail is drawn on.
 *
 * Built in React rather than as a `google.maps` custom control: it is ordinary
 * portal chrome and should pick up the app's tokens (radius, border, dark mode)
 * like every other floating panel.
 *
 * Base map only. Google's traffic / transit / bicycling overlays were dropped:
 * they describe live conditions in the city today, not the day being audited, and
 * their own colours sit on top of the trail line the map exists to show.
 */

type MapTypeId = 'roadmap' | 'satellite' | 'hybrid' | 'terrain'

const MAP_TYPES: { id: MapTypeId; label: string; icon: typeof MapIcon }[] = [
  { id: 'roadmap', label: 'Default', icon: MapIcon },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'hybrid', label: 'Hybrid', icon: Layers },
  { id: 'terrain', label: 'Terrain', icon: Mountain },
]

/** One tile in the panel — a small icon over its label, active state outlined. */
function LayerTile({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: typeof MapIcon
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex w-16 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[11px] font-medium transition',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

export function MapLayersControl({ map }: { map: google.maps.Map | null }) {
  const [open, setOpen] = useState(false)
  const [mapType, setMapType] = useState<MapTypeId>('roadmap')

  useEffect(() => {
    map?.setMapTypeId(mapType)
  }, [map, mapType])

  if (!map) return null

  return (
    <div className="absolute bottom-3 left-3 z-10">
      {open ? (
        <div className="flex items-stretch gap-2 rounded-xl border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur">
          <div className="flex gap-1">
            {MAP_TYPES.map((type) => (
              <LayerTile
                key={type.id}
                label={type.label}
                icon={type.icon}
                active={mapType === type.id}
                onClick={() => setMapType(type.id)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="self-stretch rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/95 px-2.5 py-2 text-xs font-medium shadow-lg backdrop-blur hover:bg-muted"
        >
          <Layers className="size-4" />
          Layers
        </button>
      )}
    </div>
  )
}
