/**
 * Google Places API (New, v1) — the one place this app talks to Google's REST
 * surface.
 *
 * Deliberately NOT routed through `lib/http`: that client carries our own API's
 * base URL and the user's bearer token, and neither belongs on a request to
 * Google. This module owns its own axios instance, its own key header, and the
 * field masks — nothing else in the app constructs a Places URL.
 *
 * **Field masks are mandatory** on v1 and they are what you are billed on, so
 * each call asks for the narrowest set that renders its UI:
 *  - the coordinate → place lookup asks for `places.id` alone (the cheapest
 *    SKU), because the details call is cached per id and does the rest;
 *  - the details call asks for exactly the fields the preview card draws.
 */
import axios from 'axios'
import { env } from '@/config/env'
import type { PlaceDetails } from '../types'

const places = axios.create({
  baseURL: 'https://places.googleapis.com/v1',
  headers: { 'X-Goog-Api-Key': env.VITE_GOOGLE_MAPS_KEY },
})

/** Everything the preview card draws, and nothing else. */
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'primaryTypeDisplayName',
  'formattedAddress',
  'rating',
  'userRatingCount',
  'currentOpeningHours.openNow',
  'nationalPhoneNumber',
  'photos',
  'googleMapsUri',
].join(',')

interface PlaceResource {
  id?: string
  displayName?: { text?: string }
  primaryTypeDisplayName?: { text?: string }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  currentOpeningHours?: { openNow?: boolean }
  nationalPhoneNumber?: string
  photos?: { name?: string }[]
  googleMapsUri?: string
}

function toDetails(raw: PlaceResource, fallbackId: string): PlaceDetails {
  return {
    id: raw.id ?? fallbackId,
    name: raw.displayName?.text ?? 'Unnamed place',
    category: raw.primaryTypeDisplayName?.text ?? null,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    ratingCount: raw.userRatingCount ?? 0,
    address: raw.formattedAddress ?? null,
    // Absent hours and "closed right now" are different facts, so an absent
    // `openNow` stays null rather than collapsing to false.
    openNow: raw.currentOpeningHours?.openNow ?? null,
    phone: raw.nationalPhoneNumber ?? null,
    photoName: raw.photos?.[0]?.name ?? null,
    mapsUri: raw.googleMapsUri ?? null,
  }
}

/**
 * GET /places/{placeId} — one place in full.
 *
 * Every failure resolves to `null` rather than throwing: this is decoration
 * over a GPS fix, and a place lookup that fails (quota, a `ZERO_RESULTS`, an
 * offline moment) must never take a map popup down with it.
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const { data } = await places.get<PlaceResource>(
      `/places/${encodeURIComponent(placeId)}`,
      { headers: { 'X-Goog-FieldMask': DETAILS_FIELD_MASK } },
    )
    return toDetails(data, placeId)
  } catch {
    return null
  }
}

/**
 * POST /places:searchNearby — the id of the place closest to a coordinate.
 *
 * A GPS fix carries no place id, so this is the bridge to the details call. It
 * is ranked by distance and capped at one result, over a tight radius: the point
 * is "which shop is this rep standing at", not "what is in this neighbourhood".
 * A coordinate on a road between shops legitimately resolves to nothing.
 */
export async function findPlaceIdNear(
  point: { lat: number; lng: number },
  radiusMetres = 60,
): Promise<string | null> {
  try {
    const { data } = await places.post<{ places?: { id?: string }[] }>(
      '/places:searchNearby',
      {
        maxResultCount: 1,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: point.lat, longitude: point.lng },
            radius: radiusMetres,
          },
        },
      },
      { headers: { 'X-Goog-FieldMask': 'places.id' } },
    )
    return data.places?.[0]?.id ?? null
  } catch {
    return null
  }
}

/**
 * An image URL for a photo resource name.
 *
 * The media endpoint answers with the image itself (it redirects to the bytes),
 * so the URL goes straight into an `<img src>`; `maxHeightPx` keeps a preview
 * strip from pulling a full-resolution photo.
 */
export function placePhotoUrl(photoName: string, maxHeightPx = 220): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeightPx}&key=${env.VITE_GOOGLE_MAPS_KEY}`
}
