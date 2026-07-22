import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CompanyState {
  /**
   * The active company (tenant) the admin operates as. The server is the source
   * of truth — the selection is stored against the session by
   * `POST /me/company/select` — but it's mirrored here so the topbar can render
   * the active company synchronously on first paint, before `/me/companies`
   * refetches. `null` until a company resolves.
   */
  selectedCompanyId: number | null
  selectedCompanyName: string | null
  /** Mirror the server's active selection. */
  setSelectedCompany: (id: number | null, name: string | null) => void
  /** Clear on logout so the next admin doesn't inherit a stale tenant. */
  clear: () => void
}

/**
 * Global selected-company state (client state). Server-sourced but mirrored
 * here — same pattern as `config-store` — so the active tenant is available
 * synchronously anywhere without a hook. Persisted so it survives a reload.
 */
export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      selectedCompanyName: null,
      setSelectedCompany: (selectedCompanyId, selectedCompanyName) =>
        set({ selectedCompanyId, selectedCompanyName }),
      clear: () => set({ selectedCompanyId: null, selectedCompanyName: null }),
    }),
    { name: 'sales-admin-company' },
  ),
)
