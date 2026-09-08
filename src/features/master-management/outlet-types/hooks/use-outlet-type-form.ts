import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCreateOutletType, useUpdateOutletType } from '../api/use-outlet-types'
import {
  outletTypeDefaults,
  outletTypeSchema,
  type OutletTypeFormValues,
} from '../lib/outlet-type-form'
import type { OutletType } from '../types'
import { toastApiError } from '@/lib/api-toast'

interface UseOutletTypeFormOptions {
  /**
   * The row being edited, or null for create mode. The row itself seeds the
   * form — the master has no GET-by-id endpoint, and the list already carries
   * every editable field.
   */
  editRow: OutletType | null
  /** Called after a successful create/update (e.g. to close the modal). */
  onSaved: () => void
}

/**
 * Drives the add/edit outlet-type modal: seeds the form (create defaults, or
 * the row being edited), validates the name, and submits via the create or
 * update mutation.
 */
export function useOutletTypeForm({ editRow, onSaved }: UseOutletTypeFormOptions) {
  const isEdit = editRow !== null

  const form = useForm<OutletTypeFormValues>({
    resolver: zodResolver(outletTypeSchema),
    defaultValues: outletTypeDefaults,
  })
  const { reset } = form

  // Seed the form: the edited row's values, or the create defaults.
  useEffect(() => {
    reset(editRow ? { name: editRow.name } : outletTypeDefaults)
  }, [editRow, reset])

  const createOutletType = useCreateOutletType()
  const updateOutletType = useUpdateOutletType()
  const isPending = createOutletType.isPending || updateOutletType.isPending

  const onSubmit = form.handleSubmit((values) => {
    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? 'Outlet type updated' : 'Outlet type created')
        onSaved()
      },
      onError: (e: unknown) =>
        toastApiError(e, "Couldn't save the outlet type."),
    }

    if (editRow) updateOutletType.mutate({ id: editRow.id, input: values }, handlers)
    else createOutletType.mutate(values, handlers)
  })

  return { form, onSubmit, isEdit, isPending }
}
