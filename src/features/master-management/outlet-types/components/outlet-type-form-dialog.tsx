import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/features/beat-creation'
import { useOutletTypeForm } from '../hooks/use-outlet-type-form'
import type { OutletType } from '../types'

interface OutletTypeFormDialogProps {
  open: boolean
  /** The row to edit, or null for create mode. */
  editRow: OutletType | null
  onClose: () => void
}

/** Add/edit outlet-type modal — the master's single field (the type name). */
export function OutletTypeFormDialog({
  open,
  editRow,
  onClose,
}: OutletTypeFormDialogProps) {
  const { form, onSubmit, isEdit, isPending } = useOutletTypeForm({
    editRow,
    onSaved: onClose,
  })
  const {
    register,
    formState: { errors },
  } = form

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Outlet Type' : 'Add Outlet Type'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Rename this outlet type.'
              : 'Add an outlet type the retailer form can classify outlets by.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <Field label="Outlet Type Name" error={errors.name?.message}>
            <Input {...register('name')} placeholder="e.g. Kirana Store" autoFocus />
          </Field>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Update Outlet Type' : 'Save Outlet Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
