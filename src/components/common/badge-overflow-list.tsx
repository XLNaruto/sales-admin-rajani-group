import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
  const hiddenCount = items.length - visible.length

  return (
    <>
      <div className={cn('flex flex-nowrap items-center gap-1', className)}>
        {visible.map((name) => (
          <Badge key={name} variant="outline" className="font-medium">
            {name}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              // Stop the click bubbling to a row handler (e.g. row-open nav).
              e.stopPropagation()
              setOpen(true)
            }}
          >
            <Badge
              variant="secondary"
              className="cursor-pointer font-medium hover:bg-secondary/80"
            >
              +{hiddenCount}
            </Badge>
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {items.length} {itemLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5 py-2">
            {items.map((name) => (
              <Badge key={name} variant="outline" className="font-medium">
                {name}
              </Badge>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
