import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConfigState {
  /**
   * Base URL for building media/asset URLs from the relative paths the API
   * returns (e.g. `office_image_paths`). Fetched once per session from
   * `GET /sales-incharge-admin/config` and read by the `mediaUrl()` helper.
   */
  mediaBaseUrl: string
  setMediaBaseUrl: (url: string) => void
}

/**
 * Global media/config state (client state). The value is server-sourced but
 * mirrored here so the pure `mediaUrl()` helper can build image URLs
 * synchronously anywhere — no hook required. Persisted so URLs resolve on the
 * first paint after a reload, before the config query refetches.
 */
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      mediaBaseUrl: '',
      setMediaBaseUrl: (mediaBaseUrl) => set({ mediaBaseUrl }),
    }),
    { name: 'sales-admin-config' },
  ),
)
