import { useMarketVisits, useMeetings, useVisitForms } from '../api/use-crm'

const TODAY = '2026-07-02'

/**
 * Orchestrates the CRM & Sales screen: the visit-form, meeting and
 * market-visit list queries plus the derived KPI counts. The page consumes
 * this and only renders — no data logic lives in the component.
 */
export function useCrm() {
  const visits = useVisitForms()
  const meetings = useMeetings()
  const marketVisits = useMarketVisits()

  const visitsToday = visits.data?.filter((v) => v.date === TODAY).length ?? 0
  const upcomingMeetings = meetings.data?.filter((m) => m.status === 'scheduled').length ?? 0
  const marketVisitsThisWeek = marketVisits.data?.length ?? 0

  return {
    visits,
    meetings,
    marketVisits,
    visitsToday,
    upcomingMeetings,
    marketVisitsThisWeek,
  }
}
