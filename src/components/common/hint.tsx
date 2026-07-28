import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { onDismissHints } from '@/lib/hint-bus'

type HintProps = {
  /** Text shown in the tooltip. */
  label: ReactNode
  /** The trigger element (usually an icon button). */
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

/**
 * Wraps any trigger element (typically an icon-only button) with the styled
 * `Tooltip`. Use this instead of the native `title` attribute so hints match
 * the design system everywhere.
 *
 * The tooltip is controlled so it can be force-closed when the trigger is
 * activated or when an overlay opens — a trigger that opens a dialog keeps the
 * pointer "inside" it, which would otherwise leave the hint floating on top of
 * the modal.
 *
 * @example
 * <Hint label="View details">
 *   <button type="button" onClick={...}><Eye className="size-4" /></button>
 * </Hint>
 */
export function Hint({ label, children, side = 'top', align = 'center' }: HintProps) {
  const [open, setOpen] = useState(false)
  /** Blocks re-opening until the pointer/focus actually leaves the trigger. */
  const blocked = useRef(false)

  const close = useCallback(() => {
    blocked.current = true
    setOpen(false)
  }, [])

  const release = useCallback(() => {
    blocked.current = false
  }, [])

  useEffect(() => onDismissHints(close), [close])

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        if (next && blocked.current) return
        setOpen(next)
      }}
    >
      <TooltipTrigger
        asChild
        onPointerDown={close}
        onClick={close}
        onPointerLeave={release}
        onBlur={release}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
