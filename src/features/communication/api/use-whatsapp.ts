import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { WhatsAppMessage } from '../types'
import { whatsAppService } from './whatsapp-service'

const WHATSAPP_LOG: WhatsAppMessage[] = [
  { id: 'wa1', to: '+919820011223', recipient: 'Shree Traders', body: 'Your July scheme is now active. Reply YES to opt in.', sentAt: '2026-07-01T09:15:00', status: 'read' },
  { id: 'wa2', to: '+919820044556', recipient: 'Maruti Distributors', body: 'Order #4821 dispatched, ETA tomorrow.', sentAt: '2026-07-01T11:02:00', status: 'delivered' },
  { id: 'wa3', to: '+919820077889', recipient: 'Ganesh Agency', body: 'Reminder: outstanding ₹18,000 due on 05-Jul.', sentAt: '2026-06-30T16:40:00', status: 'sent' },
  { id: 'wa4', to: '+919820099001', recipient: 'Om Enterprises', body: 'New SKU list attached for July.', sentAt: '2026-06-30T10:20:00', status: 'read' },
  { id: 'wa5', to: '+919820022334', recipient: 'Krishna Traders', body: 'KYC pending — please share GST certificate.', sentAt: '2026-06-29T14:05:00', status: 'failed' },
]

export function useWhatsAppLog() {
  return useQuery({
    queryKey: queryKeys.communication.whatsappLog(),
    queryFn: () => mockDelay(WHATSAPP_LOG),
  })
}

export function useSendWhatsAppMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { to: string; body: string }) =>
      whatsAppService.sendMessage(payload.to, payload.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.communication.all }),
  })
}
