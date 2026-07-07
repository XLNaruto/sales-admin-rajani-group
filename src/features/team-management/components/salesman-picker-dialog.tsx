import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Pick a salesman from a filtered pool — used for both "set root" and "add report". */
export function SalesmanPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  confirmLabel = 'Add',
  loading = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  options: ComboboxOption[]
  confirmLabel?: string
  loading?: boolean
  onConfirm: (salesmanId: string) => void
}) {
  const [value, setValue] = useState('')

  // Reset the selection whenever the dialog reopens.
  useEffect(() => {
    if (open) setValue('')
  }, [open])

  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="mt-4" data-nopan>
          {options.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Every salesman is already in the hierarchy.
            </p>
          ) : (
            <Combobox
              value={value}
              onChange={setValue}
              options={options}
              icon={UserRound}
              placeholder="Select a salesman"
              searchPlaceholder="Search salesmen"
            />
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" className="cursor-pointer" onClick={close}>
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            disabled={!value || loading || options.length === 0}
            onClick={() => onConfirm(value)}
          >
            {loading ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
