import { createFileRoute } from '@tanstack/react-router'
import { GpsTrackingPage } from '@/features/gps-tracking'

export const Route = createFileRoute('/_authenticated/gps')({
  component: GpsTrackingPage,
})
