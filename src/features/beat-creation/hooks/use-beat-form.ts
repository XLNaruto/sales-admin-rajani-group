import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useBeat, useCreateBeat, useUpdateBeat } from '../api/use-beats'
import { beatDefaults, beatSchema, type BeatFormValues } from '../lib/beat-form'

interface UseBeatFormOptions {
  /** The beat id to edit, or null/undefined for create mode. */
  id?: string | null
  /** Called after a successful create/update (e.g. to close the modal). */
  onSaved: () => void
}

/**
 * Drives the add/edit beat modal: seeds the form (create defaults, or the
 * loaded record in edit mode), validates the four fields, and submits via the
 * create or update mutation.
 */
export function useBeatForm({ id, onSaved }: UseBeatFormOptions) {
  const isEdit = !!id
  const { data, isLoading, isError } = useBeat(id || undefined)

  const form = useForm<BeatFormValues>({
    resolver: zodResolver(beatSchema),
    defaultValues: beatDefaults,
  })
  const { reset } = form

  // Seed the form: reset to defaults for create, or to the loaded record on edit.
  useEffect(() => {
    if (isEdit) {
      if (data) reset(data.values)
    } else {
      reset(beatDefaults)
    }
  }, [isEdit, data, reset])

  const createBeat = useCreateBeat()
  const updateBeat = useUpdateBeat()
  const isPending = createBeat.isPending || updateBeat.isPending

  const onSubmit = form.handleSubmit((values) => {
    // Status isn't in the four-field form: keep the record's status on edit,
    // default to active on create.
    const status = isEdit ? (data?.status ?? 'active') : 'active'
    const input = { ...values, status }

    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? 'Beat updated' : 'Beat created')
        onSaved()
      },
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Couldn't save the beat."),
    }

    if (isEdit && id) updateBeat.mutate({ id, input }, handlers)
    else createBeat.mutate(input, handlers)
  })

  return {
    form,
    onSubmit,
    isEdit,
    isPending,
    // Label for the currently-selected distributor (edit mode), so its lazy
    // dropdown can show the selection before its page is loaded.
    distributorName: data?.distributorName ?? null,
    // Edit-mode load state (create mode is always ready).
    isSeeding: isEdit && isLoading,
    isError: isEdit && isError,
  }
}
