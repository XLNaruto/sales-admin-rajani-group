import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Route } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Field } from '@/features/beat-creation'
import { errorStatus, getApiErrorMessage } from '@/lib/api-error'
import { toastMutationError } from '@/lib/api-toast'
import { useSetRetailerBeat } from '../api/use-retailers'
import { useBeatOptions } from '../hooks/use-retailer-selects'
import type { Retailer } from '../types'

/** No selection yet — the seed value for an outlet that has no beat. */
const NONE = ''

interface RetailerBeatDialogProps {
  /** Retailer to allocate, or null when the modal is closed. */
  retailer: Retailer | null
  onClose: () => void
}

/**
 * Beat-allocation modal — picks exactly one beat for an outlet and PATCHes
 * …/retailers/{id}/beat. The current beat is pre-selected, and a beat is
 * required: the endpoint accepts `beat_id: null` to unassign, but this screen
 * only ever allocates. Since an outlet's distributors follow from its beat,
 * this is also what moves the outlet between firms.
 */
export function RetailerBeatDialog({ retailer, onClose }: RetailerBeatDialogProps) {
  const open = retailer !== null
  const [beatId, setBeatId] = useState<string>(NONE)
  const beats = useBeatOptions(open)
  const setBeat = useSetRetailerBeat()

  // Seed (and re-seed) the selection from the row each time the modal opens.
  useEffect(() => {
    if (retailer) setBeatId(retailer.beatId || NONE)
  }, [retailer])

  // Remember every label seen so far — the row's own beat plus whatever the lazy
  // dropdown has fetched — so the selected beat keeps its name once server-side
  // search or paging drops that option from the current page.
  const labels = useRef(new Map<string, string>())
  if (retailer?.beatId && retailer.beatName)
    labels.current.set(retailer.beatId, retailer.beatName)
  for (const o of beats.options) labels.current.set(o.value, o.label)

  // A selected-but-not-currently-listed beat is prepended so the trigger keeps
  // showing its name instead of falling back to the placeholder.
  const options = useMemo<ComboboxOption[]>(() => {
    const missing: ComboboxOption[] =
      beatId && !beats.options.some((o) => o.value === beatId)
        ? [{ value: beatId, label: labels.current.get(beatId) ?? beatId }]
        : []
    return [...missing, ...beats.options]
  }, [beatId, beats.options])

  const current = retailer?.beatId || NONE
  // A beat is required, so saving needs a pick that differs from the current one.
  const canSave = beatId !== NONE && beatId !== current

  const save = () => {
    if (!retailer || !canSave) return
    setBeat.mutate(
      { id: retailer.id, beatId },
      {
        onSuccess: () => {
          toast.success(
            `${retailer.shopName} allocated to ${labels.current.get(beatId) ?? 'the beat'}`,
          )
          onClose()
        },
        onError: (error) => {
          // A 404 means the outlet or the beat has gone away since it was
          // listed. A 409 is surfaced by `toastMutationError` the same way.
          if (errorStatus(error) === 404) {
            toast.error("Couldn't allocate the beat", {
              description: getApiErrorMessage(error),
            })
            return
          }
          toastMutationError(error, "Couldn't allocate the beat.")
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Beat Allocate</DialogTitle>
          <DialogDescription>
            {retailer ? (
              <>
                Allocate{' '}
                <span className="font-medium text-foreground">{retailer.shopName}</span> to
                a beat. Its distributors follow from the beat you pick.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <Field
            label="Beat"
            hint={
              retailer?.beatName
                ? `Currently allocated to ${retailer.beatName}.`
                : 'Not allocated to any beat yet.'
            }
          >
            <Combobox
              icon={Route}
              value={beatId}
              onChange={setBeatId}
              options={options}
              placeholder="Select beat"
              searchPlaceholder="Search beats"
              loading={beats.loading}
              onScrollEnd={beats.onScrollEnd}
              onSearchChange={beats.onSearchChange}
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={onClose}
              disabled={setBeat.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={save}
              disabled={setBeat.isPending || !canSave}
            >
              {setBeat.isPending ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
