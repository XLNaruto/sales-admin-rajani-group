import { useProductivity, useSalesmen } from '../api/use-team'

/**
 * Orchestrates the team-management screen: the salesmen + productivity queries
 * and the derived summary stats. The page consumes this and only renders.
 */
export function useTeamManagement() {
  const { data: salesmen, isLoading } = useSalesmen()
  const { data: productivity } = useProductivity()

  const list = salesmen ?? []
  const totalSalesmen = list.length
  const avgProductivity = totalSalesmen
    ? list.reduce((sum, s) => sum + s.productivity, 0) / totalSalesmen
    : 0
  const visitsToday = list.reduce((sum, s) => sum + s.visitsToday, 0)

  return {
    list,
    productivity: productivity ?? [],
    isLoading,
    totalSalesmen,
    avgProductivity,
    visitsToday,
  }
}
