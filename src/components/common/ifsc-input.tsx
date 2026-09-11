import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * IFSC codes are always upper-case. The keystroke is normalised on the DOM node
 * *before* react-hook-form reads it, so the stored/submitted value matches what
 * the field shows — a `uppercase` class alone only changes the rendering and
 * would still save (and fail validation on) the lower-case text.
 */
export const IfscInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, onChange, ...props }, ref) => (
  <Input
    ref={ref}
    autoCapitalize="characters"
    autoComplete="off"
    spellCheck={false}
    maxLength={11}
    placeholder="e.g. HDFC0001234"
    className={cn('uppercase', className)}
    {...props}
    onChange={(event) => {
      event.target.value = event.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 11)
      onChange?.(event)
    }}
  />
))
IfscInput.displayName = 'IfscInput'
