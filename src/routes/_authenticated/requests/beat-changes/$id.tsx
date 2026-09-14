import { createFileRoute, redirect } from '@tanstack/react-router'
import { encryptParams } from '@/lib/crypto'

/**
 * Legacy/plain deep link: `/requests/beat-changes/<id>?n=<id>`.
 *
 * Kept as a redirect because `public/firebase-messaging-sw.js` builds this URL
 * for a click on a BACKGROUND push — a service worker cannot import the params
 * codec, so it cannot produce the encrypted form itself. Anything that lands
 * here is bounced to the canonical screen, which is where the permission gate
 * and the page live.
 */
export const Route = createFileRoute('/_authenticated/requests/beat-changes/$id')({
  validateSearch: (search: Record<string, unknown>) => {
    const n = Number(search.n)
    return { n: Number.isFinite(n) && n > 0 ? n : undefined }
  },
  beforeLoad: ({ params, search }) => {
    const id = Number(params.id)
    throw redirect({
      to: '/requests/beat-changes/detail',
      search: {
        data: encryptParams({
          ...(Number.isFinite(id) ? { id } : {}),
          ...(search.n ? { n: search.n } : {}),
        }),
      },
      replace: true,
    })
  },
})
