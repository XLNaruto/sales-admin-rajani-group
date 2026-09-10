import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/common/hint'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface BadgeOverflowListProps {
  /** The full set of labels to render as badges. */
  items: string[]
  /** How many badges to show inline before collapsing the rest into `+N`. */
  max?: number
  /** Title shown on the "see all" modal. */
  title?: string
  /** What each badge represents, for the modal's helper line (e.g. "divisions"). */
  itemLabel?: string
  className?: string
}

/**
 * Renders up to `max` badges inline; any remainder collapse into a `+N` badge
 * that opens a modal listing the complete set. Keeps dense table cells tidy
 * while still exposing every value on demand.
 *
 * Badges stay on a single line and truncate rather than wrapping, so every row
 * in a table keeps the same height however long the labels are; the full text
 * is always reachable through the hint or the modal.
 */
export function BadgeOverflowList({
  items,
  max = 3,
  title = 'All items',
  itemLabel = 'items',
  className,
}: BadgeOverflowListProps) {
  const [open, setOpen] = useState(false)

  const visible = items.slice(0, max)
  const hidden = items.slice(visible.length)

  return (
    <>
      <div className={cn('flex min-w-0 flex-nowrap items-center gap-1', className)}>
        {visible.map((name) => (
          <Hint key={name} label={name}>
            <Badge
              variant="outline"
              className="min-w-0 max-w-full cursor-default whitespace-nowrap"
            >
              <span className="truncate">{name}</span>
            </Badge>
          </Hint>
        ))}
        {hidden.length > 0 && (
          <Hint label={hidden.join(', ')}>
            <button
              type="button"
              className="shrink-0"
              onClick={(e) => {
                // Stop the click bubbling to a row handler (e.g. row-open nav).
                e.stopPropagation()
                setOpen(true)
              }}
            >
              <Badge
                variant="secondary"
                className="cursor-pointer whitespace-nowrap tabular-nums hover:bg-secondary/80"
              >
                +{hidden.length}
              </Badge>
            </button>
          </Hint>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClose={() => setOpen(false)}>
          {/* Leave room for the close button so long titles don't run under it. */}
          <DialogHeader className="pr-8">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {items.length} {itemLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5 py-2">
            {items.map((name) => (
              <Badge key={name} variant="outline" className="whitespace-nowrap">
                {name}
              </Badge>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
