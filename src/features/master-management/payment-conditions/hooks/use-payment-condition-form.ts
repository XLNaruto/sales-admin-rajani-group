import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  useCreatePaymentCondition,
  useUpdatePaymentCondition,
} from '../api/use-payment-conditions'
import {
  paymentConditionDefaults,
  paymentConditionSchema,
  type PaymentConditionFormValues,
} from '../lib/payment-condition-form'
import type { PaymentCondition } from '../types'
import { toastApiError } from '@/lib/api-toast'

interface UsePaymentConditionFormOptions {
  /**
   * The row being edited, or null for create mode. The row itself seeds the
   * form — the list already carries every editable field, so no GET-by-id.
   */
  editRow: PaymentCondition | null
  /** Called after a successful create/update (e.g. to close the modal). */
  onSaved: () => void
}

/**
 * Drives the add/edit payment-condition modal: seeds the form (create
 * defaults, or the row being edited), validates the name, and submits via the
 * create or update mutation.
 */
export function usePaymentConditionForm({
  editRow,
  onSaved,
}: UsePaymentConditionFormOptions) {
  const isEdit = editRow !== null

  const form = useForm<PaymentConditionFormValues>({
    resolver: zodResolver(paymentConditionSchema),
    defaultValues: paymentConditionDefaults,
  })
  const { reset } = form

  // Seed the form: the edited row's values, or the create defaults.
  useEffect(() => {
    reset(editRow ? { name: editRow.name } : paymentConditionDefaults)
  }, [editRow, reset])

  const createPaymentCondition = useCreatePaymentCondition()
  const updatePaymentCondition = useUpdatePaymentCondition()
  const isPending = createPaymentCondition.isPending || updatePaymentCondition.isPending

  const onSubmit = form.handleSubmit((values) => {
    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? 'Payment condition updated' : 'Payment condition created')
        onSaved()
      },
      // A duplicate name comes back as a 409 — surface the API's own message.
      onError: (e: unknown) =>
        toastApiError(e, "Couldn't save the payment condition."),
    }

    if (editRow)
      updatePaymentCondition.mutate({ id: editRow.id, input: values }, handlers)
    else createPaymentCondition.mutate(values, handlers)
  })

  return { form, onSubmit, isEdit, isPending }
}
