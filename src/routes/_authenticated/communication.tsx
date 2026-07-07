import { createFileRoute } from '@tanstack/react-router'
import { CommunicationPage } from '@/features/communication'

export const Route = createFileRoute('/_authenticated/communication')({
  component: CommunicationPage,
})
