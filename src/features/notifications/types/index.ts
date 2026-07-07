export type NotificationType = 'push' | 'sales-alert' | 'greeting'

export type GreetingCategory = 'birthday' | 'anniversary' | 'festival'

export type NotificationStatus = 'sent' | 'scheduled' | 'draft'

export interface AppNotification {
  id: string
  title: string
  body: string
  type: NotificationType
  category?: GreetingCategory
  sentOn: string
  status: NotificationStatus
}

export interface Greeting {
  id: string
  recipient: string
  category: GreetingCategory
  occasion: string
  date: string
}
