import { useState } from 'react'
import { useRetailers, useRetailerAnalytics } from '../api/use-retailers'
import { useImportRetailers } from '../api/use-import-retailers'

/**
 * Orchestrates the retailer-management screen: the retailer list + analytics
 * queries, the Field Assist import mutation, derived KPI figures and the
 * import-result message. The page consumes this and only renders.
 */
export function useRetailerManagement() {
  const { data, isLoading } = useRetailers()
  const analytics = useRetailerAnalytics()
  const importRetailers = useImportRetailers()
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const retailers = data ?? []
  const total = retailers.length
  const active = retailers.filter((r) => r.status === 'active').length
  const avgMonthlySales = total
    ? Math.round(retailers.reduce((sum, r) => sum + r.monthlySales, 0) / total)
    : 0

  const handleImport = () => {
    importRetailers.mutate(undefined, {
      onSuccess: (result) =>
        setImportMessage(
          `Imported ${result.imported} retailer(s), skipped ${result.skipped} invalid row(s).`,
        ),
    })
  }

  return {
    retailers,
    isLoading,
    analytics,
    isImporting: importRetailers.isPending,
    importMessage,
    total,
    active,
    avgMonthlySales,
    handleImport,
  }
}
