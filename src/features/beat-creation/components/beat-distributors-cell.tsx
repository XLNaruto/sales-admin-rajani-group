import { useState } from 'react'
import { Store } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { BeatDistributor } from '../types'

/** How many distributors are listed inline before the rest collapse into +n. */
const INLINE_LIMIT = 2

/**
 * The list cell for a beat's distributors: the first couple inline, with the
 * remainder behind a `+n` chip that opens a modal listing all of them — so a
 * beat mapped to many distributors doesn't stretch the row.
 */
export function BeatDistributorsCell({
  beatName,
  distributors,
}: {
  beatName: string
  distributors: BeatDistributor[]
}) {
  const [open, setOpen] = useState(false)

  if (distributors.length === 0) {
    return <span className="text-sm text-muted-foreground">N/A</span>
  }

  const shown = distributors.slice(0, INLINE_LIMIT)
  const hidden = distributors.length - shown.length

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {shown.map((d) => (
          <span
            key={d.id}
            className="inline-flex max-w-40 items-center gap-1.5 text-sm whitespace-nowrap"
          >
            <Store className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{d.name}</span>
          </span>
        ))}
        {hidden > 0 && (
          <button type="button" onClick={() => setOpen(true)} className="cursor-pointer">
            <Badge variant="outline" className="font-medium transition-colors hover:bg-accent">
              +{hidden}
            </Badge>
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showClose
          onClose={() => setOpen(false)}
          // Cap the panel to the viewport and let only the list scroll, so the
          // header stays put however many distributors a beat has.
          className="flex max-h-[85vh] flex-col overflow-hidden"
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Distributors</DialogTitle>
            <DialogDescription className="wrap-break-word">
              {distributors.length} distributors mapped to{' '}
              <span className="font-medium text-foreground">{beatName}</span>.
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
            {distributors.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Store className="size-4" />
                </span>
                <span className="truncate font-medium text-foreground">{d.name}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
