import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { AppNotification, Greeting } from '../types'

const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', title: 'July Scheme Live', body: 'New July trade scheme is now active for all zones.', type: 'push', sentOn: '2026-07-02T09:00:00', status: 'sent' },
  { id: 'n2', title: 'North Zone Target Alert', body: 'North zone at 62% of monthly target with 8 days left.', type: 'sales-alert', sentOn: '2026-07-02T10:30:00', status: 'sent' },
  { id: 'n3', title: 'Weekend Push Campaign', body: 'Reminder blast to all field staff for weekend drive.', type: 'push', sentOn: '2026-07-03T08:00:00', status: 'scheduled' },
  { id: 'n4', title: 'Happy Birthday, Ramesh!', body: 'Wishing you a wonderful year ahead.', type: 'greeting', category: 'birthday', sentOn: '2026-07-02T07:30:00', status: 'sent' },
  { id: 'n5', title: 'Low Stock Alert — West', body: 'SKU-4821 running low across 12 West-zone outlets.', type: 'sales-alert', sentOn: '2026-07-01T16:15:00', status: 'sent' },
  { id: 'n6', title: 'Festival Greeting Draft', body: 'Guru Purnima greeting awaiting approval.', type: 'greeting', category: 'festival', sentOn: '2026-07-10T09:00:00', status: 'draft' },
  { id: 'n7', title: 'Q2 Incentive Payout', body: 'Q2 incentive statements are now available in the app.', type: 'push', sentOn: '2026-07-05T09:00:00', status: 'scheduled' },
]

const GREETINGS: Greeting[] = [
  { id: 'g1', recipient: 'Ramesh Yadav', category: 'birthday', occasion: 'Birthday', date: '2026-07-02' },
  { id: 'g2', recipient: 'Suresh Patil', category: 'anniversary', occasion: 'Work Anniversary (5 yrs)', date: '2026-07-04' },
  { id: 'g3', recipient: 'All Employees', category: 'festival', occasion: 'Guru Purnima', date: '2026-07-10' },
  { id: 'g4', recipient: 'Anita Deshmukh', category: 'birthday', occasion: 'Birthday', date: '2026-07-12' },
  { id: 'g5', recipient: 'Pooja Nair', category: 'anniversary', occasion: 'Work Anniversary (3 yrs)', date: '2026-07-18' },
  { id: 'g6', recipient: 'All Distributors', category: 'festival', occasion: 'Independence Day', date: '2026-08-15' },
]

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => mockDelay(NOTIFICATIONS),
  })
}

export function useGreetings() {
  return useQuery({
    queryKey: queryKeys.notifications.greetings(),
    queryFn: () => mockDelay(GREETINGS),
  })
}

export interface SendNotificationInput {
  title: string
  body: string
  type: AppNotification['type']
}

export function useSendNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendNotificationInput) =>
      mockDelay<AppNotification>({
        id: `n-${Date.now()}`,
        ...payload,
        sentOn: new Date().toISOString(),
        status: 'sent',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}
