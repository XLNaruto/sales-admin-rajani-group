import { useEffect, useState } from 'react'
import { env } from '@/config/env'

/**
 * Loads the Google Maps JavaScript API once and reports readiness. The SDK is
 * injected via a single shared <script> tag (deduped across callers), so every
 * component that needs a map just consumes this hook rather than touching the
 * loader itself. The API key comes from `VITE_GOOGLE_MAPS_KEY`.
 */

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const SCRIPT_ID = 'google-maps-js'
// Shared promise so concurrent callers await the same single load.
let loadPromise: Promise<void> | null = null

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.maps) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')))
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.defer = true
    // `v=weekly` guarantees the newer PlaceAutocompleteElement (Places API New).
    script.src = `https://maps.googleapis.com/maps/api/js?key=${env.VITE_GOOGLE_MAPS_KEY}&libraries=places&v=weekly`
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null // allow a retry on a later mount
      reject(new Error('Failed to load Google Maps'))
    }
    document.head.appendChild(script)
  })
  return loadPromise
}

export function useGoogleMaps(): { status: LoadState; ready: boolean } {
  const [status, setStatus] = useState<LoadState>(() =>
    window.google?.maps ? 'ready' : 'idle',
  )

  useEffect(() => {
    if (window.google?.maps) {
      setStatus('ready')
      return
    }
    let active = true
    setStatus('loading')
    loadGoogleMaps()
      .then(() => active && setStatus('ready'))
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [])

  return { status, ready: status === 'ready' }
}
