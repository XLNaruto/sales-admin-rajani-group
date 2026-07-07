import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface UiState {
  /** Desktop rail collapse (persisted). */
  sidebarCollapsed: boolean
  /** Mobile/tablet drawer open (ephemeral, not persisted). */
  sidebarMobileOpen: boolean
  theme: Theme
  toggleSidebar: () => void
  setSidebar: (collapsed: boolean) => void
  setMobileSidebar: (open: boolean) => void
  toggleMobileSidebar: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/** Global UI chrome state (sidebar + theme). Single-concern, select narrowly. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileSidebar: (open) => set({ sidebarMobileOpen: open }),
      toggleMobileSidebar: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'sales-admin-ui',
      // Don't persist the transient mobile drawer state.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, theme: s.theme }),
    },
  ),
)
