/** What the preview card shows about a place. */
export interface PlaceDetails {
  /** Places API v1 resource id (`ChIJ…`). */
  id: string
  name: string
  /** Localised category line, e.g. "Fast Food Restaurant". Null when untyped. */
  category: string | null
  /** 1–5, one decimal. Null when the place has no ratings. */
  rating: number | null
  /** How many ratings the average is over. */
  ratingCount: number
  address: string | null
  /** Null when the place publishes no opening hours — different from "closed". */
  openNow: boolean | null
  phone: string | null
  /** Photo resource name, resolved to an image URL by `placePhotoUrl`. */
  photoName: string | null
  /** Google Maps deep link for the place, used by the Directions button. */
  mapsUri: string | null
}
