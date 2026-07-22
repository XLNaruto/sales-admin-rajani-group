/**
 * Reverse-geocode a coordinate to a human-readable address using the Google
 * Maps Geocoding API. Resolves to the formatted address, or '' when the API is
 * unavailable / returns no result. A single shared Geocoder instance is reused
 * across callers (created lazily once the SDK is loaded).
 */
let geocoder: google.maps.Geocoder | null = null

export function reverseGeocode(p: google.maps.LatLngLiteral): Promise<string> {
  if (!window.google?.maps) return Promise.resolve('')
  if (!geocoder) geocoder = new google.maps.Geocoder()
  return new Promise((resolve) => {
    geocoder!.geocode({ location: p }, (results, status) => {
      resolve(status === 'OK' && results?.[0] ? results[0].formatted_address : '')
    })
  })
}
