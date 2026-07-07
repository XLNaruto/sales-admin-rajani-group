import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { MessageThread } from '../types'

const THREADS: MessageThread[] = [
  { id: 'th1', subject: 'July primary sales target', participants: ['R. Mehta', 'You'], lastMessage: 'Please confirm the North zone split by EOD.', lastActivity: '10:42 AM', unread: 2, channel: 'internal' },
  { id: 'th2', subject: 'Diwali scheme rollout', participants: ['S. Patel', 'K. Rao', 'You'], lastMessage: 'Distributor slabs attached for review.', lastActivity: 'Yesterday', unread: 0, channel: 'announcement' },
  { id: 'th3', subject: 'Beat re-mapping — Pune', participants: ['A. Singh', 'You'], lastMessage: 'Moved Kothrud stores to beat P-04.', lastActivity: 'Yesterday', unread: 1, channel: 'internal' },
  { id: 'th4', subject: 'Outstanding follow-up', participants: ['Accounts', 'You'], lastMessage: 'Bhagwati Sales cleared ₹40,000.', lastActivity: 'Mon', unread: 0, channel: 'internal' },
  { id: 'th5', subject: 'New order-app version', participants: ['IT Support', 'All'], lastMessage: 'v2.4 is live — force update enabled.', lastActivity: 'Mon', unread: 0, channel: 'announcement' },
  { id: 'th6', subject: 'Q2 incentive payout', participants: ['HR', 'You'], lastMessage: 'Payout sheet shared with finance.', lastActivity: 'Sun', unread: 0, channel: 'internal' },
]

export function useThreads() {
  return useQuery({
    queryKey: queryKeys.communication.threads(),
    queryFn: () => mockDelay(THREADS),
  })
}
