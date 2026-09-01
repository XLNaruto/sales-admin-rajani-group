/**
 * Forcing the company picker open from a failed tenant-scoped request.
 *
 * Most screens never need this: `requires_selection` on `/me/companies` opens
 * the gate right after login. But a session can lose its selection underneath a
 * screen — the tenant-scoped endpoints then answer `403` with
 * `error: "COMPANY_NOT_SELECTED"`, which is **not** a permission denial. Showing
 * an access-denied page for it would be a dead end: the user holds the
 * permission, they just have no company selected. So the picker opens instead.
 *
 * The flag is client UI state (which is why it is Zustand and not Query) and is
 * deliberately not persisted: it describes this tab, right now.
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import { errorCode, errorStatus } from '@/lib/api-error'

/** The machine code the API answers with when the session has no tenant. */
export const COMPANY_NOT_SELECTED = 'COMPANY_NOT_SELECTED'

interface CompanyPickerState {
  /** True while a screen has asked for the picker regardless of the server flag. */
  forced: boolean
  requirePick: () => void
  clear: () => void
}

/** Single-concern store: whether the company picker is being forced open. */
export const useCompanyPickerStore = create<CompanyPickerState>()((set) => ({
  forced: false,
  requirePick: () => set({ forced: true }),
  clear: () => set({ forced: false }),
}))

/** True when this error is the "no company selected" 403, not a real denial. */
export function isCompanyNotSelected(error: unknown): boolean {
  return errorStatus(error) === 403 && errorCode(error) === COMPANY_NOT_SELECTED
}

/**
 * Watch a query's error and open the company picker when it is the
 * `COMPANY_NOT_SELECTED` 403. Pass every error a tenant-scoped screen can
 * surface; anything else is left alone for the screen to render as it sees fit.
 *
 * @example
 * const fleet = useFleetLocations(params)
 * useOpenCompanyPickerOnError(fleet.error)
 * if (isForbiddenError(fleet.error) && !isCompanyNotSelected(fleet.error))
 *   return <Forbidden />
 */
export function useOpenCompanyPickerOnError(...errors: unknown[]) {
  const requirePick = useCompanyPickerStore((s) => s.requirePick)
  const hit = errors.some(isCompanyNotSelected)

  useEffect(() => {
    if (hit) requirePick()
  }, [hit, requirePick])
}
