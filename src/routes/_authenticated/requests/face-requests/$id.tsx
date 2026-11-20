import { createFileRoute, redirect } from '@tanstack/react-router'
import { encryptParams } from '@/lib/crypto'

/**
 * Plain deep link: `/requests/face-requests/<id>?n=<id>`.
 *
 * `public/firebase-messaging-sw.js` builds this URL for a click on a
 * BACKGROUND push — a service worker can't import the params codec — so it is
 * bounced here to the canonical, encrypted detail screen.
 */
export const Route = createFileRoute('/_authenticated/requests/face-requests/$id')({
  validateSearch: (search: Record<string, unknown>) => {
    const n = Number(search.n)
    return { n: Number.isFinite(n) && n > 0 ? n : undefined }
  },
  beforeLoad: ({ params, search }) => {
    const id = Number(params.id)
    throw redirect({
      to: '/requests/face-requests/detail',
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
