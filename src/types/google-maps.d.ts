/// <reference types="google.maps" />

// The build's tsconfig pins `types` to vite/client, so pull in the Google Maps
// globals explicitly and expose `window.google` for the loader hook.
declare global {
  interface Window {
    google: typeof google
  }
}

export {}
