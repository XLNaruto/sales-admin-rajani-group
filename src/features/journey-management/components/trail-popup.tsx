import { PlacePreviewCard, usePlaceAtPoint } from '@/features/places'
import { kindLabel } from '../lib/visit-kinds'
import { durationLabel } from '../lib/journey-format'
import type { TrailEnd } from './day-trail-map'
import type { OutletMarker, VisitMarker } from '../types'

/**
 * What a Day Trail pin opens — the same preview card the tracking maps use.
 *
 * Our own facts about the stop come first (which outlet, at what time, on whose
 * beat, and whether it booked), and the Google place sits *under* them as
 * context. The order is the same one the Live Fleet Map keeps, and for the same
 * reason: the place is the nearest one to a coordinate, so a card that led with
 * a shop name would quietly promote a lookup into a record of where the sales
 * incharge stood.
 *
 * Every one of these components mounts only while its bubble is open, so the
 * Places lookup — a billed call — runs per opened pin rather than per drawn pin.
 */

/** Our own lines above the place — the shape all three popups share. */
function TrailHeader({ title, lines }: { title: string; lines: (string | null)[] }) {
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
    </div>
  )
}

/** A call on the trail: the outlet, when it happened, and what came of it. */
export function VisitPopup({ visit }: { visit: VisitMarker }) {
  const place = usePlaceAtPoint(String(visit.point.lat), String(visit.point.lng))
  const dwell = durationLabel(visit.dwellSeconds)

  return (
    <PlacePreviewCard
      place={place.place}
      isLoading={place.isLoading}
      isEmpty={place.isEmpty}
      destination={visit.point}
      header={
        <TrailHeader
          title={visit.outlet}
          lines={[
            [visit.at ?? `#${visit.daySequence}`, kindLabel(visit.kind), visit.beatName]
              .filter(Boolean)
              .join(' · '),
            [visit.productive ? 'Productive' : 'No order', dwell]
              .filter(Boolean)
              .join(' · '),
          ]}
        />
      }
    />
  )
}

/** A planned stop the day never reached — no time, because nothing happened. */
export function MissPopup({ outlet }: { outlet: OutletMarker }) {
  const place = usePlaceAtPoint(String(outlet.point.lat), String(outlet.point.lng))

  return (
    <PlacePreviewCard
      place={place.place}
      isLoading={place.isLoading}
      isEmpty={place.isEmpty}
      destination={outlet.point}
      header={
        <TrailHeader
          title={outlet.name}
          lines={[
            `${outlet.stopType} · not visited`,
            outlet.plannedSequence != null ? `Planned stop #${outlet.plannedSequence}` : null,
          ]}
        />
      }
    />
  )
}

/** A punch marker: where and when the day was started or closed. */
export function TrailEndPopup({
  isStart,
  trailEnd,
}: {
  isStart: boolean
  trailEnd: TrailEnd
}) {
  const place = usePlaceAtPoint(String(trailEnd.point.lat), String(trailEnd.point.lng))

  return (
    <PlacePreviewCard
      place={place.place}
      isLoading={place.isLoading}
      isEmpty={place.isEmpty}
      destination={trailEnd.point}
      header={
        <TrailHeader
          title={isStart ? 'Day start' : 'Day end'}
          lines={[
            trailEnd.at ? `Punched ${isStart ? 'in' : 'out'} at ${trailEnd.at}` : null,
            // The punch's own reverse-geocoded address, kept distinct from the
            // place's: this is where the handset was, not what stands there.
            trailEnd.address ? `Punch address: ${trailEnd.address}` : null,
          ]}
        />
      }
    />
  )
}
