import type { ReactNode } from 'react'
import { Clock, ExternalLink, MapPin, Phone, Star } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { placePhotoUrl } from '../api/places-api'
import type { PlaceDetails } from '../types'

/** Five stars, filled to the rating — halves are rounded to the nearer half. */
function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating * 2) / 2
  return (
    <span className="inline-flex items-center gap-px" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={cn(
            'size-3',
            step <= filled
              ? 'fill-amber-400 text-amber-400'
              : step - 0.5 === filled
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-transparent text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  )
}

interface PlacePreviewCardProps {
  place: PlaceDetails | null
  isLoading?: boolean
  /** The lookup succeeded and there is no place here — not an error. */
  isEmpty?: boolean
  /**
   * Our own facts about this point, rendered above the place — the rep and the
   * time are what the popup is actually about; the place is context for them.
   */
  header?: ReactNode
  /** Coordinates the Directions link falls back to when the place has no URI. */
  destination?: { lat: number; lng: number } | null
  className?: string
}

/**
 * A place, previewed the way Google previews one: photo, name, rating,
 * category, address, whether it is open, and the two things anyone actually
 * does next — directions and a phone call.
 *
 * Every field is optional on the wire and each is dropped rather than faked: a
 * place with no ratings shows no stars, one that publishes no hours shows no
 * open/closed line (which is a different fact from "closed"), and one with no
 * photo simply starts at its name — an empty grey band says nothing a reader
 * needed to know, and costs the card its whole top edge to say it.
 *
 * It is credited to Google in the footer because that is where it came from —
 * this is not our record of the shop, and on the tracking maps in particular it
 * must not read as one: it is the nearest place to a GPS fix, not proof of where
 * the rep was standing.
 */
export function PlacePreviewCard({
  place,
  isLoading = false,
  isEmpty = false,
  header,
  destination,
  className,
}: PlacePreviewCardProps) {
  // The info window's close button floats over the top-right of the card. With
  // a photo behind it that is free space; without one it would sit on the first
  // line of text, so the content starts lower instead.
  const hasTopImage = isLoading || Boolean(place?.photoName)

  const directionsHref =
    place?.mapsUri ??
    (destination
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`
      : null)

  return (
    <div
      className={cn(
        // Never scrolls: the card is opened inside a map bubble, where a scroll
        // track is both ugly and easy to miss. It stays short enough to fit
        // instead — a shallow photo, and an address clamped to two lines.
        'w-[19rem] max-w-full overflow-hidden bg-card text-card-foreground',
        className,
      )}
    >
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-none" />
      ) : place?.photoName ? (
        <img
          src={placePhotoUrl(place.photoName)}
          alt={place.name}
          loading="lazy"
          className="h-24 w-full object-cover"
        />
      ) : null}

      <div className={cn('space-y-1.5 p-3.5', !hasTopImage && 'pt-9')}>
        {header}

        {isLoading ? (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : isEmpty || !place ? (
          <p className="flex items-start gap-1.5 pt-1 text-xs text-muted-foreground">
            <MapPin className="mt-px size-3.5 shrink-0" />
            No place is registered at this position.
          </p>
        ) : (
          <>
            <div>
              <p className="font-heading text-sm font-semibold leading-snug">
                {place.name}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                {place.rating != null && (
                  <>
                    <span className="font-medium text-foreground tabular-nums">
                      {place.rating.toFixed(1)}
                    </span>
                    <Stars rating={place.rating} />
                    <span className="tabular-nums">({place.ratingCount})</span>
                  </>
                )}
                {place.rating != null && place.category && <span>·</span>}
                {place.category && <span>{place.category}</span>}
              </p>
            </div>

            {place.address && (
              // Clamped to two lines — a rural address can run five, and the
              // card must not grow past the bubble it opens in. The full text is
              // one hover away, through the app's own tooltip rather than the
              // browser's black `title` box.
              <Hint label={place.address} side="bottom">
                <p className="line-clamp-2 cursor-default text-xs leading-relaxed text-muted-foreground">
                  {place.address}
                </p>
              </Hint>
            )}

            {place.openNow != null && (
              <p
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium',
                  place.openNow ? 'text-success' : 'text-destructive',
                )}
              >
                <Clock className="size-3.5" />
                {place.openNow ? 'Open now' : 'Closed now'}
              </p>
            )}

            {(directionsHref || place.phone) && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {directionsHref && (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="size-3.5" />
                    Directions
                  </a>
                )}
                {place.phone && (
                  <a
                    href={`tel:${place.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    <Phone className="size-3.5" />
                    {place.phone}
                  </a>
                )}
              </div>
            )}

            <p className="pt-0.5 text-[10px] text-muted-foreground">
              Place details from Google
            </p>
          </>
        )}
      </div>
    </div>
  )
}
