import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'
import { Z } from '@/lib/z-layers'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, collisionPadding = 8, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      // Never flush against an edge — of the viewport, or of a scroll container
      // it is flipped inside. A hint that touches the border it explains reads as
      // part of the furniture rather than as a layer above it.
      collisionPadding={collisionPadding}
      className={cn(
        Z.tooltip,
        // A sentence-long hint has to WRAP. Without a ceiling it grows into one
        // line the width of the screen, ending flush against the far edge with
        // its last words clipped — which is what a long explanation looked like.
        'max-w-[min(20rem,calc(100vw-2rem))] text-pretty',
        'overflow-hidden rounded-lg border border-border/70 bg-popover/95 px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-lg backdrop-blur-md',
        'origin-[--radix-tooltip-content-transform-origin]',
        'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="-mt-px fill-popover" width={11} height={5} />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
