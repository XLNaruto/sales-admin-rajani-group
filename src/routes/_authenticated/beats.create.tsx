import { createFileRoute } from '@tanstack/react-router'
import { BeatCreatePage } from '@/features/beat-creation'

export const Route = createFileRoute('/_authenticated/beats/create')({
  component: BeatCreatePage,
})
