import { createFileRoute } from '@tanstack/react-router'
import { BeatTourPage } from '@/features/beat-tour'

export const Route = createFileRoute('/_authenticated/beat-tour')({
  component: BeatTourPage,
})
