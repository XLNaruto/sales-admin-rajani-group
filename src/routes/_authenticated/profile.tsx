import { createFileRoute } from '@tanstack/react-router'
import { MyProfilePage } from '@/features/profile'

export const Route = createFileRoute('/_authenticated/profile')({
  component: MyProfilePage,
})
