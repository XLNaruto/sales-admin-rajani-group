import { createFileRoute } from '@tanstack/react-router'
import { BeatsPage } from '@/features/beat-creation'

export const Route = createFileRoute('/_authenticated/beats/')({
  component: BeatsPage,
})
