import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Z } from '@/lib/z-layers'
import { dismissHints } from '@/lib/hint-bus'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Minimal modal dialog (no external dependency). Renders an overlay + centered
 * panel when `open`; closes on Escape and backdrop click. Locks body scroll
 * while open.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    // The trigger that opened us still counts as hovered, so its tooltip would
    // stay pinned above the overlay — close any open hint.
    dismissHints()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div
      className={cn('fixed inset-0 flex items-center justify-center p-4', Z.modal)}
      role="dialog"
      aria-modal="true"
    >
      {/* No `backdrop-filter` here on purpose: a blurred overlay makes the
          compositor re-blur the whole viewport on every frame that the panel
          above it scrolls, which shows up as scroll jank on real data. A
          slightly deeper tint reads the same and costs nothing. */}
      <div
        className="dialog-overlay absolute inset-0 bg-slate-900/60"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>,
    document.body,
  )
}

export function DialogContent({
  className,
  children,
  showClose = true,
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showClose?: boolean
  onClose?: () => void
}) {
  return (
    <div
      className={cn(
        'dialog-pop relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl dark:bg-[#0E1726]',
        className,
      )}
      {...props}
    >
      {showClose && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('font-heading text-lg font-semibold leading-none', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
