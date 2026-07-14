import { useTadaClaims, useTadaMaster } from '../api/use-tada'

const THIS_MONTH = '2026-07'

/**
 * Orchestrates the Expense & TA/DA screen: the master rate-table and claims
 * queries plus the derived KPI figures. The page consumes this and only
 * renders — no data logic lives in the component.
 */
export function useExpenseTada() {
  const master = useTadaMaster()
  const claims = useTadaClaims()

  const claimRows = claims.data ?? []
  const claimsThisMonth = claimRows.filter((c) => c.date.startsWith(THIS_MONTH)).length
  const totalPayable = claimRows.reduce((sum, c) => sum + c.computedTotal, 0)
  const pendingClaims = claimRows.filter((c) => c.status === 'pending').length

  return {
    master,
    claims,
    claimRows,
    claimsThisMonth,
    totalPayable,
    pendingClaims,
  }
}
