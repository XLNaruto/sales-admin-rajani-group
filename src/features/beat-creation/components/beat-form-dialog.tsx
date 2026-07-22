import { Controller } from 'react-hook-form'
import { Loader2, Route, Store } from 'lucide-react'
import type { ComboboxOption } from '@/components/ui/combobox'
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
import { Combobox } from '@/components/ui/combobox'
import { Field } from './form-fields'
import { useBeatForm } from '../hooks/use-beat-form'
import { useDistributorOptions } from '../hooks/use-beat-selects'
import { BEAT_GRADES } from '../lib/beat-reference'

interface BeatFormDialogProps {
  open: boolean
  /** Beat id to edit, or null for create mode. */
  editId: string | null
  onClose: () => void
}

/** Add/edit beat modal — the four core fields (name / grade / city / distributor). */
export function BeatFormDialog({ open, editId, onClose }: BeatFormDialogProps) {
  const { form, onSubmit, isEdit, isPending, isSeeding, isError, distributorName } =
    useBeatForm({ id: editId, onSaved: onClose })
  const {
    register,
    control,
    formState: { errors },
  } = form

  const distributors = useDistributorOptions()

  const distributorId = form.watch('distributorId')

  // Ensure the currently-selected distributor is present so its label shows
  // even before the lazy dropdown has fetched the page it lives on.
  const distributorOptions: ComboboxOption[] =
    distributorId && distributorName && !distributors.options.some((o) => o.value === distributorId)
      ? [{ value: distributorId, label: distributorName }, ...distributors.options]
      : distributors.options

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Beat' : 'Add Beat'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the beat name, grade and distributor.'
              : 'Create a new beat by setting its name, grade and distributor.'}
          </DialogDescription>
        </DialogHeader>

        {isSeeding ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading beat…
          </div>
        ) : isError ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Couldn't load this beat. Please close and try again.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-2 space-y-4">
            <Field label="Beat Name" error={errors.beatName?.message}>
              <Input
                {...register('beatName')}
                placeholder="e.g. Rajkot City Central"
                autoFocus
              />
            </Field>

            <Field label="Beat Grade" error={errors.beatGrade?.message}>
              <Controller
                control={control}
                name="beatGrade"
                render={({ field }) => (
                  <Combobox
                    icon={Route}
                    value={field.value}
                    onChange={field.onChange}
                    options={BEAT_GRADES}
                    placeholder="Select grade"
                    searchPlaceholder="Search grade"
                  />
                )}
              />
            </Field>

            <Field label="Distributor" error={errors.distributorId?.message}>
              <Controller
                control={control}
                name="distributorId"
                render={({ field }) => (
                  <Combobox
                    icon={Store}
                    value={field.value}
                    onChange={field.onChange}
                    options={distributorOptions}
                    placeholder="Select distributor"
                    searchPlaceholder="Search distributors"
                    loading={distributors.loading}
                    onScrollEnd={distributors.onScrollEnd}
                    onSearchChange={distributors.onSearchChange}
                  />
                )}
              />
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
                {isEdit ? 'Update Beat' : 'Save Beat'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
