import { MapPin, ShieldAlert } from 'lucide-react'
import { PlacePreviewCard, usePlaceAtPoint } from '@/features/places'
import { cn } from '@/lib/utils'
import { fixStamp, fixTime, lastSeenLabel, toMapPoint } from '../lib/location-format'
import type { FleetFix, TrailPoint } from '../types'

/**
 * What a marker opens on the tracking maps.
 *
 * The ledger's own facts come first — who, when, which beat, and whether the
 * handset reported a mock provider — and the Google place is context *under*
 * them. The order is deliberate: the place is the nearest one to a coordinate,
 * not a record of where the rep was, and a card that led with a shop name would
 * quietly turn a 60-metre guess into a claim.
 *
 * The lookup only runs while a popup is open (these components mount on
 * selection), so panning a map full of pins costs nothing.
 */

/** Our own line above the place — the shape both popups share. */
function FixHeader({
  title,
  lines,
  mock,
}: {
  title: string
  lines: (string | null)[]
  mock: boolean
}) {
  return (
    <div className="space-y-0.5 border-b border-border/60 pb-2">
      <p className="font-heading text-sm font-semibold leading-snug">{title}</p>
      {lines
        .filter((line): line is string => Boolean(line))
        .map((line) => (
          <p key={line} className="text-xs text-muted-foreground">
            {line}
          </p>
        ))}
      {mock && (
        <p
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-destructive/40',
            'bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive',
          )}
        >
          <ShieldAlert className="size-3" />
          Fake location reported by device
        </p>
      )}
    </div>
  )
}

/** The Live Fleet Map's marker popup: one rep's latest fix. */
export function FleetFixPopup({ fix }: { fix: FleetFix }) {
  const point = toMapPoint(fix.latitude, fix.longitude)
  const place = usePlaceAtPoint(fix.latitude, fix.longitude)

  return (
    <PlacePreviewCard
      place={place.place}
      isLoading={place.isLoading}
      isEmpty={place.isEmpty}
      destination={point}
      header={
        <FixHeader
          title={fix.salesInchargeName}
          lines={[
            fix.employeeCode ? `#${fix.employeeCode}` : null,
            lastSeenLabel(fix),
            fix.recordedAt ? fixStamp(fix.recordedAt) : null,
            fix.beatName ? `Beat: ${fix.beatName}` : null,
          ]}
          mock={fix.isFakeLocation}
        />
      }
    />
  )
}

/** The Rep Day Trail's marker popup: one recorded position. */
export function TrailPointPopup({ point }: { point: TrailPoint }) {
  const coords = toMapPoint(point.latitude, point.longitude)
  const place = usePlaceAtPoint(point.latitude, point.longitude)

  return (
    <PlacePreviewCard
      place={place.place}
      isLoading={place.isLoading}
      isEmpty={place.isEmpty}
      destination={coords}
      header={
        <FixHeader
          title={fixTime(point.recordedAt) ?? 'Recorded position'}
          lines={[
            point.beatName ? `Beat: ${point.beatName}` : 'Outside any beat',
            // The coordinate exactly as the ledger holds it — never rounded
            // through a float on the way to this line.
            `${point.latitude}, ${point.longitude}`,
          ]}
          mock={point.isFakeLocation}
        />
      }
    />
  )
}

/** Shown in place of the card when a focused rep has no position to preview. */
export function NoFixPopup({ fix }: { fix: FleetFix }) {
  return (
    <div className="w-[17rem] max-w-full space-y-1.5 bg-card p-3.5 text-card-foreground">
      <p className="font-heading text-sm font-semibold">{fix.salesInchargeName}</p>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-px size-3.5 shrink-0" />
        Nothing has been reported by this handset today, so there is no position to
        show.
      </p>
    </div>
  )
}
