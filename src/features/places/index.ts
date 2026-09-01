/**
 * Google Places (API v1) — the nearest-place lookup and the preview card drawn
 * from it.
 *
 * Its own feature rather than a `lib/` helper because it is an external
 * integration with its own client, its own cache policy and its own billing
 * surface: nothing outside this folder builds a Places URL or a field mask.
 */
export { PlacePreviewCard } from './components/place-preview-card'
export { usePlaceAtPoint, usePlaceDetails } from './api/use-places'
export { placePhotoUrl } from './api/places-api'
export type { PlaceDetails } from './types'
