import { useBeats, useRouteMappings } from '../api/use-beats'
import { useTourPlans } from '../api/use-tours'

/**
 * Orchestrates the beat & tour planning screen: the beat/tour/route list
 * queries and the KPI totals derived from them. The page consumes this and
 * only renders — no data logic lives in the component.
 */
export function useBeatTour() {
  const beats = useBeats()
  const tours = useTourPlans('month')
  const routes = useRouteMappings()

  const totalBeats = beats.data?.length ?? 0
  const plannedTours = tours.data?.filter((t) => t.status !== 'completed').length ?? 0
  const partiesMapped = beats.data?.reduce((sum, b) => sum + b.parties, 0) ?? 0

  return {
    beats,
    tours,
    routes,
    totalBeats,
    plannedTours,
    partiesMapped,
  }
}
