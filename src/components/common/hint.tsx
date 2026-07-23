import type { ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
 * @example
 * <Hint label="View details">
 *   <button type="button" onClick={...}><Eye className="size-4" /></button>
 * </Hint>
 */
export function Hint({ label, children, side = 'top', align = 'center' }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
