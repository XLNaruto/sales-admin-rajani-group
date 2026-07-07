import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { Meeting, MarketVisit, VisitForm, VisitFormDraft } from '../types'

const VISIT_FORMS: VisitForm[] = [
  { id: 'v1', salesman: 'R. Mehta', retailer: 'Shree Provision Store', date: '2026-07-02', purpose: 'Order Collection', outcome: 'Order placed ₹18,400', status: 'completed' },
  { id: 'v2', salesman: 'S. Patel', retailer: 'Krishna Kirana', date: '2026-07-02', purpose: 'New Launch Pitch', outcome: 'Follow-up needed', status: 'completed' },
  { id: 'v3', salesman: 'K. Rao', retailer: 'Ganesh Supermarket', date: '2026-07-02', purpose: 'Payment Recovery', outcome: 'Cheque collected', status: 'completed' },
  { id: 'v4', salesman: 'A. Singh', retailer: 'Bhagwati Stores', date: '2026-07-03', purpose: 'Merchandising', outcome: '—', status: 'scheduled' },
  { id: 'v5', salesman: 'D. Shah', retailer: 'Om Retail Mart', date: '2026-07-01', purpose: 'Complaint Resolution', outcome: 'Resolved', status: 'completed' },
  { id: 'v6', salesman: 'R. Mehta', retailer: 'Laxmi General Store', date: '2026-07-04', purpose: 'Order Collection', outcome: '—', status: 'pending' },
]

const MEETINGS: Meeting[] = [
  { id: 'm1', title: 'West Zone Sales Review', date: '2026-07-03', attendees: 8, status: 'scheduled' },
  { id: 'm2', title: 'Distributor Onboarding — Pune', date: '2026-07-05', attendees: 4, status: 'scheduled' },
  { id: 'm3', title: 'Q2 Target Alignment', date: '2026-06-28', attendees: 12, status: 'completed' },
  { id: 'm4', title: 'New Product Training', date: '2026-07-08', attendees: 15, status: 'scheduled' },
  { id: 'm5', title: 'Retailer Feedback Sync', date: '2026-06-30', attendees: 6, status: 'cancelled' },
]

const MARKET_VISITS: MarketVisit[] = [
  { id: 'mv1', salesman: 'R. Mehta', market: 'Crawford Market', date: '2026-07-01', outletsCovered: 22, status: 'completed' },
  { id: 'mv2', salesman: 'S. Patel', market: 'Dadar Wholesale', date: '2026-07-02', outletsCovered: 14, status: 'in-progress' },
  { id: 'mv3', salesman: 'K. Rao', market: 'Pune Mandai', date: '2026-07-02', outletsCovered: 18, status: 'in-progress' },
  { id: 'mv4', salesman: 'D. Shah', market: 'Surat Textile Hub', date: '2026-07-04', outletsCovered: 0, status: 'scheduled' },
  { id: 'mv5', salesman: 'A. Singh', market: 'Nashik City Market', date: '2026-06-30', outletsCovered: 9, status: 'completed' },
]

export function useVisitForms() {
  return useQuery({
    queryKey: queryKeys.crm.visitForms(),
    queryFn: () => mockDelay(VISIT_FORMS),
  })
}

export function useMeetings() {
  return useQuery({
    queryKey: queryKeys.crm.meetings(),
    queryFn: () => mockDelay(MEETINGS),
  })
}

export function useMarketVisits() {
  return useQuery({
    queryKey: queryKeys.crm.marketVisits(),
    queryFn: () => mockDelay(MARKET_VISITS),
  })
}

export function useCreateVisitForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: VisitFormDraft) =>
      mockDelay<VisitForm>({
        id: 'v-new',
        date: new Date().toISOString().slice(0, 10),
        outcome: '—',
        status: 'pending',
        ...payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.crm.all }),
  })
}
