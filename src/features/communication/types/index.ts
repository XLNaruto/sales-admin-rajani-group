export interface MessageThread {
  id: string
  subject: string
  participants: string[]
  lastMessage: string
  lastActivity: string
  unread: number
  channel: 'internal' | 'announcement'
}

export type WhatsAppStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppMessage {
  id: string
  to: string
  recipient: string
  body: string
  sentAt: string
  status: WhatsAppStatus
}
