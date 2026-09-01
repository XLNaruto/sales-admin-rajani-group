import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Location Tracking — the GPS ledger screens.
 *
 * No guard here even though both children carry the same key: keeping the
 * `beforeLoad` on each child matches the rest of the panel, and means a screen
 * added later can be gated on its own terms.
 */
export const Route = createFileRoute('/_authenticated/tracking')({
  component: Outlet,
})
