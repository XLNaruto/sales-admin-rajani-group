import type { ReactNode } from 'react'
import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  /** Controlled open state. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when the user confirms. Close is handled automatically. */
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `destructive` paints the confirm button + icon red (e.g. delete / sign out). */
  variant?: 'default' | 'destructive'
  /** Icon shown in the accent circle. Defaults to a warning triangle. */
  icon?: LucideIcon
  /** Disables the confirm button (e.g. while an async action is pending). */
  loading?: boolean
}

/**
 * Reusable Yes/No confirmation dialog for the whole project.
 *
 * @example
 * const [open, setOpen] = useState(false)
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   variant="destructive"
 *   title="Sign out?"
 *   description="You'll need to log in again to access your dashboard."
 *   confirmLabel="Sign out"
 *   onConfirm={handleSignOut}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  variant = 'default',
  icon: Icon = AlertTriangle,
  loading = false,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive'

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-6">
        <DialogHeader className="items-center text-center">
          <span
            className={cn(
              'mb-4 flex size-14 items-center justify-center rounded-full',
              isDestructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-6" />
          </span>
          <DialogTitle className="text-center">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-center leading-relaxed">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="mt-6 grid grid-cols-2 gap-3 sm:justify-stretch">
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            className="w-full cursor-pointer"
            onClick={handleConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
