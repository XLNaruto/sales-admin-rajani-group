import { mockDelay } from '@/lib/utils'
import type { WhatsAppMessage } from '../types'

/**
 * Single wrapper around the WhatsApp Business SDK. Components and hooks never
 * talk to the SDK directly — they go through this service so the integration
 * can be swapped without touching the UI layer.
 */
class WhatsAppService {
  async sendMessage(to: string, body: string): Promise<WhatsAppMessage> {
    // In production this would call the WhatsApp Cloud API client.
    return mockDelay<WhatsAppMessage>({
      id: `wa-${Date.now()}`,
      to,
      recipient: to,
      body,
      sentAt: new Date().toISOString(),
      status: 'sent',
    })
  }
}

export const whatsAppService = new WhatsAppService()
