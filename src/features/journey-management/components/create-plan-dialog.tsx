import { useEffect, useState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSalesInchargeSelect } from '@/features/sales-incharge'

/**
 * Journey Management → Journey Plans → "Create plan".
 *
 * Opens **one empty draft** for one sales incharge and one month. That is the
 * whole action, and it is deliberately small.
 *
 * ── Why there is no "generate month" any more ──────────────────────────────
 * The previous version ran a whole team at once: the admin supplied activity
 * buckets and a seeded solver split each man's remaining days across the cities
 * his beats reached, weighting by neglect. That went with the city model it
 * served. Field time is allocated per DISTRIBUTOR now, and a distributor is a
 * commercial relationship — who he sells for, and how hard — not something a
 * neglect heuristic can propose. So the admin picks, one man at a time, on the
 * plan screen.
 *
 * What lands here is a bare draft the sales incharge cannot see: no buckets, no
 * dates. The allocation goes on next, and publishing is a separate deliberate
 * step after that.
 *
 * A sales incharge who already has a plan for the period is refused with a 409
 * naming the existing one — so this is idempotent by refusal rather than by
 * silence, and a double-click cannot quietly hand back someone else's month.
 */
export function CreatePlanDialog({
  open,
  onOpenChange,
  monthLabel,
  isPending = false,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The period being opened, as "August 2026", for the copy. */
  monthLabel: string
  /** A create is in flight; the dialog stays open and the confirm button spins. */
  isPending?: boolean
  /** Called with the chosen sales incharge id. */
  onCreate: (inchargeId: string) => void
}) {
  const incharge = useSalesInchargeSelect()
  const [inchargeId, setInchargeId] = useState('')

  // Reopening starts clean: the last person created is never the next one, and a
  // pre-filled name is exactly the kind of default that gets confirmed by reflex.
  useEffect(() => {
    if (open) setInchargeId('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-6">
        <DialogHeader>
          <span className="mb-3 grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarPlus className="size-5" />
          </span>
          <DialogTitle>Create a plan for {monthLabel}</DialogTitle>
          <DialogDescription>
            Opens an empty draft for one sales incharge. He cannot see a draft at
            all — allocate his activity and distributor days on the plan screen,
            then publish it to hand the month over.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <label
            htmlFor="create-plan-incharge"
            className="text-xs font-medium text-foreground"
          >
            Sales incharge
          </label>
          <div className="mt-1.5">
            <Combobox
              value={inchargeId}
              onChange={setInchargeId}
              options={incharge.options}
              loading={incharge.loading}
              onScrollEnd={incharge.onScrollEnd}
              onSearchChange={incharge.onSearchChange}
              searchable
              withAvatars
              placeholder="Select sales incharge"
              searchPlaceholder="Search sales incharge…"
              disabled={isPending}
              className="w-full"
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            If he already has a plan for {monthLabel}, this is refused rather than
            replacing it — open the existing one from the list instead.
          </p>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={isPending || !inchargeId}
            onClick={() => onCreate(inchargeId)}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Create
            draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
