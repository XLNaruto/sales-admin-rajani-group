import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dismissHints } from '@/lib/hint-bus'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Side panel (no external dependency) — the edge-anchored sibling of `Dialog`.
 * Renders an overlay + a panel pinned to the right edge when `open`; closes on
 * Escape and backdrop click, and locks body scroll while open.
 *
 * Use this over `Dialog` when the panel holds an ongoing task (a thread, a long
 * form) rather than a single decision: it keeps the screen behind it visible.
 */
export function Sheet({ open, onOpenChange, children }: SheetProps) {
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
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="dialog-overlay absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>,
    document.body,
  )
}

export function SheetContent({
  className,
  children,
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div
      className={cn(
        'sheet-slide relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-2xl dark:bg-[#0E1726]',
        className,
      )}
      {...props}
    >
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
      {children}
    </div>
  )
}

/** Fixed top of the panel — never scrolls. */
export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('shrink-0 border-b border-border/60 px-5 py-4 pr-14', className)}
      {...props}
    />
  )
}

/** The one scrolling region between header and footer. */
export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
}

/** Fixed bottom of the panel — never scrolls. */
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('shrink-0 border-t border-border/60 px-5 py-4', className)} {...props} />
  )
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('font-heading text-base font-semibold leading-tight', className)} {...props} />
  )
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />
}
