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
import { usePaymentConditionForm } from '../hooks/use-payment-condition-form'
import type { PaymentCondition } from '../types'

interface PaymentConditionFormDialogProps {
  open: boolean
  /** The row to edit, or null for create mode. */
  editRow: PaymentCondition | null
  onClose: () => void
}

/** Add/edit payment-condition modal — the master's single field (the name). */
export function PaymentConditionFormDialog({
  open,
  editRow,
  onClose,
}: PaymentConditionFormDialogProps) {
  const { form, onSubmit, isEdit, isPending } = usePaymentConditionForm({
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
          <DialogTitle>
            {isEdit ? 'Edit Payment Condition' : 'Add Payment Condition'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Rename this payment condition.'
              : 'Add a payment condition distributors can be onboarded with.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <Field label="Payment Condition Name" error={errors.name?.message}>
            <Input {...register('name')} placeholder="e.g. Credit 30 Days" autoFocus />
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
              {isEdit ? 'Update Payment Condition' : 'Save Payment Condition'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
